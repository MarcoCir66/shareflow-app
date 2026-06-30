# Block Migration Phase 1 Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Phase 1 SharePoint provisioning pipeline with 2 reclassified block mappers, semantic page-level handling for `commenti-contenuto` / `like-contenuto`, and a SP constraint badge in the Shareflow config panel.

**Architecture:** `blockToWebpart.js` gains two new mappers and a `SEMANTIC_PAGE_FLAGS` export; `pageBuilder.js` imports that export to skip semantic blocks silently and returns a `pageFlags` object; `provisioningJobs.js` uses `pageFlags` to PATCH page `commentsDisabled`; the client `ToggleField` component gains an optional `spNote` prop rendered as a badge+tooltip.

**Tech Stack:** Node.js (server, ESM, `node:test`), React + Tailwind (client), Microsoft Graph API beta.

## Global Constraints

- Server: ESM (`import`/`export`), no CommonJS. Test runner: `node --test src/**/*.test.js` from the `server/` directory.
- All new web part GUIDs must be verified against a live SP tenant before use (see Task 1).
- Surgical changes only — do not refactor callers of `buildCanvasLayout` beyond adding `pageFlags` destructuring where needed.
- `SEMANTIC_PAGE_FLAGS` contains only Phase 1 blocks; `multilingua` (Phase 2) is NOT included.
- ToggleField changes must not break existing prop toggles — `spNote` is optional, defaults to null.

---

## File Map

| File | Change |
|---|---|
| `server/src/blockToWebpart.js` | Add `WP.PEOPLE`, `peopleMapper`, update MAPPINGS, add `SEMANTIC_PAGE_FLAGS` export |
| `server/src/blockToWebpart.test.js` | Add tests for `contatti-chiave`, `feedback-utenti`, `SEMANTIC_PAGE_FLAGS` |
| `server/src/pageBuilder.js` | Import `SEMANTIC_PAGE_FLAGS`, skip semantic blocks in reduce, return `pageFlags` |
| `server/src/pageBuilder.test.js` | Add tests for semantic block skip behavior and `pageFlags` return |
| `server/src/provisioningJobs.js` | Destructure `pageFlags` from `buildCanvasLayout`, PATCH `commentsDisabled` after pageId known |
| `server/src/provisioningJobs.test.js` | Add test for `commentsDisabled` PATCH call when commenti-contenuto block present |
| `client/src/components/sidebar-right/ToggleField.jsx` | Add optional `spNote` prop — renders SP badge chip + tooltip |
| `client/src/components/sidebar-right/PropertiesPanel.jsx` | Add `SP_UNSUPPORTED_PROPS` map, pass `spNote` to ToggleField for matching prop keys |

---

## Task 1: Verify missing web part GUIDs

**Files:**
- Modify: `server/src/blockToWebpart.js` (WP constants only)

**Interfaces:**
- Produces: `WP.PEOPLE` constant verified and correct in `blockToWebpart.js`

This task is manual — it requires a live SharePoint tenant. Complete it before Task 2.

- [ ] **Step 1: Add a People web part to a modern SP page in your test tenant**

  In SharePoint, edit any modern page → click the `+` to add a web part → search for "People" → add it → save the page.

- [ ] **Step 2: Extract the GUID via Graph API**

  Run this in the browser console (on the SP tenant) or via Graph Explorer:

  ```
  GET https://graph.microsoft.com/beta/sites/{siteId}/pages/{pageId}?$expand=canvasLayout
  ```

  Find the People web part node in `canvasLayout.horizontalSections[*].columns[*].webparts` and copy its `webPartType` GUID.

- [ ] **Step 3: Update the WP constants in blockToWebpart.js**

  In `server/src/blockToWebpart.js`, in the `const WP = { ... }` block, add the verified GUID:

  ```js
  const WP = {
    NEWS:               '8c88f208-6c77-4bdb-86a0-0c47b4316588',
    GROUP_CALENDAR:     '6676088b-e28e-4a90-b9cb-d0d0303cd2eb',
    QUICK_LINKS:        'c70391ea-0b10-4ee9-b2b4-006d3fcad0cd',
    TEXT:               '1ef5ed11-ce7b-44be-bc5e-4abd55101d16',
    BUTTON:             '0f087d7f-520e-42b7-89c0-1b892b68ca60',
    EMBED:              '490d7c76-1824-45b2-9de3-676421c997fa',
    DOCUMENT_LIBRARY:   'c9335c66-4e64-4c0c-a53b-63e1a32a7a5e',
    HIGHLIGHTED_CONTENT:'e377ea37-9047-43b9-8cdb-a761be2f8e09',
    FORMS:              'b19b3b9e-8d13-4fec-a93c-401a091c0099',
    STREAM:             '275c0095-a77e-4f6d-a2a0-6a7626911518',
    SEARCH_BOX:         '8f94f9ea-6fba-4aba-90f6-b21bdba5a0bd',
    PEOPLE:             '<GUID-FROM-STEP-2>',   // ← replace with verified GUID
  }
  ```

  Also, while in this file, verify `WP.HIGHLIGHTED_CONTENT` by adding a Highlighted Content web part to the same test page and extracting its GUID. Update if different from `e377ea37-9047-43b9-8cdb-a761be2f8e09`.

- [ ] **Step 4: Commit**

  ```bash
  git add server/src/blockToWebpart.js
  git commit -m "fix: add verified People WP GUID to blockToWebpart constants"
  ```

---

## Task 2: Add `contatti-chiave` and `feedback-utenti` mappers

**Files:**
- Modify: `server/src/blockToWebpart.js`
- Modify: `server/src/blockToWebpart.test.js`

**Interfaces:**
- Consumes: `WP.PEOPLE` from Task 1 (must be verified before this task)
- Consumes: `WP.FORMS`, `formsMapper` — already exist in the file
- Produces: `mapBlock({ blockId: 'contatti-chiave' })` → People WP node
- Produces: `mapBlock({ blockId: 'feedback-utenti' })` → Forms WP node (same as polls-survey)

- [ ] **Step 1: Write the failing tests**

  In `server/src/blockToWebpart.test.js`, add inside the existing `describe('mapBlock', ...)` block:

  ```js
  it('maps contatti-chiave to People web part', () => {
    const result = mapBlock({ blockId: 'contatti-chiave', props: {} })
    assert.ok(result, 'result should not be null')
    assert.equal(result.webPartType, WP_PEOPLE_GUID) // set this const to your verified GUID
    assert.ok(Array.isArray(result.data.properties.persons))
  })

  it('maps feedback-utenti to Forms web part', () => {
    const result = mapBlock({ blockId: 'feedback-utenti', props: {}, dataSource: { url: 'https://forms.office.com/r/abc' } })
    assert.ok(result)
    assert.equal(result.webPartType, 'b19b3b9e-8d13-4fec-a93c-401a091c0099')
    assert.equal(result.data.properties.formUrl, 'https://forms.office.com/r/abc')
  })
  ```

  Add at the top of the test file:
  ```js
  const WP_PEOPLE_GUID = '<your-verified-GUID-from-Task-1>'
  ```

- [ ] **Step 2: Run tests to verify they fail**

  ```bash
  cd server && node --test src/blockToWebpart.test.js
  ```

  Expected: 2 failing tests — `contatti-chiave` and `feedback-utenti` return null.

- [ ] **Step 3: Add `peopleMapper` and update MAPPINGS in `blockToWebpart.js`**

  After the `searchBoxMapper` function, add:

  ```js
  function peopleMapper(_block) {
    return node(WP.PEOPLE, 'People', {
      persons: [],
      layout: 0,
      hideEmptyFields: false,
    })
  }
  ```

  In the `MAPPINGS` object, add:

  ```js
  'contatti-chiave':  peopleMapper,
  'feedback-utenti':  formsMapper,
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  cd server && node --test src/blockToWebpart.test.js
  ```

  Expected: all tests pass including the two new ones.

- [ ] **Step 5: Commit**

  ```bash
  git add server/src/blockToWebpart.js server/src/blockToWebpart.test.js
  git commit -m "feat: map contatti-chiave to People WP and feedback-utenti to Forms WP"
  ```

---

## Task 3: `SEMANTIC_PAGE_FLAGS` + pageBuilder silent skip + `pageFlags` return

**Files:**
- Modify: `server/src/blockToWebpart.js`
- Modify: `server/src/blockToWebpart.test.js`
- Modify: `server/src/pageBuilder.js`
- Modify: `server/src/pageBuilder.test.js`

**Interfaces:**
- Produces: `SEMANTIC_PAGE_FLAGS` — exported string array from `blockToWebpart.js`
- Produces: `buildCanvasLayout(page, ctx)` now returns `{ canvasLayout, unmappedBlocks, pageFlags }` where `pageFlags = { commentsEnabled: boolean, reactionsEnabled: boolean }`
- Constraint: `commenti-contenuto` and `like-contenuto` must NOT appear in `unmappedBlocks[]` and must NOT produce a placeholder text node in `canvasLayout`

- [ ] **Step 1: Write failing tests for `SEMANTIC_PAGE_FLAGS` export**

  In `server/src/blockToWebpart.test.js`, add a new describe block:

  ```js
  import { mapBlock, SEMANTIC_PAGE_FLAGS } from './blockToWebpart.js'

  describe('SEMANTIC_PAGE_FLAGS', () => {
    it('exports an array', () => {
      assert.ok(Array.isArray(SEMANTIC_PAGE_FLAGS))
    })

    it('includes commenti-contenuto and like-contenuto', () => {
      assert.ok(SEMANTIC_PAGE_FLAGS.includes('commenti-contenuto'))
      assert.ok(SEMANTIC_PAGE_FLAGS.includes('like-contenuto'))
    })

    it('mapBlock returns null for semantic blocks (they are not mapped as WP nodes)', () => {
      assert.equal(mapBlock({ blockId: 'commenti-contenuto' }), null)
      assert.equal(mapBlock({ blockId: 'like-contenuto' }), null)
    })
  })
  ```

- [ ] **Step 2: Write failing tests for pageBuilder semantic skip behavior**

  In `server/src/pageBuilder.test.js`, add inside the existing `describe('buildCanvasLayout', ...)` block:

  ```js
  it('silently skips commenti-contenuto — no placeholder, not in unmappedBlocks', () => {
    const page = makePage('oneColumn', [
      { blockId: 'commenti-contenuto' },
      { blockId: 'news-corporate', props: {} },
    ])
    const { canvasLayout, unmappedBlocks } = buildCanvasLayout(page)
    assert.equal(unmappedBlocks.includes('commenti-contenuto'), false)
    const webparts = canvasLayout.horizontalSections[0].columns[0].webparts
    assert.equal(webparts.length, 1, 'only news-corporate should produce a WP node')
    assert.equal(webparts[0].webPartType, '8c88f208-6c77-4bdb-86a0-0c47b4316588')
  })

  it('silently skips like-contenuto — no placeholder, not in unmappedBlocks', () => {
    const page = makePage('oneColumn', [{ blockId: 'like-contenuto' }])
    const { canvasLayout, unmappedBlocks } = buildCanvasLayout(page)
    assert.equal(unmappedBlocks.includes('like-contenuto'), false)
    assert.equal(canvasLayout.horizontalSections[0].columns[0].webparts.length, 0)
  })

  it('returns pageFlags.commentsEnabled true when commenti-contenuto is present', () => {
    const page = makePage('oneColumn', [{ blockId: 'commenti-contenuto' }])
    const { pageFlags } = buildCanvasLayout(page)
    assert.equal(pageFlags.commentsEnabled, true)
    assert.equal(pageFlags.reactionsEnabled, false)
  })

  it('returns pageFlags.reactionsEnabled true when like-contenuto is present', () => {
    const page = makePage('oneColumn', [{ blockId: 'like-contenuto' }])
    const { pageFlags } = buildCanvasLayout(page)
    assert.equal(pageFlags.commentsEnabled, false)
    assert.equal(pageFlags.reactionsEnabled, true)
  })

  it('returns pageFlags with both false when neither semantic block is present', () => {
    const page = makePage('oneColumn', [{ blockId: 'news-corporate', props: {} }])
    const { pageFlags } = buildCanvasLayout(page)
    assert.equal(pageFlags.commentsEnabled, false)
    assert.equal(pageFlags.reactionsEnabled, false)
  })
  ```

- [ ] **Step 3: Run tests to verify they fail**

  ```bash
  cd server && node --test src/blockToWebpart.test.js src/pageBuilder.test.js
  ```

  Expected: 8 new failing tests.

- [ ] **Step 4: Add `SEMANTIC_PAGE_FLAGS` export to `blockToWebpart.js`**

  At the bottom of `server/src/blockToWebpart.js`, after the `MAPPED_BLOCK_IDS` export, add:

  ```js
  export const SEMANTIC_PAGE_FLAGS = ['commenti-contenuto', 'like-contenuto']
  ```

- [ ] **Step 5: Update `pageBuilder.js` to import flag, skip semantic blocks, and return `pageFlags`**

  Replace the current import line at the top of `server/src/pageBuilder.js`:

  ```js
  import { mapBlock, SEMANTIC_PAGE_FLAGS } from './blockToWebpart.js'
  ```

  In `buildCanvasLayout`, add the flag scan immediately after the opening line of the function body (before the `horizontalSections` map):

  ```js
  export function buildCanvasLayout(page, ctx) {
    const unmappedBlocks = []
    const seenUnmapped = new Set()
    let colIdCounter = 1

    // Detect semantic blocks that trigger page-level SP settings (no WP node produced)
    const allWidgetIds = (page.sections ?? [])
      .flatMap(s => (s.columns ?? []).flatMap(c => c.widgets ?? []))
      .map(w => w.blockId)
    const pageFlags = {
      commentsEnabled:  allWidgetIds.includes('commenti-contenuto'),
      reactionsEnabled: allWidgetIds.includes('like-contenuto'),
    }

    const horizontalSections = (page.sections ?? []).map((section, sIdx) => {
      // ... existing code unchanged ...
    })

    return {
      canvasLayout: { horizontalSections },
      unmappedBlocks,
      pageFlags,           // ← NEW
    }
  }
  ```

  Inside the `reduce` in the column map, add a skip guard for semantic blocks — insert it right after the `visible` check:

  ```js
  const webparts = (col.widgets ?? []).reduce((acc, widget) => {
    if (widget.props?.visible === false) return acc
    if (SEMANTIC_PAGE_FLAGS.includes(widget.blockId)) return acc  // ← NEW: skip silently

    const node = mapBlock(widget, ctx)
    if (!node) {
      if (!seenUnmapped.has(widget.blockId)) {
        unmappedBlocks.push(widget.blockId)
        seenUnmapped.add(widget.blockId)
      }
      return [...acc, placeholderTextNode(widget.blockId)]
    }
    return [...acc, node]
  }, [])
  ```

- [ ] **Step 6: Run tests to verify they pass**

  ```bash
  cd server && node --test src/blockToWebpart.test.js src/pageBuilder.test.js
  ```

  Expected: all tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add server/src/blockToWebpart.js server/src/blockToWebpart.test.js server/src/pageBuilder.js server/src/pageBuilder.test.js
  git commit -m "feat: SEMANTIC_PAGE_FLAGS — commenti/like skip silently in pageBuilder, return pageFlags"
  ```

---

## Task 4: provisioningJobs.js — PATCH `commentsDisabled` from `pageFlags`

**Files:**
- Modify: `server/src/provisioningJobs.js`

**Interfaces:**
- Consumes: `buildCanvasLayout` now returns `{ canvasLayout, unmappedBlocks, pageFlags }` (from Task 3)
- `pageFlags.commentsEnabled: boolean` — true if commenti-contenuto block was present on the page

**Note on testing:** `configurePages` is a private function not exported from `provisioningJobs.js`, and the existing test suite does not mock `graphClient`. Unit test coverage for `pageFlags.commentsEnabled` already lives in `pageBuilder.test.js` (Task 3). This task adds the implementation only; correctness of `pageFlags` detection is guaranteed by Task 3's tests.

- [ ] **Step 1: Update `configurePages` in `provisioningJobs.js`**

  In `server/src/provisioningJobs.js`, inside the `configurePages` function, find the line that calls `buildCanvasLayout`:

  ```js
  const { canvasLayout, unmappedBlocks } = buildCanvasLayout(page, {
  ```

  Update to also destructure `pageFlags`:

  ```js
  const { canvasLayout, unmappedBlocks, pageFlags } = buildCanvasLayout(page, {
    siteUrl: job.siteUrl,
    groupId: job.groupId ?? null,
    groupName: siteName,
    pageColor: job.tenantConfiguration?.theme?.pageColor ?? null,
  })
  ```

  After the block that confirms `pageId` and before the publish call, add the `commentsDisabled` PATCH:

  ```js
  if (!pageId) {
    throw new Error(`pageId is null after create/patch for ${spName}`)
  }

  // Apply page-level settings derived from semantic blocks
  try {
    await job.graphClient
      .api(`/sites/${job.siteId}/pages/${pageId}/microsoft.graph.sitePage`)
      .version('beta')
      .patch({ commentsDisabled: !pageFlags.commentsEnabled })
  } catch (e) {
    logger.warn({ err: e.message, pageId }, 'commentsDisabled patch skipped')
  }

  // Publish immediately — unpublished (draft) pages are rejected by SP REST nav write
  logger.info({ spName, pageId }, 'publishing page')
  ```

- [ ] **Step 2: Run all server tests**

  ```bash
  cd server && npm test
  ```

  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add server/src/provisioningJobs.js
  git commit -m "feat: PATCH commentsDisabled from pageFlags after page create/patch"
  ```

---

## Task 5: SP prop badge in ToggleField and PropertiesPanel

**Files:**
- Modify: `client/src/components/sidebar-right/ToggleField.jsx`
- Modify: `client/src/components/sidebar-right/PropertiesPanel.jsx`

**Interfaces:**
- `ToggleField` gains optional `spNote?: string` prop. When present, renders a small `"SP"` chip inline with the label, and shows `spNote` as a tooltip on hover.
- `SP_UNSUPPORTED_PROPS` in `PropertiesPanel.jsx` maps prop key → tooltip string.

- [ ] **Step 1: Update `ToggleField.jsx` to accept and render `spNote`**

  Replace the entire content of `client/src/components/sidebar-right/ToggleField.jsx`:

  ```jsx
  export default function ToggleField({ label, value, onChange, spNote = null }) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="flex items-center gap-1.5 text-sm text-white">
          {label}
          {spNote && (
            <span
              className="relative group cursor-default"
              aria-label={spNote}
            >
              <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-semibold leading-none bg-blue-500/20 text-blue-300 border border-blue-500/40">
                SP
              </span>
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 rounded bg-ink-800 border border-ink-600 p-2 text-xs text-ink-200 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                {spNote}
              </span>
            </span>
          )}
        </span>
        <button
          onClick={() => onChange(!value)}
          className={`
            relative w-10 h-5 rounded-full transition-colors
            ${value ? 'bg-flow-400' : 'bg-ink-700'}
          `}
        >
          <span
            className={`
              absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
              ${value ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>
    )
  }
  ```

- [ ] **Step 2: Add `SP_UNSUPPORTED_PROPS` and wire it in `PropertiesPanel.jsx`**

  In `client/src/components/sidebar-right/PropertiesPanel.jsx`, add this constant just before the `PropertiesPanel` component function:

  ```js
  const SP_UNSUPPORTED_PROPS = {
    commentsEnabled: "In SharePoint i commenti si abilitano a livello pagina tramite il blocco 'Commenti sul contenuto'",
    likesEnabled:    "In SharePoint le reazioni si abilitano a livello pagina tramite il blocco 'Like sul contenuto'",
  }
  ```

  In the `configurableProps.map(key => ...)` section (around line 100), find the `ToggleField` render and add the `spNote` prop:

  ```jsx
  return (
    <ToggleField
      key={key}
      label={t(`props.${key}`, { defaultValue: key })}
      value={widget.props[key]}
      onChange={v => updateProp(key, v)}
      spNote={SP_UNSUPPORTED_PROPS[key] ?? null}
    />
  )
  ```

- [ ] **Step 3: Manual test**

  Start the dev server:
  ```bash
  cd client && npm run dev
  ```

  1. Add a `News - Corporate` block to the canvas
  2. Select it — the right panel should show `commentsEnabled` and `likesEnabled` toggles
  3. Hover over the `SP` chip next to each — tooltip should appear with the correct Italian text
  4. Toggle the value — it should still work normally
  5. Add a `Pulsante CTA` block — its toggles should have NO `SP` chip (no spNote for `visible`)

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/components/sidebar-right/ToggleField.jsx client/src/components/sidebar-right/PropertiesPanel.jsx
  git commit -m "feat: SP badge tooltip on unsupported props in config panel"
  ```

---

## Task 6: Re-enable `carosello-contenuti` (blocked on GUID verification)

**Files:**
- Modify: `server/src/blockToWebpart.js`
- Modify: `server/src/blockToWebpart.test.js`

**Prerequisite:** Complete Task 1 first — `WP.HIGHLIGHTED_CONTENT` must be verified.

**Interfaces:**
- Produces: `mapBlock({ blockId: 'carosello-contenuti' })` → Highlighted Content WP node

- [ ] **Step 1: Write the failing test**

  In `server/src/blockToWebpart.test.js`, add:

  ```js
  it('maps carosello-contenuti to Highlighted Content web part', () => {
    const result = mapBlock({ blockId: 'carosello-contenuti', props: {} })
    assert.ok(result, 'should not be null')
    assert.equal(result.webPartType, 'e377ea37-9047-43b9-8cdb-a761be2f8e09') // update if GUID changed in Task 1
    assert.equal(result.data.properties.layoutId, 'Carousel')
  })
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  cd server && node --test src/blockToWebpart.test.js
  ```

  Expected: new test fails — `carosello-contenuti` returns null (still commented out).

- [ ] **Step 3: Re-enable the mapping in MAPPINGS**

  In `server/src/blockToWebpart.js`, find the commented-out line:

  ```js
  // 'carosello-contenuti': highlightedContentMapper, // GUID e377ea37 is Bing Maps — verify correct Highlighted Content GUID
  ```

  Replace with (using the verified GUID from Task 1, updating `WP.HIGHLIGHTED_CONTENT` if needed):

  ```js
  'carosello-contenuti': highlightedContentMapper,
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  cd server && npm test
  ```

  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add server/src/blockToWebpart.js server/src/blockToWebpart.test.js
  git commit -m "feat: re-enable carosello-contenuti → Highlighted Content WP (GUID verified)"
  ```

---

## Self-Review Checklist

After all tasks are complete, run the full server test suite:

```bash
cd server && npm test
```

Expected: all tests pass, zero failures.

Verify spec coverage:
- [x] `contatti-chiave` → People WP mapper (Task 2)
- [x] `feedback-utenti` → Forms WP mapper (Task 2)
- [x] `commenti-contenuto` skipped in layout, not in unmappedBlocks (Task 3)
- [x] `like-contenuto` skipped in layout, not in unmappedBlocks (Task 3)
- [x] `pageFlags.commentsEnabled` drives `commentsDisabled` PATCH (Task 4)
- [x] `commentsEnabled` and `likesEnabled` show SP badge in config panel (Task 5)
- [x] `carosello-contenuti` re-enabled after GUID verification (Task 6)
