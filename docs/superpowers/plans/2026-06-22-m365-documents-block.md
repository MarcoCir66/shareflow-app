# M365 Documents Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `documenti` content block (SharePoint/OneDrive document list) to the catalog and wire it into the existing `hr-portal` and `onboarding` page templates.

**Architecture:** This is a pure data-layer addition: one new entry in the static block catalog, one new entry in the content-schema map (reusing the existing `sharepoint-list`/`manual` source-type system — no new plumbing), and one new section appended to two existing page templates' static data. No component or reducer logic changes; the block renders through the generic fallback path `CanvasBlockPreview.jsx` already uses for similarly-shaped list blocks (`procedure`, `sezione-welfare`).

**Tech Stack:** React 19, i18next/react-i18next, Vitest, Playwright.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-22-m365-documents-block-design.md` (as revised after user review — id is `documenti`, not `documenti-m365`).
- No `CanvasBlockPreview.jsx` changes — the block must NOT be added to that file's `EVENT_IDS`/`MEDIA_IDS`/`PERSON_IDS` special-case sets; it relies entirely on the generic fallback rendering path.
- No `siteTemplates.js` changes — `hr-site`/`onboarding-site` inherit the new section automatically via their existing `pageTemplateId` reference into `pageTemplates.js`.
- Schema fields, in this exact order: `title` (text, required), `category` (text, optional), `fileType` (select: pdf/docx/xlsx/pptx/other, optional), `modifiedDate` (date, optional), `modifiedBy` (text, optional), `validUntil` (date, optional), `url` (url, required).
- `sourceTypes` must be `SP_MANUAL` (the existing `['sharepoint-list', 'manual']` constant already defined in `blockContentSchemas.js` — do not redefine it).
- Catalog entry: `category: CATEGORIES.KNOWLEDGE_BASE`, `icon: 'FileText'`, `defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }`, `configurableProps: ['visible']` — identical shape to the `procedure`/`sezione-welfare`/`bacheca-sindacale` entries.
- The new page-template section in both `hr-portal` and `onboarding` is `{ layout: 'oneColumn', blocks: [['documenti']] }`, appended as the last entry in each template's `sections` array — existing sections in both templates are not reordered or modified.
- `blocks.labels.documenti` locale values: IT "Documenti", EN "Documents", FR "Documents", DE "Dokumente".
- Run `npx vitest run` and `npx playwright test` from `client/` for verification.

---

### Task 1: `documenti` block — catalog, schema, template wiring, i18n, tests

**Files:**
- Modify: `client/src/data/blockContentSchemas.js`
- Modify: `client/src/data/blockCatalog.js`
- Modify: `client/src/data/pageTemplates.js`
- Modify: `client/src/locales/it.json`, `client/src/locales/en.json`, `client/src/locales/fr.json`, `client/src/locales/de.json`
- Test: `client/src/context/configuratorReducer.test.js`
- Test: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: `SP_MANUAL` (existing constant in `blockContentSchemas.js`, line 54: `const SP_MANUAL = ['sharepoint-list', 'manual']`); `CATEGORIES.KNOWLEDGE_BASE` (existing export in `blockCatalog.js`); `pageTemplateById` (existing export in `pageTemplates.js`, already imported in `configuratorReducer.test.js` at line 4).
- Produces: catalog entry `blockById['documenti']`; `pageTemplateById['hr-portal'].sections` and `pageTemplateById['onboarding'].sections` each gain one more entry containing block id `'documenti'`. No other task/file depends on this work.

- [ ] **Step 1: Write the failing Vitest test**

In `client/src/context/configuratorReducer.test.js`, append this test at the end of the file (after the last test, which currently ends at line 514):

```js

test('documenti block is wired into both the hr-portal and onboarding page templates', () => {
  const hrBlocks = pageTemplateById['hr-portal'].sections.flatMap(s => s.blocks.flat())
  const onboardingBlocks = pageTemplateById['onboarding'].sections.flatMap(s => s.blocks.flat())
  expect(hrBlocks).toContain('documenti')
  expect(onboardingBlocks).toContain('documenti')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && npx vitest run -t "documenti block is wired into both"`

Expected: FAIL — `hrBlocks`/`onboardingBlocks` do not contain `'documenti'` yet (neither template has been modified).

- [ ] **Step 3: Write the failing Playwright e2e test**

In `client/tests/smoke.spec.js`, insert this test immediately after the `'confirming the dialog applies the template, replacing existing content'` test (which currently ends at line 311) and before the `'Template tab and its confirmation dialog have no in-scope accessibility violations'` test (which currently starts at line 313):

```js
  test('applying the HR Portal template includes the Documenti block', async ({ page }) => {
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByText('Portale HR', { exact: true }).click()

    await expect(page.locator('main').getByText('Documenti', { exact: true })).toBeVisible()
  })

```

- [ ] **Step 4: Run the e2e test to verify it fails**

Run: `cd client && npx playwright test -g "includes the Documenti block"`

Expected: FAIL — the "Documenti" block does not exist in the catalog or in the `hr-portal` template yet, so it never renders.

- [ ] **Step 5: Add the content schema entry**

In `client/src/data/blockContentSchemas.js`, insert this entry into `BLOCK_CONTENT_DEFS` immediately after the `'rubrica-colleghi'` entry (which currently ends at line 226 with `},`) and before the `'chi-siamo'` entry (which currently starts at line 227):

```js
  'documenti':         {
    sourceTypes: SP_MANUAL,
    schema: [
      { key: 'title',        label: 'Titolo',         type: 'text',   required: true  },
      { key: 'category',     label: 'Categoria',      type: 'text',   required: false },
      { key: 'fileType',     label: 'Tipo file',      type: 'select', required: false,
        options: ['pdf', 'docx', 'xlsx', 'pptx', 'other'] },
      { key: 'modifiedDate', label: 'Data modifica',  type: 'date',   required: false },
      { key: 'modifiedBy',   label: 'Modificato da',  type: 'text',   required: false },
      { key: 'validUntil',   label: 'Valido fino al', type: 'date',   required: false },
      { key: 'url',          label: 'Link',           type: 'url',    required: true  },
    ],
  },
```

- [ ] **Step 6: Add the catalog entry**

In `client/src/data/blockCatalog.js`, insert this entry into `_rawCatalog` immediately after the `'rubrica-colleghi'` entry (line 68) and before the `'chi-siamo'` entry (line 69):

```js
  { id: 'documenti',           label: 'Documenti',                  category: CATEGORIES.KNOWLEDGE_BASE, icon: 'FileText',     defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
```

- [ ] **Step 7: Wire the block into the `hr-portal` page template**

In `client/src/data/pageTemplates.js`, change the `hr-portal` entry's `sections` array (currently lines 30-34):

```js
    sections: [
      { layout: 'twoColumn', blocks: [['sezione-welfare'], ['new-entry']] },
      { layout: 'oneColumn', blocks: [['organigramma']] },
      { layout: 'twoColumn', blocks: [['faq'], ['rubrica-colleghi']] },
    ],
```

to:

```js
    sections: [
      { layout: 'twoColumn', blocks: [['sezione-welfare'], ['new-entry']] },
      { layout: 'oneColumn', blocks: [['organigramma']] },
      { layout: 'twoColumn', blocks: [['faq'], ['rubrica-colleghi']] },
      { layout: 'oneColumn', blocks: [['documenti']] },
    ],
```

- [ ] **Step 8: Wire the block into the `onboarding` page template**

In the same file, change the `onboarding` entry's `sections` array (currently lines 43-48):

```js
    sections: [
      { layout: 'oneColumn', blocks: [['new-entry']] },
      { layout: 'twoColumn', blocks: [['procedure'], ['come-fare-per']] },
      { layout: 'oneColumn', blocks: [['faq']] },
      { layout: 'oneColumn', blocks: [['organigramma']] },
    ],
```

to:

```js
    sections: [
      { layout: 'oneColumn', blocks: [['new-entry']] },
      { layout: 'twoColumn', blocks: [['procedure'], ['come-fare-per']] },
      { layout: 'oneColumn', blocks: [['faq']] },
      { layout: 'oneColumn', blocks: [['organigramma']] },
      { layout: 'oneColumn', blocks: [['documenti']] },
    ],
```

- [ ] **Step 9: Add the locale key to all four locale files**

In `client/src/locales/it.json`, insert this line immediately after the `"rubrica-colleghi"` line (currently line 66) and before the `"chi-siamo"` line (currently line 67):

```json
      "documenti": "Documenti",
```

In `client/src/locales/en.json`, at the same position:

```json
      "documenti": "Documents",
```

In `client/src/locales/fr.json`, at the same position:

```json
      "documenti": "Documents",
```

In `client/src/locales/de.json`, at the same position:

```json
      "documenti": "Dokumente",
```

- [ ] **Step 10: Run the unit test to verify it passes**

Run: `cd client && npx vitest run -t "documenti block is wired into both"`

Expected: PASS

- [ ] **Step 11: Run the e2e test to verify it passes**

Run: `cd client && npx playwright test -g "includes the Documenti block"`

Expected: PASS

- [ ] **Step 12: Run both full suites to check for regressions**

Run:
```bash
cd client && npx vitest run
npx playwright test
```

Expected: all pass — Vitest count is the pre-existing count plus 1; Playwright count is the pre-existing count plus 1. No other test's assertions change, since no existing section in `hr-portal`/`onboarding` was reordered or removed, and no other template's data changed.

- [ ] **Step 13: Commit**

```bash
git add client/src/data/blockContentSchemas.js client/src/data/blockCatalog.js client/src/data/pageTemplates.js client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json client/src/context/configuratorReducer.test.js client/tests/smoke.spec.js
git commit -m "feat: add Documenti (SharePoint/OneDrive) block to catalog and wire into HR Portal/Onboarding templates"
```

---

## Final check

After Task 1, run both suites once more from `client/`:

```bash
npx vitest run
npx playwright test
```

Expected: all Vitest tests pass (pre-existing count + 1), all Playwright tests pass (pre-existing count + 1).
