# Phase 2 Native Web Parts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Map 7 ShareFlow blocks to native SP web parts (zero PnP) and add `multilingua` as a semantic MLP activation flag.

**Architecture:** Same pattern as Phase 1 — add GUID constants and mapper functions to `blockToWebpart.js`, update `pageFlags` in `pageBuilder.js`, add MLP activation to `provisioningJobs.js`. All new mappers follow the existing `node()` helper pattern.

**Tech Stack:** Node.js ESM, Microsoft Graph API (beta), SharePoint REST API, node:test built-in runner.

## Global Constraints

- ESM only — no `require()`, no CommonJS.
- Test runner: `cd server && node --test src/blockToWebpart.test.js` (or `src/**/*.test.js` for all).
- Never add `node_modules`, `.env`, or compiled files to git.
- All GUID strings are lowercase hyphenated, verified from the tenant toolbox React fiber.
- MLP activation is non-blocking — wrap in `try/catch`, log warning on failure, never throw.
- No new npm dependencies.

---

## File Map

| File | Role |
|---|---|
| `server/src/blockToWebpart.js` | Add 5 GUIDs, 5 mappers, 7 MAPPINGS entries, extend SEMANTIC_PAGE_FLAGS |
| `server/src/blockToWebpart.test.js` | 9 new tests (7 mappers + 2 semantic) |
| `server/src/pageBuilder.js` | Add `mlpEnabled` to `pageFlags`, update JSDoc |
| `server/src/pageBuilder.test.js` | 3 new tests for mlpEnabled |
| `server/src/provisioningJobs.js` | Add MLP activation block after commentsDisabled PATCH |

---

### Task 1: Phase 2 mappers in blockToWebpart.js

**Files:**
- Modify: `server/src/blockToWebpart.js`
- Test: `server/src/blockToWebpart.test.js`

**Interfaces:**
- Produces: `mapBlock({ blockId: 'organigramma' })` → node with `webPartType: 'e84a8ca2-...'`; same pattern for all 7 new blocks. `SEMANTIC_PAGE_FLAGS` array now includes `'multilingua'`.

- [ ] **Step 1: Write failing tests**

Open `server/src/blockToWebpart.test.js`. Inside the `describe('mapBlock', ...)` block, after the last existing `it(...)`, add:

```js
  it('maps organigramma to Org Chart web part', () => {
    const result = mapBlock({ blockId: 'organigramma' })
    assert.ok(result)
    assert.equal(result.webPartType, 'e84a8ca2-f63c-4fb9-bc0b-d8eef5ccb22b')
    assert.equal(result.data.properties.datasource, 'graph')
  })

  it('maps countdown-lancio with targetDate and label from props', () => {
    const result = mapBlock({ blockId: 'countdown-lancio', props: { targetDate: '2026-12-31', label: 'Lancio' } })
    assert.ok(result)
    assert.equal(result.webPartType, '62cac389-787f-495d-beca-e11786162ef4')
    assert.equal(result.data.properties.date, '2026-12-31')
    assert.equal(result.data.properties.message, 'Lancio')
  })

  it('maps procedure with list URL from dataSource', () => {
    const result = mapBlock({ blockId: 'procedure', dataSource: { url: 'https://shareflowit.sharepoint.com/sites/test/Lists/Procedure' } })
    assert.ok(result)
    assert.equal(result.webPartType, 'f92bf067-bc19-489e-a556-7fe95f508720')
    assert.equal(result.data.properties.webUrl, 'https://shareflowit.sharepoint.com/sites/test/Lists/Procedure')
  })

  it('maps meteo with city from props', () => {
    const result = mapBlock({ blockId: 'meteo', props: { city: 'Milano' } })
    assert.ok(result)
    assert.equal(result.webPartType, '868ac3c3-cad7-4bd6-9a1c-14dc5cc8e823')
    assert.equal(result.data.properties.city, 'Milano')
  })

  it('maps fusi-orari with timezones array from props', () => {
    const result = mapBlock({ blockId: 'fusi-orari', props: { timezones: ['Europe/Rome', 'America/New_York'] } })
    assert.ok(result)
    assert.equal(result.webPartType, '81b57906-cbed-4bb1-9823-2e3314f46f28')
    assert.deepEqual(result.data.properties.clocks, ['Europe/Rome', 'America/New_York'])
  })

  it('maps sezione-fiere to Highlighted Content (same GUID as carosello-contenuti)', () => {
    const result = mapBlock({ blockId: 'sezione-fiere' })
    assert.ok(result)
    assert.equal(result.webPartType, 'daf0b71c-6de8-4ef7-b511-faae7c388708')
  })

  it('maps sezione-mostre to Highlighted Content (same GUID as sezione-fiere)', () => {
    const result = mapBlock({ blockId: 'sezione-mostre' })
    assert.ok(result)
    assert.equal(result.webPartType, 'daf0b71c-6de8-4ef7-b511-faae7c388708')
  })
```

Inside the `describe('SEMANTIC_PAGE_FLAGS', ...)` block, after the last existing `it(...)`, add:

```js
  it('includes multilingua', () => {
    assert.ok(SEMANTIC_PAGE_FLAGS.includes('multilingua'))
  })

  it('mapBlock returns null for multilingua (semantic block — no WP node)', () => {
    assert.equal(mapBlock({ blockId: 'multilingua' }), null)
  })
```

- [ ] **Step 2: Run tests — confirm 9 failures**

```
cd server && node --test src/blockToWebpart.test.js
```

Expected: 9 new failures (all say `null` is not a valid result or wrong GUID).

- [ ] **Step 3: Add GUIDs and mappers to blockToWebpart.js**

In `server/src/blockToWebpart.js`, add to the `WP` constant object (after `PEOPLE`):

```js
  ORG_CHART:   'e84a8ca2-f63c-4fb9-bc0b-d8eef5ccb22b',
  COUNTDOWN:   '62cac389-787f-495d-beca-e11786162ef4',
  LIST:        'f92bf067-bc19-489e-a556-7fe95f508720',
  WEATHER:     '868ac3c3-cad7-4bd6-9a1c-14dc5cc8e823',
  WORLD_CLOCK: '81b57906-cbed-4bb1-9823-2e3314f46f28',
```

After the existing `peopleMapper` function, add these 5 mapper functions:

```js
function orgChartMapper(_block) {
  return node(WP.ORG_CHART, 'Organigramma', {
    datasource: 'graph',
    viewType: 'people',
  })
}

function countdownMapper(block) {
  return node(WP.COUNTDOWN, 'Timer conto alla rovescia', {
    date: block.props?.targetDate ?? '',
    message: block.props?.label ?? '',
  })
}

function listMapper(block) {
  const url = block.dataSource?.url ?? ''
  return node(WP.LIST, 'Elenco', {
    webUrl: url,
    listId: '',
    showDefaultList: !url,
  })
}

function weatherMapper(block) {
  return node(WP.WEATHER, 'Meteo', {
    city: block.props?.city ?? '',
    unit: 'celsius',
  })
}

function worldClockMapper(block) {
  return node(WP.WORLD_CLOCK, 'Orologio mondiale', {
    clocks: block.props?.timezones ?? [],
  })
}
```

In the `MAPPINGS` constant, add these 7 entries (after `'feedback-utenti'`):

```js
  'organigramma':     orgChartMapper,
  'countdown-lancio': countdownMapper,
  'procedure':        listMapper,
  'meteo':            weatherMapper,
  'fusi-orari':       worldClockMapper,
  'sezione-fiere':    highlightedContentMapper,
  'sezione-mostre':   highlightedContentMapper,
```

Change the `SEMANTIC_PAGE_FLAGS` export from:

```js
export const SEMANTIC_PAGE_FLAGS = ['commenti-contenuto', 'like-contenuto']
```

to:

```js
export const SEMANTIC_PAGE_FLAGS = ['commenti-contenuto', 'like-contenuto', 'multilingua']
```

- [ ] **Step 4: Run tests — confirm all pass**

```
cd server && node --test src/blockToWebpart.test.js
```

Expected output (last lines):
```
ℹ pass 22
ℹ fail 0
```

- [ ] **Step 5: Commit**

```
git add server/src/blockToWebpart.js server/src/blockToWebpart.test.js
git commit -m "feat: Phase 2 native WP mappers — organigramma, countdown, list, weather, world-clock, sezione-fiere/mostre, multilingua semantic"
```

---

### Task 2: mlpEnabled in pageBuilder.js

**Files:**
- Modify: `server/src/pageBuilder.js`
- Test: `server/src/pageBuilder.test.js`

**Interfaces:**
- Consumes: `SEMANTIC_PAGE_FLAGS` from Task 1 (now includes `'multilingua'`).
- Produces: `buildCanvasLayout(page)` returns `{ canvasLayout, unmappedBlocks, pageFlags }` where `pageFlags` now has `mlpEnabled: boolean`. Used by Task 3.

- [ ] **Step 1: Write failing tests**

Open `server/src/pageBuilder.test.js`. Inside the `describe('buildCanvasLayout', ...)` block, after the last existing `it(...)` (line 112), add:

```js
  it('returns pageFlags.mlpEnabled true when multilingua block is present', () => {
    const page = makePage('oneColumn', [{ blockId: 'multilingua' }])
    const { pageFlags } = buildCanvasLayout(page)
    assert.equal(pageFlags.mlpEnabled, true)
    assert.equal(pageFlags.commentsEnabled, false)
  })

  it('returns pageFlags.mlpEnabled false when multilingua is absent', () => {
    const page = makePage('oneColumn', [{ blockId: 'news-corporate', props: {} }])
    const { pageFlags } = buildCanvasLayout(page)
    assert.equal(pageFlags.mlpEnabled, false)
  })

  it('silently skips multilingua — no placeholder, not in unmappedBlocks, produces no WP node', () => {
    const page = makePage('oneColumn', [
      { blockId: 'multilingua' },
      { blockId: 'news-corporate', props: {} },
    ])
    const { canvasLayout, unmappedBlocks } = buildCanvasLayout(page)
    assert.equal(unmappedBlocks.includes('multilingua'), false)
    const webparts = canvasLayout.horizontalSections[0].columns[0].webparts
    assert.equal(webparts.length, 1)
    assert.equal(webparts[0].webPartType, '8c88f208-6c77-4bdb-86a0-0c47b4316588')
  })
```

- [ ] **Step 2: Run tests — confirm 3 failures**

```
cd server && node --test src/pageBuilder.test.js
```

Expected: 3 new failures — `pageFlags.mlpEnabled` is `undefined` in all three new tests.

- [ ] **Step 3: Add mlpEnabled to pageFlags in pageBuilder.js**

In `server/src/pageBuilder.js`, find the `pageFlags` object (lines 66-69):

```js
  const pageFlags = {
    commentsEnabled:  allWidgetIds.includes('commenti-contenuto'),
    reactionsEnabled: allWidgetIds.includes('like-contenuto'),
  }
```

Replace it with:

```js
  const pageFlags = {
    commentsEnabled:  allWidgetIds.includes('commenti-contenuto'),
    reactionsEnabled: allWidgetIds.includes('like-contenuto'),
    mlpEnabled:       allWidgetIds.includes('multilingua'),
  }
```

Also update the JSDoc `@returns` on line 55 from:

```js
 * @returns {{ canvasLayout: object, unmappedBlocks: string[], pageFlags: { commentsEnabled: boolean, reactionsEnabled: boolean } }}
```

to:

```js
 * @returns {{ canvasLayout: object, unmappedBlocks: string[], pageFlags: { commentsEnabled: boolean, reactionsEnabled: boolean, mlpEnabled: boolean } }}
```

- [ ] **Step 4: Run tests — confirm all pass**

```
cd server && node --test src/pageBuilder.test.js
```

Expected:
```
ℹ pass 19
ℹ fail 0
```

- [ ] **Step 5: Run full suite to confirm no regressions**

```
cd server && node --test src/blockToWebpart.test.js src/pageBuilder.test.js src/provisioningJobs.test.js src/spBranding.test.js
```

Expected: all pass, 0 failures.

- [ ] **Step 6: Commit**

```
git add server/src/pageBuilder.js server/src/pageBuilder.test.js
git commit -m "feat: add mlpEnabled to pageFlags — triggered by multilingua block"
```

---

### Task 3: MLP activation in provisioningJobs.js

**Files:**
- Modify: `server/src/provisioningJobs.js`

**Interfaces:**
- Consumes: `pageFlags.mlpEnabled` from Task 2; `getSharePointAccessToken` already imported at line 3; `job.siteUrl` already available inside `configurePages`.
- Produces: when `pageFlags.mlpEnabled === true`, attempts `POST /_api/site/features/add(...)` on the SP site. Non-blocking — logs warning on failure.

No unit test is possible for this task (requires a live SP connection). The success criterion is the code being present and not breaking the existing `provisioningJobs.test.js` suite.

- [ ] **Step 1: Locate the insertion point**

In `server/src/provisioningJobs.js`, find the block starting at ~line 424:

```js
    // Apply page-level settings derived from semantic blocks
    try {
      await job.graphClient
        .api(`/sites/${job.siteId}/pages/${pageId}/microsoft.graph.sitePage`)
        .version('beta')
        .patch({ commentsDisabled: !pageFlags.commentsEnabled })
    } catch (e) {
      logger.warn({ err: e.message, pageId }, 'commentsDisabled patch skipped')
    }
```

The MLP activation block goes immediately **after** this `try/catch`.

- [ ] **Step 2: Add MLP activation block**

Insert this code directly after the commentsDisabled `try/catch`:

```js
    // Activate Multilingual Pages (MLP) site feature when multilingua block is present
    if (pageFlags.mlpEnabled) {
      try {
        const spHostname = new URL(job.siteUrl).hostname
        const spToken = await getSharePointAccessToken(spHostname)
        // Feature GUID for SP Multilingual User Interface (site collection scope)
        const mlpFeatureId = '24611c05-ee19-45da-955f-6602264abaf8'
        const resp = await fetch(
          `${job.siteUrl}/_api/site/features/add('${mlpFeatureId}', 0, 15)`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${spToken}`,
              Accept: 'application/json;odata=nometadata',
              'Content-Type': 'application/json;odata=nometadata',
            },
          }
        )
        if (!resp.ok) {
          const body = await resp.text()
          logger.warn({ status: resp.status, body: body.substring(0, 200) }, 'MLP feature activation failed')
        } else {
          logger.info({ pageId, siteUrl: job.siteUrl }, 'MLP feature activated')
        }
      } catch (e) {
        logger.warn({ err: e.message }, 'MLP activation skipped')
      }
    }
```

- [ ] **Step 3: Run existing test suite — confirm no regressions**

```
cd server && node --test src/provisioningJobs.test.js
```

Expected: all existing tests pass (MLP block is inside `if (pageFlags.mlpEnabled)` which is `false` in all test scenarios).

- [ ] **Step 4: Run full suite**

```
cd server && node --test src/blockToWebpart.test.js src/pageBuilder.test.js src/provisioningJobs.test.js src/spBranding.test.js
```

Expected: all pass, 0 failures.

- [ ] **Step 5: Commit**

```
git add server/src/provisioningJobs.js
git commit -m "feat: activate SP MLP feature during provisioning when multilingua block is present"
```

---

## Verification after all tasks

Run full test suite:

```
cd server && node --test src/blockToWebpart.test.js src/pageBuilder.test.js src/provisioningJobs.test.js src/spBranding.test.js
```

Expected final counts:
- `blockToWebpart.test.js`: 22 pass
- `pageBuilder.test.js`: 19 pass
- `provisioningJobs.test.js`: existing count unchanged
- `spBranding.test.js`: existing count unchanged
- **0 failures total**
