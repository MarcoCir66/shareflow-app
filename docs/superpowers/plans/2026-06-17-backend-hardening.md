# Backend Security & Robustness Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the ShareFlow provisioning API for internal/VPN-only deployment: authenticate callers via their existing Entra ID login, validate request payloads, persist job state in SQLite, add light rate-limiting and structured logging, and remove triplicated site-name-unwrap logic.

**Architecture:** Incremental middleware additions to the existing 5-file Express server (no layered restructuring). Each concern (logging, validation, persistence, auth) lands as a small new module under `server/src/`, wired into `index.js` or `provisioningJobs.js`. The client gains a thin token-attachment helper; Playwright gains a second managed `webServer` entry so e2e runs always have the right server-side env vars.

**Tech Stack:** Express 4, `pino` (logging), `zod` (validation), `better-sqlite3` (persistence), `jsonwebtoken` + `jwks-rsa` (Entra ID token verification), `express-rate-limit`. Tests use Node's built-in `node:test` + `node:assert/strict` (no new test framework — YAGNI, the server has 5 files).

## Global Constraints

- Deployment target is internal network/VPN-only — CORS is a single configurable origin, rate-limiting is generous (not internet-hardened). Source: spec Architecture section.
- No per-user authorization: any validly authenticated tenant member may provision sites (same trust boundary as today, minus "no auth at all"). Source: spec Out of Scope.
- In-flight jobs do not auto-resume after a server restart; only their last-known state is preserved in SQLite. Source: spec Architecture section ("Known limitation, accepted by design").
- `server/src/msalClient.js`'s existing `AZURE_CLIENT_ID` belongs to a different (app-only) App Registration than the SPA. Token audience validation must use a new, separate `SPA_CLIENT_ID` env var, not `AZURE_CLIENT_ID`. Source: spec correction, Section 1.
- No external log shipping; `pino` writes JSON to stdout only. Source: spec Section 4.
- Node >= 21.2 required (`import.meta.dirname` used in `jobStore.js`); confirmed available (Node 24 installed).

---

### Task 1: Structured logging

**Files:**
- Create: `server/src/logger.js`
- Create: `server/src/logger.test.js`
- Modify: `server/index.js`
- Modify: `server/package.json` (add `pino` dependency, add `test` script)

**Interfaces:**
- Produces: `export default logger` from `server/src/logger.js` — a `pino` instance with `.info(obj?, msg)` / `.error(obj?, msg)` methods. Later tasks (5, 7) import this as `import logger from './logger.js'`.

- [ ] **Step 1: Install pino and add a test script**

```bash
cd "server" && npm install pino
```

Open `server/package.json` and add a `test` script next to the existing `dev` script:

```json
"scripts": {
  "start": "node index.js",
  "dev": "node --watch index.js",
  "test": "node --test src/"
}
```

- [ ] **Step 2: Write the failing test**

Create `server/src/logger.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import logger from './logger.js'

test('logger exposes info and error methods and does not throw when called', () => {
  assert.equal(typeof logger.info, 'function')
  assert.equal(typeof logger.error, 'function')
  assert.doesNotThrow(() => logger.info({ scope: 'test' }, 'smoke test message'))
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd "server" && npm test`
Expected: FAIL — `Cannot find module './logger.js'` (file doesn't exist yet)

- [ ] **Step 4: Write minimal implementation**

Create `server/src/logger.js`:

```js
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
})

export default logger
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd "server" && npm test`
Expected: PASS (1 test passing)

- [ ] **Step 6: Wire request logging into index.js**

Open `server/index.js`. Replace its full contents with:

```js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import provisioningRoutes from './src/provisioningRoutes.js'
import logger from './src/logger.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'request received')
  next()
})

app.use('/api/provisioning', provisioningRoutes)

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  logger.info(`ShareFlow provisioning API listening on http://localhost:${PORT}`)
})
```

(CORS options, rate-limiting, the health route, and the auth middleware mount are added later in Task 7 — this step only swaps `console.log` for `logger` and adds request logging, keeping the diff reviewable.)

- [ ] **Step 7: Manually verify the server still starts**

Run: `cd "server" && npm start`
Expected: Console prints a JSON log line ending with `"ShareFlow provisioning API listening on http://localhost:3001"`. Stop the server with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add server/src/logger.js server/src/logger.test.js server/index.js server/package.json server/package-lock.json
git commit -m "feat(server): add structured logging via pino"
```

---

### Task 2: Extract `resolveSiteName` helper (DRY refactor)

**Files:**
- Modify: `server/src/provisioningJobs.js`
- Create: `server/src/provisioningJobs.test.js`

**Interfaces:**
- Produces: `export function resolveSiteName(siteName)` from `server/src/provisioningJobs.js` — accepts a string or a `{ [lang]: string }` object (or `null`/`undefined`), returns a string. Later tasks (5) continue to use this from the same file.

- [ ] **Step 1: Write the failing test**

Create `server/src/provisioningJobs.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSiteName } from './provisioningJobs.js'

test('string input is returned as-is', () => {
  assert.equal(resolveSiteName('My Site'), 'My Site')
})

test('object input prefers en', () => {
  assert.equal(resolveSiteName({ it: 'Sito', en: 'Site' }), 'Site')
})

test('object input falls back to it when en is missing', () => {
  assert.equal(resolveSiteName({ it: 'Sito', fr: 'Site FR' }), 'Sito')
})

test('object input falls back to first value when neither en nor it present', () => {
  assert.equal(resolveSiteName({ de: 'Standort' }), 'Standort')
})

test('null or undefined input returns "site"', () => {
  assert.equal(resolveSiteName(null), 'site')
  assert.equal(resolveSiteName(undefined), 'site')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "server" && npm test`
Expected: FAIL — `resolveSiteName is not exported` (function doesn't exist yet)

- [ ] **Step 3: Write minimal implementation**

Open `server/src/provisioningJobs.js`. Replace the existing `slugify` function and the duplicated inline unwrap blocks in `runStep`, `createSharePointSite`, and `configurePages` as follows.

Replace:

```js
function slugify(text) {
  const str = text && typeof text === 'object' ? (text.en ?? text.it ?? Object.values(text)[0] ?? 'site') : text
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'site'
}
```

with:

```js
export function resolveSiteName(siteName) {
  const value = siteName && typeof siteName === 'object'
    ? (siteName.en ?? siteName.it ?? Object.values(siteName)[0] ?? 'site')
    : (siteName ?? 'site')
  return String(value)
}

function slugify(text) {
  const str = resolveSiteName(text)
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'site'
}
```

In `runStep`, replace:

```js
    job.result = {
      siteUrl: job.siteUrl ?? `https://contoso.sharepoint.com/sites/${slugify(job.tenantConfiguration?.siteName ?? 'site')}`,
    }
```

with:

```js
    job.result = {
      siteUrl: job.siteUrl ?? `https://contoso.sharepoint.com/sites/${slugify(job.tenantConfiguration?.siteName)}`,
    }
```

In `createSharePointSite`, replace:

```js
  const rawSiteName = job.tenantConfiguration?.siteName
  const siteNameStr = rawSiteName && typeof rawSiteName === 'object' ? (rawSiteName.en ?? rawSiteName.it ?? Object.values(rawSiteName)[0] ?? 'site') : (rawSiteName ?? 'site')
```

with:

```js
  const siteNameStr = resolveSiteName(job.tenantConfiguration?.siteName)
```

In `configurePages`, replace:

```js
  const rawSiteName = job.tenantConfiguration?.siteName
  const siteNameStr = rawSiteName && typeof rawSiteName === 'object' ? (rawSiteName.en ?? rawSiteName.it ?? Object.values(rawSiteName)[0] ?? 'site') : (rawSiteName ?? 'site')
```

with:

```js
  const siteNameStr = resolveSiteName(job.tenantConfiguration?.siteName)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "server" && npm test`
Expected: PASS (6 tests passing: 1 from Task 1 + 5 new)

- [ ] **Step 5: Run the existing e2e suite to confirm no regression**

Run: `cd "client" && npm run test:e2e`
Expected: All tests pass (same pass count as before this task — this refactor must not change any observable behavior)

- [ ] **Step 6: Commit**

```bash
git add server/src/provisioningJobs.js server/src/provisioningJobs.test.js
git commit -m "refactor(server): extract resolveSiteName, removing triplicated unwrap logic"
```

---

### Task 3: Request validation with Zod

**Files:**
- Create: `server/src/schemas.js`
- Create: `server/src/schemas.test.js`
- Modify: `server/src/provisioningRoutes.js`
- Modify: `server/package.json` (add `zod` dependency)

**Interfaces:**
- Produces: `export const createJobSchema` (a Zod schema) from `server/src/schemas.js`. Used only in `provisioningRoutes.js`; no other task depends on it.

- [ ] **Step 1: Install zod**

```bash
cd "server" && npm install zod
```

- [ ] **Step 2: Write the failing test**

Create `server/src/schemas.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createJobSchema } from './schemas.js'

test('valid tenantConfiguration with string siteName passes', () => {
  const result = createJobSchema.safeParse({ tenantConfiguration: { siteName: 'My Site' } })
  assert.equal(result.success, true)
})

test('valid tenantConfiguration with localized siteName object passes', () => {
  const result = createJobSchema.safeParse({
    tenantConfiguration: { siteName: { it: 'Sito', en: 'Site' } },
  })
  assert.equal(result.success, true)
})

test('missing siteName fails', () => {
  const result = createJobSchema.safeParse({ tenantConfiguration: { widgets: [] } })
  assert.equal(result.success, false)
})

test('passthrough fields such as theme are preserved', () => {
  const input = { tenantConfiguration: { siteName: 'Site', theme: { accentColor: '#fff' } } }
  const result = createJobSchema.safeParse(input)
  assert.equal(result.success, true)
  assert.deepEqual(result.data.tenantConfiguration.theme, { accentColor: '#fff' })
})

test('widgets default to an empty array when omitted', () => {
  const result = createJobSchema.safeParse({ tenantConfiguration: { siteName: 'Site' } })
  assert.deepEqual(result.data.tenantConfiguration.widgets, [])
})

test('missing tenantConfiguration entirely fails', () => {
  const result = createJobSchema.safeParse({})
  assert.equal(result.success, false)
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd "server" && npm test`
Expected: FAIL — `Cannot find module './schemas.js'`

- [ ] **Step 4: Write minimal implementation**

Create `server/src/schemas.js`:

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

- [ ] **Step 5: Run test to verify it passes**

Run: `cd "server" && npm test`
Expected: PASS (12 tests passing: 6 from Tasks 1-2 + 6 new)

- [ ] **Step 6: Wire validation into the route**

Open `server/src/provisioningRoutes.js`. Replace its full contents with:

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

- [ ] **Step 7: Run the existing e2e suite to confirm no regression**

Run: `cd "client" && npm run test:e2e`
Expected: All tests pass (the deploy flow sends a valid `tenantConfiguration`, so validation should never reject it)

- [ ] **Step 8: Commit**

```bash
git add server/src/schemas.js server/src/schemas.test.js server/src/provisioningRoutes.js server/package.json server/package-lock.json
git commit -m "feat(server): validate provisioning request bodies with zod"
```

---

### Task 4: SQLite job store

**Files:**
- Create: `server/src/jobStore.js`
- Create: `server/src/jobStore.test.js`
- Create: `server/data/.gitkeep`
- Modify: `server/package.json` (add `better-sqlite3` dependency)
- Modify: `.gitignore` (root, alongside the existing `shareflow-app` entries — see Step 3)

**Interfaces:**
- Produces: `export function persistJob(job)` and `export function loadJob(id)` from `server/src/jobStore.js`. `persistJob` accepts an object with `{ id, status, currentStep, totalSteps, tenantConfiguration, result, error, siteId, siteUrl, createdAt }`. `loadJob` returns an object with the same shape (camelCase) or `null`. Task 5 imports both.

- [ ] **Step 1: Install better-sqlite3 and verify it loads**

```bash
cd "server" && npm install better-sqlite3
node -e "require('better-sqlite3'); console.log('better-sqlite3 OK')"
```

Expected: prints `better-sqlite3 OK`. If this fails with a native build error, stop and report it — `better-sqlite3` needs a working native toolchain (or a prebuilt binary for this Node/OS/arch combination) before continuing.

- [ ] **Step 2: Create the data directory placeholder**

Run: `cd "server" && mkdir -p data && touch data/.gitkeep` (or, on Windows PowerShell: `New-Item -ItemType Directory -Force data; New-Item -ItemType File -Force data/.gitkeep`)

- [ ] **Step 3: Ignore the actual database file**

Open the root `.gitignore` (the one at `shareflow-app/.gitignore`, already containing `node_modules/`, `dist/`, `*.log`, `.env`, `.DS_Store`, `.superpowers/`). Add a new line:

```
server/data/*.db
```

- [ ] **Step 4: Write the failing test**

Create `server/src/jobStore.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobstore-test-'))
process.env.JOBS_DB_PATH = path.join(tmpDir, 'jobs.db')

const { persistJob, loadJob } = await import('./jobStore.js')

test('persistJob then loadJob round-trips all fields', () => {
  const job = {
    id: 'abc-123',
    status: 'running',
    currentStep: 2,
    totalSteps: 6,
    tenantConfiguration: { siteName: 'Test Site', widgets: [] },
    result: null,
    error: null,
    siteId: null,
    siteUrl: null,
    createdAt: new Date().toISOString(),
  }
  persistJob(job)
  const loaded = loadJob('abc-123')
  assert.equal(loaded.id, 'abc-123')
  assert.equal(loaded.status, 'running')
  assert.equal(loaded.currentStep, 2)
  assert.equal(loaded.totalSteps, 6)
  assert.deepEqual(loaded.tenantConfiguration, { siteName: 'Test Site', widgets: [] })
  assert.equal(loaded.result, null)
  assert.equal(loaded.siteUrl, null)
})

test('persistJob upserts — calling it twice updates the same row', () => {
  const job = {
    id: 'abc-456',
    status: 'running',
    currentStep: 0,
    totalSteps: 6,
    tenantConfiguration: { siteName: 'Site Two' },
    result: null,
    error: null,
    siteId: null,
    siteUrl: null,
    createdAt: new Date().toISOString(),
  }
  persistJob(job)
  persistJob({ ...job, status: 'done', currentStep: 6, result: { siteUrl: 'https://example.com' } })
  const loaded = loadJob('abc-456')
  assert.equal(loaded.status, 'done')
  assert.equal(loaded.currentStep, 6)
  assert.deepEqual(loaded.result, { siteUrl: 'https://example.com' })
})

test('loadJob returns null for an unknown id', () => {
  assert.equal(loadJob('does-not-exist'), null)
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `cd "server" && npm test`
Expected: FAIL — `Cannot find module './jobStore.js'`

- [ ] **Step 6: Write minimal implementation**

Create `server/src/jobStore.js`:

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

- [ ] **Step 7: Run test to verify it passes**

Run: `cd "server" && npm test`
Expected: PASS (15 tests passing: 12 from Tasks 1-3 + 3 new)

- [ ] **Step 8: Commit**

```bash
git add server/src/jobStore.js server/src/jobStore.test.js server/data/.gitkeep server/package.json server/package-lock.json .gitignore
git commit -m "feat(server): add SQLite-backed job persistence store"
```

---

### Task 5: Wire persistence and step logging into the job state machine

**Files:**
- Modify: `server/src/provisioningJobs.js`
- Modify: `server/src/provisioningJobs.test.js` (isolate its SQLite file from the real dev database)

**Interfaces:**
- Consumes: `persistJob(job)`, `loadJob(id)` from `server/src/jobStore.js` (Task 4); `logger` default export from `server/src/logger.js` (Task 1).
- Produces: `getJob(id)` now returns persisted jobs even if they're not in the in-memory map (no signature change — same callers in `provisioningRoutes.js` are unaffected).

- [ ] **Step 1: Isolate the existing unit test's database file**

Open `server/src/provisioningJobs.test.js`. Add these three lines at the very top of the file, before any other import:

```js
import os from 'node:os'
import path from 'node:path'
process.env.JOBS_DB_PATH = path.join(os.tmpdir(), `provisioning-jobs-test-${process.pid}.db`)
```

The full top of the file should now read:

```js
import os from 'node:os'
import path from 'node:path'
process.env.JOBS_DB_PATH = path.join(os.tmpdir(), `provisioning-jobs-test-${process.pid}.db`)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSiteName } from './provisioningJobs.js'
```

(This must be set before `provisioningJobs.js` is imported, since that import transitively imports `jobStore.js`, which reads `JOBS_DB_PATH` at module-load time.)

- [ ] **Step 2: Run test to verify it still passes (no behavior change yet)**

Run: `cd "server" && npm test`
Expected: PASS (15 tests, same as Task 4 — this step only changes where the test's SQLite file lives)

- [ ] **Step 3: Wire persistence and logging into provisioningJobs.js**

Open `server/src/provisioningJobs.js`. Replace the top imports:

```js
import crypto from 'node:crypto'
import { isGraphConfigured, getGraphAccessToken } from './msalClient.js'
import { getGraphClient } from './graphClient.js'
```

with:

```js
import crypto from 'node:crypto'
import { isGraphConfigured, getGraphAccessToken } from './msalClient.js'
import { getGraphClient } from './graphClient.js'
import { persistJob, loadJob } from './jobStore.js'
import logger from './logger.js'
```

Replace the `catch` block inside `runStep`:

```js
  } catch (err) {
    job.status = 'error'
    job.error = err.message
    return
  }
```

with:

```js
  } catch (err) {
    logger.error({ jobId, step, err: err.message }, 'provisioning step failed')
    job.status = 'error'
    job.error = err.message
    persistJob(job)
    return
  }
```

Replace the "done" branch inside `runStep`:

```js
  if (job.currentStep >= STEP_COUNT) {
    job.status = 'done'
    job.result = {
      siteUrl: job.siteUrl ?? `https://contoso.sharepoint.com/sites/${slugify(job.tenantConfiguration?.siteName)}`,
    }
    return
  }

  job.timer = setTimeout(() => runStep(jobId, job.currentStep), STEP_DELAY_MS)
```

with:

```js
  if (job.currentStep >= STEP_COUNT) {
    job.status = 'done'
    job.result = {
      siteUrl: job.siteUrl ?? `https://contoso.sharepoint.com/sites/${slugify(job.tenantConfiguration?.siteName)}`,
    }
    logger.info({ jobId, siteUrl: job.result.siteUrl }, 'provisioning completed')
    persistJob(job)
    return
  }

  persistJob(job)
  job.timer = setTimeout(() => runStep(jobId, job.currentStep), STEP_DELAY_MS)
```

Replace `createJob`:

```js
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
  }
  jobs.set(id, job)
  job.timer = setTimeout(() => runStep(id, 0), STEP_DELAY_MS)
  return job
}

export function getJob(id) {
  return jobs.get(id)
}
```

with:

```js
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

- [ ] **Step 4: Run unit tests to verify nothing broke**

Run: `cd "server" && npm test`
Expected: PASS (15 tests)

- [ ] **Step 5: Run the existing e2e suite — critical regression check**

Run: `cd "client" && npm run test:e2e`
Expected: All tests pass. This is the most important check in this task: it confirms the full job lifecycle (create → poll → done) still works with persistence wired in, and that `server/data/jobs.db` (or the configured `JOBS_DB_PATH`) is being written to without errors.

- [ ] **Step 6: Commit**

```bash
git add server/src/provisioningJobs.js server/src/provisioningJobs.test.js
git commit -m "feat(server): persist job state to SQLite on every transition"
```

---

### Task 6: Entra ID token verification middleware (standalone, not yet wired in)

**Files:**
- Create: `server/src/authMiddleware.js`
- Create: `server/src/authMiddleware.test.js`
- Modify: `server/package.json` (add `jsonwebtoken` and `jwks-rsa` dependencies)

**Interfaces:**
- Produces: `export function createRequireAuth(verifyToken)` — takes an async function `(token: string) => Promise<{ oid, name, preferred_username }>` and returns an Express middleware `(req, res, next)`. Also produces `export const requireAuth` — the production-ready middleware, pre-wired with real JWKS verification. Task 7 imports `requireAuth` only.
- The middleware sets `req.user = { oid, name, preferred_username }` on success, returns `401` with `{ error: 'Missing bearer token' }` or `{ error: 'Invalid or expired token' }` on failure, and calls `next()` immediately (bypassing verification) when `process.env.NODE_ENV === 'test'` and `process.env.AUTH_DISABLED === 'true'`.

This task uses dependency injection (`createRequireAuth(verifyToken)`) instead of mocking the `jsonwebtoken`/`jwks-rsa` modules directly, so the test suite stays simple and deterministic — no experimental module-mocking APIs, no live network calls to Microsoft's JWKS endpoint.

- [ ] **Step 1: Install jsonwebtoken and jwks-rsa**

```bash
cd "server" && npm install jsonwebtoken jwks-rsa
```

- [ ] **Step 2: Write the failing test**

Create `server/src/authMiddleware.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequireAuth } from './authMiddleware.js'

function mockRes() {
  const res = { statusCode: null, body: null }
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (body) => { res.body = body; return res }
  return res
}

test('missing Authorization header returns 401', async () => {
  const requireAuth = createRequireAuth(async () => ({}))
  const req = { headers: {} }
  const res = mockRes()
  let nextCalled = false
  await requireAuth(req, res, () => { nextCalled = true })
  assert.equal(res.statusCode, 401)
  assert.equal(nextCalled, false)
})

test('Authorization header without Bearer prefix returns 401', async () => {
  const requireAuth = createRequireAuth(async () => ({}))
  const req = { headers: { authorization: 'Token abc123' } }
  const res = mockRes()
  await requireAuth(req, res, () => {})
  assert.equal(res.statusCode, 401)
})

test('valid token calls next() and attaches req.user', async () => {
  const requireAuth = createRequireAuth(async (token) => {
    assert.equal(token, 'good-token')
    return { oid: 'user-1', name: 'Ada', preferred_username: 'ada@example.com' }
  })
  const req = { headers: { authorization: 'Bearer good-token' } }
  const res = mockRes()
  let nextCalled = false
  await requireAuth(req, res, () => { nextCalled = true })
  assert.equal(nextCalled, true)
  assert.deepEqual(req.user, { oid: 'user-1', name: 'Ada', preferred_username: 'ada@example.com' })
})

test('verifyToken rejection returns 401 with a generic message', async () => {
  const requireAuth = createRequireAuth(async () => { throw new Error('jwks fetch failed: internal detail') })
  const req = { headers: { authorization: 'Bearer bad-token' } }
  const res = mockRes()
  await requireAuth(req, res, () => {})
  assert.equal(res.statusCode, 401)
  assert.equal(res.body.error, 'Invalid or expired token')
})

test('AUTH_DISABLED bypass in test env calls next() without checking the token', async (t) => {
  process.env.NODE_ENV = 'test'
  process.env.AUTH_DISABLED = 'true'
  t.after(() => { delete process.env.AUTH_DISABLED })
  const requireAuth = createRequireAuth(async () => { throw new Error('should not be called') })
  const req = { headers: {} }
  const res = mockRes()
  let nextCalled = false
  await requireAuth(req, res, () => { nextCalled = true })
  assert.equal(nextCalled, true)
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd "server" && npm test`
Expected: FAIL — `Cannot find module './authMiddleware.js'`

- [ ] **Step 4: Write minimal implementation**

Create `server/src/authMiddleware.js`:

```js
import jwksRsa from 'jwks-rsa'
import jwt from 'jsonwebtoken'

const TENANT_ID = process.env.AZURE_TENANT_ID
const SPA_CLIENT_ID = process.env.SPA_CLIENT_ID

function buildDefaultVerifyToken() {
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

  return function verifyToken(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getSigningKey,
        { audience: SPA_CLIENT_ID, issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0` },
        (err, decoded) => (err ? reject(err) : resolve(decoded))
      )
    })
  }
}

export function createRequireAuth(verifyToken) {
  return async function requireAuth(req, res, next) {
    if (process.env.NODE_ENV === 'test' && process.env.AUTH_DISABLED === 'true') {
      return next()
    }

    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) {
      return res.status(401).json({ error: 'Missing bearer token' })
    }

    try {
      const decoded = await verifyToken(token)
      req.user = { oid: decoded.oid, name: decoded.name, preferred_username: decoded.preferred_username }
      next()
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' })
    }
  }
}

export const requireAuth = createRequireAuth(buildDefaultVerifyToken())
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd "server" && npm test`
Expected: PASS (20 tests passing: 15 from Tasks 1-5 + 5 new)

- [ ] **Step 6: Commit**

```bash
git add server/src/authMiddleware.js server/src/authMiddleware.test.js server/package.json server/package-lock.json
git commit -m "feat(server): add Entra ID token verification middleware (not yet mounted)"
```

---

### Task 7: Mount auth + CORS + rate-limiting, attach client token, fix e2e config

**Files:**
- Modify: `server/index.js`
- Modify: `server/package.json` (add `express-rate-limit` dependency)
- Modify: `server/.env.example`
- Modify: `client/src/lib/provisioningApi.js`
- Modify: `client/playwright.config.js`

**Interfaces:**
- Consumes: `requireAuth` from `server/src/authMiddleware.js` (Task 6); `msalInstance`, `isMsalConfigured` from `client/src/auth/msalInstance.js` (existing); `loginRequest` from `client/src/auth/msalConfig.js` (existing).

This is the task where the server stops accepting unauthenticated requests, so the client and the e2e config must be updated in the same task to keep the app and the test suite working end-to-end.

- [ ] **Step 1: Install express-rate-limit**

```bash
cd "server" && npm install express-rate-limit
```

- [ ] **Step 2: Add a health check route, CORS origin, rate limiting, and the auth mount to index.js**

Replace the full contents of `server/index.js` with:

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

app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'request received')
  next()
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/provisioning', limiter, requireAuth, provisioningRoutes)

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  logger.info(`ShareFlow provisioning API listening on http://localhost:${PORT}`)
})
```

(`/health` is mounted before the rate limiter and auth, deliberately unauthenticated and unthrottled — Playwright uses it in Step 5 below to know when the server is ready.)

- [ ] **Step 3: Document the new env vars**

Open `server/.env.example`. Replace its full contents with:

```
# Azure AD app registration used for app-only (client credentials) access to
# Microsoft Graph. Requires the "Sites.FullControl.All" application
# permission with admin consent granted.
#
# When these are left empty, the provisioning API falls back to the
# simulated 6-step flow (no real SharePoint site is created).
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=

# The SPA's own App Registration ID (same value as the client's
# VITE_AZURE_CLIENT_ID). Used only to validate the "aud" claim of the
# user's ID token — this is a different App Registration than the one
# above, which is for the server's app-only Graph access.
SPA_CLIENT_ID=

# Origin allowed to call this API. Internal/VPN-only deployment, so a
# single trusted origin is sufficient.
CLIENT_ORIGIN=http://localhost:5173

# Optional: override the SQLite database file location (defaults to
# server/data/jobs.db).
JOBS_DB_PATH=

# Optional: pino log level (defaults to "info").
LOG_LEVEL=
```

- [ ] **Step 4: Attach the bearer token to client API calls**

Open `client/src/lib/provisioningApi.js`. Replace its full contents with:

```js
import { msalInstance, isMsalConfigured } from '../auth/msalInstance.js'
import { loginRequest } from '../auth/msalConfig.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

async function getAuthHeaders() {
  if (!isMsalConfigured) return {}
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  if (!account) return {}
  const result = await msalInstance.acquireTokenSilent({ ...loginRequest, account })
  return { Authorization: `Bearer ${result.idToken}` }
}

export async function startProvisioning(tenantConfiguration) {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/provisioning/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ tenantConfiguration }),
  })
  if (!res.ok) throw new Error(`Failed to start provisioning (${res.status})`)
  return res.json()
}

export async function getProvisioningStatus(jobId) {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/provisioning/jobs/${jobId}`, { headers: authHeaders })
  if (!res.ok) throw new Error(`Failed to fetch provisioning status (${res.status})`)
  return res.json()
}
```

- [ ] **Step 5: Make Playwright manage the backend server with test env vars**

Open `client/playwright.config.js`. Replace the `webServer` key (currently a single object) with an array of two entries:

```js
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'node index.js',
      cwd: '../server',
      url: 'http://localhost:3001/health',
      reuseExistingServer: true,
      timeout: 30_000,
      env: { ...process.env, NODE_ENV: 'test', AUTH_DISABLED: 'true', PORT: '3001' },
    },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

- [ ] **Step 6: Run the full e2e suite — this must pass before moving on**

Run: `cd "client" && npm run test:e2e`
Expected: All tests pass, including "deploy flow completes end-to-end against the provisioning API". If any provisioning-related test fails with a 401, double check that `AUTH_DISABLED` and `NODE_ENV` are both set in the `env` block in Step 5 and that `server/src/authMiddleware.js`'s bypass condition (Task 6, Step 4) checks both.

- [ ] **Step 7: Manually verify auth actually rejects unauthenticated requests outside test mode**

Run the server without the test bypass:

```bash
cd "server" && npm start
```

In a second terminal:

```bash
curl -i -X POST http://localhost:3001/api/provisioning/jobs -H "Content-Type: application/json" -d "{\"tenantConfiguration\":{\"siteName\":\"Test\"}}"
```

Expected: HTTP `401` with body `{"error":"Missing bearer token"}`. Stop the server with Ctrl+C in the first terminal.

- [ ] **Step 8: Commit**

```bash
git add server/index.js server/.env.example server/package.json server/package-lock.json client/src/lib/provisioningApi.js client/playwright.config.js
git commit -m "feat: require Entra ID auth on provisioning API, add CORS/rate-limit, fix e2e"
```

---

## Self-Review Notes

**Spec coverage:**
- Auth via Entra ID ID token verification → Tasks 6, 7 ✅
- Request validation (Zod) → Task 3 ✅
- SQLite persistence with the documented "no auto-resume" limitation → Tasks 4, 5 ✅
- Rate limiting → Task 7 ✅
- CORS restricted to configurable origin → Task 7 ✅
- Structured logging (pino) → Tasks 1, 5 ✅
- `resolveSiteName` DRY refactor → Task 2 ✅
- `SPA_CLIENT_ID` correction (separate from app-only `AZURE_CLIENT_ID`) → Task 6, 7 ✅
- Client sends bearer token → Task 7 ✅
- e2e test fix for the new auth requirement → Task 7 ✅
- Out-of-scope items (auto-resume, per-user authz, log shipping, internet-hardened CORS/rate-limits) intentionally have no task — consistent with spec.

**Type/interface consistency:** `persistJob`/`loadJob` field names match between Task 4's definition and Task 5's usage (`currentStep`, `totalSteps`, `tenantConfiguration`, `siteId`, `siteUrl`, `createdAt` — all camelCase at the JS boundary, snake_case only inside SQL). `createRequireAuth`/`requireAuth` names match between Task 6's definition and Task 7's import. `resolveSiteName` signature (`siteName => string`) is consistent between Task 2's definition and its use inside `slugify`, `createSharePointSite`, `configurePages`.

**No placeholders:** all steps contain literal file contents and exact commands; no "TBD" or "add appropriate X" phrasing remains.
