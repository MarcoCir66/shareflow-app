# Unit Tests Design (Phase 4, sub-project 2)

**Goal:** Add unit test coverage for the two pieces of ShareFlow's logic with the highest behavioral risk and the lowest existing coverage: the client's configurator reducer (and the pure helpers it depends on), and the server's provisioning job state machine.

## Context

ShareFlow has solid e2e coverage (24 Playwright tests) and, since the backend-hardening phase, solid server unit coverage for the newer modules (`logger`, `schemas`, `jobStore`, `authMiddleware`). Two areas remain effectively untested at the unit level:

- **`client/src/context/configuratorReducer.js`** (315 lines, 18 action types) plus its two pure helper modules, `pageHelpers.js` (175 lines) and `sectionHelpers.js` (64 lines). This is the single largest piece of pure business logic in the client, and currently has zero unit tests — only indirect, partial coverage through e2e flows that happen to exercise a subset of actions.
- **`server/src/provisioningJobs.js`**'s actual state machine (`createJob` → `runStep` → `done`/`error`, and `getJob`'s in-memory/SQLite fallback). The existing `provisioningJobs.test.js` (added during backend hardening) only tests the `resolveSiteName` helper extracted in that phase — the state machine itself has no unit tests, only indirect e2e coverage of the happy path.

The client has no unit test runner today (only `@playwright/test` for e2e). The server already uses `node:test` + `node:assert/strict` (added during backend hardening, YAGNI — no new framework needed there).

## Architecture

Two independent pieces of work, each adding tests only — no production behavior changes except one: a single env-var-driven timer override in `provisioningJobs.js` to keep state-machine tests fast.

### Part 1: Client — Vitest + reducer/helper tests

Add Vitest as the client's unit test runner (`vitest`, dev dependency). It reads the project's existing `vite.config.js` automatically, so no parallel config is needed. New npm script: `"test:unit": "vitest run"` in `client/package.json` (`vitest` with no `run` watches by default — CI/non-interactive use needs `run`).

Test files, colocated with their source (mirroring the server's existing pattern of `foo.js` + `foo.test.js` side by side):
- `client/src/context/configuratorReducer.test.js`
- `client/src/context/pageHelpers.test.js`
- `client/src/context/sectionHelpers.test.js`

**Reducer test coverage** — one test per action type covering its primary behavior, plus dedicated tests for the action types with non-trivial logic:
- `MOVE_PAGE`: re-parenting via `moveSubtree` + `resolveParentAtDepth`, including a no-op case (moving a page to its current position returns the same state reference)
- `RENAME_PAGE`: slug uniqueness via `uniqueSlug`, legacy string-title normalization to the multilingual `{ it, en, fr, de }` shape, empty-title-after-trim guard (no-op)
- `CHANGE_SECTION_LAYOUT`: column-count increase (new empty columns appended) and decrease (overflow widgets redistributed into the last kept column)
- Guard clauses that return the unmodified state: `REMOVE_SECTION` on a non-empty section, `REMOVE_SECTION` on the last remaining section, `REMOVE_PAGE` on a page with children, `REMOVE_PAGE` when it's the only page, `ADD_WIDGET`/`REMOVE_WIDGET`/`MOVE_WIDGET`/`UPDATE_WIDGET_PROP` with an unresolvable id/blockId
- Simple actions (`SELECT_WIDGET`, `DESELECT_WIDGET`, `SELECT_SECTION`, `SELECT_PAGE`, `SET_TENANT_META`, `EXPORT_CONFIGURATION`, `ADD_SECTION`, `ADD_PAGE`): one straightforward test each, asserting the specific state fields the action is documented to change

Each test builds a small, purpose-built state object (not the full `initialState`) and asserts only the fields relevant to that action — no whole-tree snapshot assertions, so a test failure points at the actual behavioral change.

**Helper test coverage:**
- `pageHelpers.test.js`: `slugify`, `uniqueSlug` (collision handling), `hasChildren`, `getSubtreeEndIndex`, `moveSubtree` (valid move, no-op/same-position move, moving a subtree past its own descendants), `resolveParentAtDepth`, `buildTenantExport`
- `sectionHelpers.test.js`: `findWidgetLocation` (found, not found), `mapColumn` (column found and transformed, column not found returns sections unchanged)

### Part 2: Server — provisioning job state machine tests

**Production change (the only one in this sub-project):** in `server/src/provisioningJobs.js`, change:

```js
const STEP_DELAY_MS = 900
```

to:

```js
const STEP_DELAY_MS = Number(process.env.PROVISIONING_STEP_DELAY_MS ?? 900)
```

Read once at module load, same pattern already used for `JOBS_DB_PATH` and `LOG_LEVEL`. Production behavior is unchanged (default stays 900ms); tests set `PROVISIONING_STEP_DELAY_MS=5` before importing the module, the same way `provisioningJobs.test.js` already sets `JOBS_DB_PATH` before import.

**New tests in `provisioningJobs.test.js`** (appended to the existing `resolveSiteName` tests):
- `createJob` returns a job with `status: 'running'`, `currentStep: 0`, `totalSteps: 6`, and the given `tenantConfiguration`; the job is persisted immediately (verified via `loadJob` from `jobStore.js`, not by re-implementing SQL assertions)
- Full lifecycle: a job created without `AZURE_TENANT_ID`/`AZURE_CLIENT_ID`/`AZURE_CLIENT_SECRET` set (so `isGraphConfigured()` is `false` and every step takes the simulated/no-op branch) reaches `status: 'done'` with a `result.siteUrl` matching the `https://contoso.sharepoint.com/sites/<slug>` shape, polled with the reduced delay (test completes in well under 100ms)
- `getJob` returns the in-memory job while it's still active (object identity or field equality with the live job)
- `getJob` falls back to `loadJob` (SQLite) for an id removed from the in-memory map — simulates the post-restart recovery path added in the backend-hardening phase

No test covers the Graph-failure error path in this sub-project. Triggering it deterministically needs either Node's `mock.module()` (still experimental on Node 24 — requires `--experimental-test-module-mocks`, which would apply to the whole test run, not just this test) or a dependency-injection refactor of `provisioningJobs.js`'s internal step functions purely to enable one test. Neither is proportionate to this one edge case, so it's left uncovered by unit tests for now; the `catch` block itself (`logger.error` + `job.status = 'error'` + `persistJob(job)`) is a small, directly-readable piece of code, and the happy-path and persistence-fallback tests already exercise everything else `runStep` touches.

## Testing

- Client: `cd client && npm run test:unit` — new command, runs once (not watch mode), exits non-zero on failure
- Server: `cd server && npm test` — existing command, now includes the new `provisioningJobs.test.js` cases alongside everything from backend hardening
- Existing e2e suite (`cd client && npm run test:e2e`) is run once at the end as a regression check — this sub-project changes no runtime behavior reachable from the UI or API (the `STEP_DELAY_MS` change only affects a value read from an env var that's unset in normal operation, so the default 900ms is unchanged), so the e2e suite should pass unmodified

## Files Created/Modified

| File | Purpose |
|---|---|
| `client/package.json` | Add `vitest` devDependency, add `test:unit` script |
| `client/src/context/configuratorReducer.test.js` | New — reducer tests |
| `client/src/context/pageHelpers.test.js` | New — helper tests |
| `client/src/context/sectionHelpers.test.js` | New — helper tests |
| `server/src/provisioningJobs.js` | `STEP_DELAY_MS` becomes env-var-overridable (default unchanged) |
| `server/src/provisioningJobs.test.js` | Add state-machine lifecycle tests |

## Out of Scope

- Coverage tooling/enforced thresholds (e.g. `vitest --coverage`, `c8`) — explicitly deferred; this sub-project adds targeted tests, not coverage measurement infrastructure
- Unit tests for React components (`ConfiguratorContext.jsx` or any UI component) — out of scope for this sub-project, which is reducer/helpers + job state machine only, per the Phase 4 plan
- Unit tests for `msalClient.js`/`graphClient.js` themselves — these are thin wrappers around Azure SDKs; the provisioning state machine tests mock them at the boundary rather than testing them directly
- Any change to the simulated-vs-real-Graph branching logic, or to `STEP_COUNT`/the step sequence itself
