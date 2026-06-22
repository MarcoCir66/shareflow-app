# M365 documents block — design spec

**Date:** 2026-06-22
**Scope:** new content block + wiring into 2 existing page templates (not a new functional phase)
**Revision:** updated after user review — see "Feedback considered" at the end for points raised and verified against the codebase.

## Goal

Add a new content block, "Documenti", that lists SharePoint/OneDrive documents (title, category, file type, last-modified date/author, validity, link) — a common real-world intranet pattern, requested for the HR Portal and Onboarding page templates specifically (policy documents, forms, onboarding paperwork).

## Where the click-to-open behavior actually lives

ShareFlow is a configurator, not the live site: its canvas shows sample/manual data to configure a block's appearance, while the actual SharePoint site (with real documents and real click-to-open behavior) is only generated at deploy time by a document-library web part. This block therefore only needs to configure *which data to show* (the schema below) — no new interactive behavior is needed in ShareFlow's own canvas, consistent with how every existing block with a `url` field (news, eventi, come-fare-per, ...) already works today: `url` is a configurable field, not a clickable element in the editor.

## Section 1 — Block definition

| Field | Value |
|---|---|
| `id` | `documenti` |
| `category` | `KNOWLEDGE_BASE` (alongside `procedure`, `faq`, `organigramma`) |
| `icon` | `FileText` (not used by any of the 32 existing blocks) |
| `label` (IT, catalog default) | "Documenti" |

`client/src/data/blockContentSchemas.js` — new entry in `BLOCK_CONTENT_DEFS`, using `SP_MANUAL` (`['sharepoint-list', 'manual']`) since `sharepoint-list` is exactly the source type already modeled for a SharePoint/OneDrive document library, requiring no new source-type plumbing:

```js
'documenti': {
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

`fileType` is preview-only: it picks the icon shown in ShareFlow's own sample/manual editor card. The deployed SharePoint site's document-library web part derives its icon from the real file's actual metadata, independent of this field — so a mismatch here (e.g. picking "pdf" while the linked file is a .docx) is a cosmetic editor-preview detail, not a deployed-site defect. `version` is intentionally not a field: SharePoint's native document versioning already covers it, duplicating it here would be redundant with the platform this block targets.

Field labels ("Titolo", "Categoria", ...) stay hardcoded Italian, matching every other entry in this file — `blockContentSchemas.js` has never routed field labels through `t()`, this is a pre-existing, consistent convention across all 32 blocks, not a gap introduced here.

`client/src/data/blockCatalog.js` — new catalog entry, same `defaultProps`/`configurableProps` shape already used by the other list-style `KNOWLEDGE_BASE`/`PRODUCTIVITY` blocks (`procedure`, `sezione-welfare`, `bacheca-sindacale`):

```js
{ id: 'documenti', label: 'Documenti', category: CATEGORIES.KNOWLEDGE_BASE, icon: 'FileText',
  defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
```

No `CanvasBlockPreview.jsx` changes — the block renders through the existing generic list-rendering path already used by `procedure`/`sezione-welfare`-style blocks; it is not added to any of that file's special-cased `EVENT_IDS`/`MEDIA_IDS`/`PERSON_IDS` sets. That generic path already caps the editor's sample preview at 3 visible items (`contentItems.slice(0, 3)`) regardless of how many are entered — this block inherits that cap automatically, with no new code.

## Section 2 — Template wiring

`client/src/data/pageTemplates.js` — a new, standalone `oneColumn` section is appended to both `hr-portal` and `onboarding`'s existing `sections` arrays. Existing sections are untouched, so no existing structural assertion (section/column counts, indices) on either template needs to change:

```js
// hr-portal — sections becomes:
sections: [
  { layout: 'twoColumn', blocks: [['sezione-welfare'], ['new-entry']] },
  { layout: 'oneColumn', blocks: [['organigramma']] },
  { layout: 'twoColumn', blocks: [['faq'], ['rubrica-colleghi']] },
  { layout: 'oneColumn', blocks: [['documenti']] },
],
```

```js
// onboarding — sections becomes:
sections: [
  { layout: 'oneColumn', blocks: [['new-entry']] },
  { layout: 'twoColumn', blocks: [['procedure'], ['come-fare-per']] },
  { layout: 'oneColumn', blocks: [['faq']] },
  { layout: 'oneColumn', blocks: [['organigramma']] },
  { layout: 'oneColumn', blocks: [['documenti']] },
],
```

No change to `client/src/data/siteTemplates.js`: `hr-site` and `onboarding-site` reference these page templates by `pageTemplateId`, not by duplicated content, so they pick up the new section automatically.

## Section 3 — i18n

One new key, `blocks.labels.documenti`, in all four locale files:

| Language | Value |
|---|---|
| IT | Documenti |
| EN | Documents |
| FR | Documents |
| DE | Dokumente |

## Section 4 — Testing

**Unit test** (Vitest, `client/src/context/configuratorReducer.test.js`): a direct assertion on the static catalog data (no reducer dispatch needed) confirming `documenti` is present in both `pageTemplateById['hr-portal'].sections` and `pageTemplateById['onboarding'].sections` — cheap, catches an array/syntax mistake in either template immediately.

**E2e test** (Playwright, `client/tests/smoke.spec.js`): apply the "Portale HR" page template (Template tab, Pagina mode — the existing Phase 5a flow) and confirm the "Documenti" label is visible in the canvas, the same way Phase 5a's own test already confirms "Sezione Welfare"/"New entry"/"Organigramma" appear after applying that template. One e2e test is enough — Onboarding's wiring exercises the identical mechanism (a static catalog entry resolved by the same generic reducer/UI path), so a second e2e test would cover data, not new logic; the unit test in Section 4 above already guards Onboarding's data directly.

## Out of scope

- Any interactive click-to-open behavior in ShareFlow's own canvas — that belongs to the deployed SharePoint document-library web part, not the editor.
- A real Microsoft Graph API integration to populate the list from an actual document library — this block uses sample/manual data exactly like every other block in the catalog.
- Adding the block to `siteTemplates.js` — unnecessary, it arrives for free via `pageTemplateId` reference.
- Adding the block to any page template other than `hr-portal`/`onboarding` (e.g. Communication, Employee Hub, Training) — not requested, can be a follow-up if desired later.
- Configurable sort order, an items-shown limit beyond the existing 3-item preview cap, and `url` field validation — see "Feedback considered" below.

## Feedback considered

The user reviewed the first draft and raised 6 points. Three were incorporated above (`category`/`validUntil` fields, the `fileType`-is-preview-only clarification, and renaming `documenti-m365` → `documenti`). Three were verified against the actual codebase and declined, because the requested fix would only apply to this one new block while the same property is absent from all 31 existing blocks — making this block inconsistent with its peers rather than fixing a real gap in it specifically:

- **Configurable sort order**: confirmed no block in `blockContentSchemas.js`/`ContentPanel.jsx`/`CanvasBlockPreview.jsx` has one today; items render in entry order everywhere. A system-wide sort feature, if wanted, is a separate cross-cutting spec touching all list-style blocks, not a one-off addition here.
- **Limiting a long list**: confirmed `CanvasBlockPreview.jsx`'s generic rendering path (which this block uses) already caps the editor's sample preview at 3 items via `contentItems.slice(0, 3)` — this already applies to `documenti` automatically. Any pagination/scrolling on the real deployed site is native SharePoint document-library behavior, outside ShareFlow's configuration surface.
- **URL validation**: confirmed zero existing `type: 'url'` field (news, eventi, come-fare-per, ...) has format validation anywhere in the codebase today. Adding it only for `documenti.url` would single out one field among many with the identical shape; a system-wide validation pass is a separate concern.
