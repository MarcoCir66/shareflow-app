# Backend Security & Robustness Hardening — Design Spec

## Goal

Harden the provisioning API (`server/`) for internal/VPN-only deployment: authenticate callers using their existing Microsoft Entra ID login, validate request payloads, persist job state durably across restarts, add light rate-limiting and structured logging, and remove a known code-quality issue (triplicated site-name-unwrap logic). This is sub-project 1 of 3 in Phase 4 ("Completamento/hardening dell'esistente"), to be followed by Unit Test coverage and Accessibility.

## Context

The provisioning API (`server/src/provisioningRoutes.js`) currently has zero authentication or authorization — any caller on the network can create and read provisioning jobs. Job state lives only in an in-memory `Map` (`server/src/provisioningJobs.js`), so all history is lost on every restart. There is no request validation beyond a single field-presence check, no rate-limiting, no structured logging, and CORS is wide open (`cors()` with no options). The client already performs an interactive MSAL/Entra ID login (`client/src/components/layout/AuthSection.jsx`) but never sends that identity to the server — the server's only existing MSAL usage is a separate app-only `ConfidentialClientApplication` (`server/src/msalClient.js`) used solely for Graph API calls during provisioning.

Deployment target: internal network / VPN-only, never internet-exposed. This justifies pragmatic rather than maximal settings for CORS and rate-limiting.

## Architecture

**Approach: incremental middleware additions, no restructuring.**

The server is 5 files. Rather than introducing a layered architecture (routes/controllers/services), each hardening concern is added as a focused middleware or module that plugs into the existing `index.js` / `provisioningRoutes.js` shape. This keeps the diff small and reviewable and matches the project's current scale — a layered rewrite would be unjustified effort for a 5-file server.

**Auth approach: validate the client's existing Entra ID ID token, not a new custom API scope.**

The client already obtains an ID token via `instance.loginPopup(loginRequest)` (MSAL). An ID token's `aud` claim is the client's own Azure AD App Registration ID by default — no Azure Portal "Expose an API" step is required. The server verifies:
1. JWT signature against Microsoft's JWKS endpoint for the tenant
2. `aud` === the app's own `AZURE_CLIENT_ID`
3. `tid` === the app's own `AZURE_TENANT_ID`
4. `exp` not expired

This reuses the login the user already performs, requires no new Azure Portal configuration, and avoids minting or storing any server-side secret shared with the client.

**Persistence approach: SQLite-backed job store, replacing the in-memory `Map`.**

`better-sqlite3` writes to a single file (`server/data/jobs.db`, path configurable via `JOBS_DB_PATH` env var). Only serializable job fields are persisted; the non-serializable runtime objects (`graphClient`, `timer` handle) stay in a separate in-memory-only `Map`, scoped to jobs actively running in the current process.

**Known limitation, accepted by design:** if the server restarts while a job is mid-flight, that job's row remains in SQLite with its last-known `status`/`currentStep`, so its history is queryable — but the `setTimeout`-driven step chain does not resume automatically. Resuming requires a job queue/worker re-driving mechanism, which is out of scope for this hardening pass. A future phase could add this if restart-during-provisioning becomes a real operational problem.

**Tech stack additions:** `jsonwebtoken`, `jwks-rsa` (JWT verification), `better-sqlite3` (persistence), `zod` (request validation), `pino` (structured logging), `express-rate-limit` (rate limiting). None of these are currently installed (confirmed via `server/package.json`).

---

## Section 1 — Authentication Middleware

### `server/src/authMiddleware.js` (new file)

```js
import jwksRsa from 'jwks-rsa'
import jwt from 'jsonwebtoken'

const TENANT_ID = process.env.AZURE_TENANT_ID
const CLIENT_ID = process.env.AZURE_CLIENT_ID

const jwksClient = jwksRsa({
  jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 24 * 60 * 60 * 1000,
})

function getSigningKey(header, callback) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err)
    callback(null, key.getPublicKey())
  })
}

export function requireAuth(req, res, next) {
  if (process.env.NODE_ENV === 'test' && process.env.AUTH_DISABLED === 'true') {
    return next()
  }

  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' })
  }

  jwt.verify(
    token,
    getSigningKey,
    { audience: CLIENT_ID, issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0` },
    (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid or expired token' })
      }
      req.user = { oid: decoded.oid, name: decoded.name, preferred_username: decoded.preferred_username }
      next()
    }
  )
}
```

- Returns `401` with a generic message on any verification failure (no leaking of JWT internals to the client).
- `req.user` is populated for downstream logging (Section 4) but no per-user authorization logic is introduced — any validly authenticated tenant user may provision sites, matching current behavior minus the "anyone at all" gap.
- Applied to the whole `/api/provisioning` router in `index.js` (Section 6), not per-route, so both `POST /jobs` and `GET /jobs/:jobId` require a valid token.

### Client-side change required

`client/src/auth/msalConfig.js` requests `scopes: ['User.Read']`. The ID token is issued as part of every token acquisition regardless of scope, and is available as `accounts[0].idToken` after login, or via `instance.acquireTokenSilent(loginRequest)` → result `.idToken`. The client's API call layer (wherever `fetch('/api/provisioning/jobs', ...)` is invoked) must attach `Authorization: Bearer <idToken>`. This is a client-side change paired with this backend work — flagged here so the implementation plan includes it as an explicit task.

---

## Section 2 — Request Validation

### `server/src/schemas.js` (new file)

```js
import { z } from 'zod'

const localizedString = z.union([z.string(), z.record(z.string())])

export const tenantConfigurationSchema = z.object({
  siteName: localizedString,
  widgets: z.array(z.object({ blockId: z.string() })).optional().default([]),
}).passthrough()

export const createJobSchema = z.object({
  tenantConfiguration: tenantConfigurationSchema,
})
```

`passthrough()` allows additional fields the configurator already sends (theme, pages, etc.) without the schema needing to enumerate every one — only the fields the provisioning logic actually reads (`siteName`, `widgets`) are validated strictly.

### `server/src/provisioningRoutes.js` (modified)

```js
import { Router } from 'express'
import { createJob, getJob } from './provisioningJobs.js'
import { createJobSchema } from './schemas.js'

const router = Router()

router.post('/jobs', (req, res) => {
  const parsed = createJobSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues })
  }
  const job = createJob(parsed.data.tenantConfiguration)
  res.status(201).json({ jobId: job.id, totalSteps: job.totalSteps })
})

router.get('/jobs/:jobId', (req, res) => {
  const job = getJob(req.params.jobId)
  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }
  res.json({
    jobId: job.id, status: job.status, currentStep: job.currentStep,
    totalSteps: job.totalSteps, result: job.result, error: job.error,
  })
})

export default router
```

---

## Section 3 — Rate Limiting & CORS

### `server/index.js` (modified)

```js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import provisioningRoutes from './src/provisioningRoutes.js'
import { requireAuth } from './src/authMiddleware.js'
import logger from './src/logger.js'

const app = express()

const allowedOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
app.use(cors({ origin: allowedOrigin }))
app.use(express.json())

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/provisioning', limiter)

app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'request received')
  next()
})

app.use('/api/provisioning', requireAuth, provisioningRoutes)

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  logger.info(`ShareFlow provisioning API listening on http://localhost:${PORT}`)
})
```

- **CORS**: restricted to a single configurable origin via `CLIENT_ORIGIN` env var, defaulting to the Vite dev server URL. Internal/VPN deployment means one trusted frontend origin is realistic; no need for a multi-origin allow-list.
- **Rate limit**: 100 requests/minute per IP — generous enough that no legitimate UI interaction is throttled, but enough to stop a runaway client (e.g. a buggy polling loop) from hammering the server. This is explicitly *not* tuned for internet-scale abuse, consistent with the VPN-only deployment context.

---

## Section 4 — Structured Logging

### `server/src/logger.js` (new file)

```js
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
})

export default logger
```

Used in `index.js` for request logging (Section 3) and in `provisioningJobs.js` for per-step logging:

```js
// provisioningJobs.js, inside runStep's catch block
} catch (err) {
  logger.error({ jobId, step, err: err.message }, 'provisioning step failed')
  job.status = 'error'
  job.error = err.message
  persistJob(job)
  return
}
```

and on successful completion:

```js
if (job.currentStep >= STEP_COUNT) {
  job.status = 'done'
  job.result = { siteUrl: job.siteUrl ?? `https://contoso.sharepoint.com/sites/${resolveSiteName(job.tenantConfiguration?.siteName)}` }
  logger.info({ jobId, siteUrl: job.result.siteUrl }, 'provisioning completed')
  persistJob(job)
  return
}
```

No external log shipping is configured — `pino`'s default JSON-to-stdout output is sufficient for an internally-deployed service; an ops team can pipe stdout to whatever internal log collector they already use.

---

## Section 5 — Persistence (SQLite) and the Site-Name Refactor

### `server/src/jobStore.js` (new file)

```js
import Database from 'better-sqlite3'
import path from 'node:path'

const dbPath = process.env.JOBS_DB_PATH ?? path.join(import.meta.dirname, '..', 'data', 'jobs.db')
const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    current_step INTEGER NOT NULL,
    total_steps INTEGER NOT NULL,
    tenant_configuration TEXT NOT NULL,
    result TEXT,
    error TEXT,
    site_id TEXT,
    site_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

const upsertStmt = db.prepare(`
  INSERT INTO jobs (id, status, current_step, total_steps, tenant_configuration, result, error, site_id, site_url, created_at, updated_at)
  VALUES (@id, @status, @currentStep, @totalSteps, @tenantConfiguration, @result, @error, @siteId, @siteUrl, @createdAt, @updatedAt)
  ON CONFLICT(id) DO UPDATE SET
    status = @status, current_step = @currentStep, result = @result, error = @error,
    site_id = @siteId, site_url = @siteUrl, updated_at = @updatedAt
`)

const selectStmt = db.prepare('SELECT * FROM jobs WHERE id = ?')

export function persistJob(job) {
  const now = new Date().toISOString()
  upsertStmt.run({
    id: job.id,
    status: job.status,
    currentStep: job.currentStep,
    totalSteps: job.totalSteps,
    tenantConfiguration: JSON.stringify(job.tenantConfiguration),
    result: job.result ? JSON.stringify(job.result) : null,
    error: job.error,
    siteId: job.siteId,
    siteUrl: job.siteUrl,
    createdAt: job.createdAt ?? now,
    updatedAt: now,
  })
}

export function loadJob(id) {
  const row = selectStmt.get(id)
  if (!row) return null
  return {
    id: row.id,
    status: row.status,
    currentStep: row.current_step,
    totalSteps: row.total_steps,
    tenantConfiguration: JSON.parse(row.tenant_configuration),
    result: row.result ? JSON.parse(row.result) : null,
    error: row.error,
    siteId: row.site_id,
    siteUrl: row.site_url,
  }
}
```

`server/data/` is added to `.gitignore` (the SQLite file is runtime state, not source).

### `server/src/provisioningJobs.js` (modified)

The in-memory `jobs` Map is kept **only** for the non-serializable runtime fields of currently-running jobs (`graphClient`, `timer`); `getJob` now falls back to SQLite for jobs not in the in-memory map (i.e. completed jobs from a prior process lifetime, or jobs queried after the in-memory entry would otherwise be needed). Every mutation that previously only touched the in-memory job now also calls `persistJob(job)`.

```js
import crypto from 'node:crypto'
import { isGraphConfigured, getGraphAccessToken } from './msalClient.js'
import { getGraphClient } from './graphClient.js'
import { persistJob, loadJob } from './jobStore.js'
import logger from './logger.js'

const STEP_COUNT = 6
const STEP_DELAY_MS = 900

const jobs = new Map()

function resolveSiteName(siteName) {
  const value = siteName && typeof siteName === 'object'
    ? (siteName.en ?? siteName.it ?? Object.values(siteName)[0] ?? 'site')
    : (siteName ?? 'site')
  return String(value)
}

function slugify(text) {
  const str = resolveSiteName(text)
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'site'
}

async function runStep(jobId, step) {
  const job = jobs.get(jobId)
  if (!job) return

  try {
    switch (step) {
      case 0:
        if (isGraphConfigured()) await getGraphAccessToken()
        break
      case 1:
        if (isGraphConfigured()) job.graphClient = await getGraphClient()
        break
      case 2:
        if (isGraphConfigured()) await createSharePointSite(job)
        break
      case 3:
        if (isGraphConfigured()) await provisionLists(job)
        break
      case 4:
        if (isGraphConfigured()) await configurePages(job)
        break
    }
  } catch (err) {
    logger.error({ jobId, step, err: err.message }, 'provisioning step failed')
    job.status = 'error'
    job.error = err.message
    persistJob(job)
    return
  }

  job.currentStep = step + 1

  if (job.currentStep >= STEP_COUNT) {
    job.status = 'done'
    job.result = { siteUrl: job.siteUrl ?? `https://contoso.sharepoint.com/sites/${slugify(job.tenantConfiguration?.siteName)}` }
    logger.info({ jobId, siteUrl: job.result.siteUrl }, 'provisioning completed')
    persistJob(job)
    return
  }

  persistJob(job)
  job.timer = setTimeout(() => runStep(jobId, job.currentStep), STEP_DELAY_MS)
}

async function createSharePointSite(job) {
  const siteNameStr = resolveSiteName(job.tenantConfiguration?.siteName)
  const mailNickname = slugify(siteNameStr)
  const group = await job.graphClient.api('/groups').post({
    displayName: siteNameStr,
    mailNickname,
    groupTypes: ['Unified'],
    mailEnabled: true,
    securityEnabled: false,
  })
  const site = await job.graphClient.api(`/groups/${group.id}/sites/root`).get()
  job.siteId = site.id
  job.siteUrl = site.webUrl
}

async function provisionLists(job) {
  const widgets = job.tenantConfiguration?.widgets ?? []
  for (const widget of widgets) {
    await job.graphClient.api(`/sites/${job.siteId}/lists`).post({
      displayName: widget.blockId,
      list: { template: 'genericList' },
    })
  }
}

async function configurePages(job) {
  const siteNameStr = resolveSiteName(job.tenantConfiguration?.siteName)
  await job.graphClient.api(`/sites/${job.siteId}/pages`).version('beta').post({
    '@odata.type': '#microsoft.graph.sitePage',
    name: 'Home.aspx',
    title: siteNameStr,
    pageLayout: 'article',
  })
}

export function createJob(tenantConfiguration) {
  const id = crypto.randomUUID()
  const job = {
    id,
    status: 'running',
    currentStep: 0,
    totalSteps: STEP_COUNT,
    tenantConfiguration,
    result: null,
    error: null,
    siteId: null,
    siteUrl: null,
    graphClient: null,
    timer: null,
    createdAt: new Date().toISOString(),
  }
  jobs.set(id, job)
  persistJob(job)
  job.timer = setTimeout(() => runStep(id, 0), STEP_DELAY_MS)
  return job
}

export function getJob(id) {
  return jobs.get(id) ?? loadJob(id)
}
```

`resolveSiteName` replaces the three duplicated inline unwrap blocks (previously in `runStep`'s mock-URL fallback, `createSharePointSite`, and `configurePages`); `slugify` now calls it instead of duplicating the same ternary.

---

## Section 6 — Files Created / Modified

### New files

| File | Responsibility |
|---|---|
| `server/src/authMiddleware.js` | `requireAuth` — verifies Entra ID JWT (ID token) via JWKS, checks `aud`/`tid`/`exp` |
| `server/src/schemas.js` | Zod schemas for request body validation |
| `server/src/logger.js` | Shared `pino` logger instance |
| `server/src/jobStore.js` | SQLite persistence: `persistJob(job)`, `loadJob(id)` |
| `server/data/.gitkeep` | Keeps the `data/` directory in git while its contents (`jobs.db`) are ignored |

### Modified files

| File | Change |
|---|---|
| `server/index.js` | CORS restricted to `CLIENT_ORIGIN`; add rate limiter; add request logging; mount `requireAuth` before provisioning routes |
| `server/src/provisioningRoutes.js` | Validate body with `createJobSchema`; return 400 with issue details on failure |
| `server/src/provisioningJobs.js` | Add `resolveSiteName` helper (replaces 3x duplicated unwrap logic); call `persistJob` on every state mutation; `getJob` falls back to `loadJob` |
| `server/package.json` | Add `jsonwebtoken`, `jwks-rsa`, `zod`, `pino`, `better-sqlite3`, `express-rate-limit` |
| `server/.env.example` (or equivalent docs) | Document new env vars: `CLIENT_ORIGIN`, `JOBS_DB_PATH` (optional), `LOG_LEVEL` (optional) |
| `.gitignore` (server-level or root) | Add `server/data/*.db` |
| `client/src/auth/msalConfig.js` / API call site | Attach `Authorization: Bearer <idToken>` header to provisioning API requests |

---

## Section 7 — Testing

This sub-project adds the following tests (full unit test coverage for the rest of the codebase is sub-project 2 of Phase 4, scoped separately):

1. **`authMiddleware` unit tests** — valid token passes through to `next()`; missing header → 401; malformed token → 401; wrong `aud` → 401; expired token → 401. JWKS lookup is mocked.
2. **`schemas` unit tests** — valid `tenantConfiguration` passes; missing `siteName` fails; non-object/non-string `siteName` fails; passthrough fields are preserved.
3. **`jobStore` unit tests** — `persistJob` then `loadJob` round-trips all fields correctly; `loadJob` on unknown id returns `null`.
4. **`resolveSiteName` unit tests** — string input returned as-is; object input returns `en`, falling back to `it`, falling back to first value; `null`/`undefined` returns `'site'`.
5. **E2e regression** — existing Playwright suite (`smoke.spec.js`) currently calls the provisioning API with no auth header, so all provisioning-flow tests will start failing with 401 once `requireAuth` is added. Fix: the server reads an `AUTH_DISABLED` env var; when set to `true` **and** `NODE_ENV === 'test'`, `requireAuth` short-circuits to `next()` without verifying a token. Playwright's test runner sets both `NODE_ENV=test` and `AUTH_DISABLED=true` when launching the server (e.g. in `playwright.config.js`'s `webServer.env`), so production and dev runs are unaffected and a stray `AUTH_DISABLED=true` in a non-test environment is still blocked by the `NODE_ENV` check.

---

## Out of Scope

- Resuming an in-flight provisioning job automatically after a server restart (would require a job queue/worker; documented as an accepted limitation in the Architecture section)
- Per-user authorization (e.g. restricting which authenticated users may provision sites) — any validly authenticated tenant member can provision, same trust boundary as before minus the "no auth at all" gap
- External log aggregation/shipping (e.g. shipping `pino` output to a centralized log service)
- Internet-facing CORS/rate-limit hardening (multi-origin allow-lists, IP reputation, WAF-style protections) — explicitly unnecessary given VPN-only deployment
- Error Boundary / UI resilience work (deferred to a later phase per user's explicit exclusion)
- Migrating job history between SQLite files or backing up `jobs.db`
