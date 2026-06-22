# M365 documents block — design spec

**Date:** 2026-06-22
**Scope:** new content block + wiring into 2 existing page templates (not a new functional phase)

## Goal

Add a new content block, "Documenti M365", that lists SharePoint/OneDrive documents (title, file type, last-modified date/author, link) — a common real-world intranet pattern, requested for the HR Portal and Onboarding page templates specifically (policy documents, forms, onboarding paperwork).

## Where the click-to-open behavior actually lives

ShareFlow is a configurator, not the live site: its canvas shows sample/manual data to configure a block's appearance, while the actual SharePoint site (with real documents and real click-to-open behavior) is only generated at deploy time by a document-library web part. This block therefore only needs to configure *which data to show* (the schema below) — no new interactive behavior is needed in ShareFlow's own canvas, consistent with how every existing block with a `url` field (news, eventi, come-fare-per, ...) already works today: `url` is a configurable field, not a clickable element in the editor.

## Section 1 — Block definition

| Field | Value |
|---|---|
| `id` | `documenti-m365` |
| `category` | `KNOWLEDGE_BASE` (alongside `procedure`, `faq`, `organigramma`) |
| `icon` | `FileText` (not used by any of the 32 existing blocks) |
| `label` (IT, catalog default) | "Documenti M365" |

`client/src/data/blockContentSchemas.js` — new entry in `BLOCK_CONTENT_DEFS`, using `SP_MANUAL` (`['sharepoint-list', 'manual']`) since `sharepoint-list` is exactly the source type already modeled for a SharePoint/OneDrive document library, requiring no new source-type plumbing:

```js
'documenti-m365': {
  sourceTypes: SP_MANUAL,
  schema: [
    { key: 'title',        label: 'Titolo',         type: 'text',   required: true  },
    { key: 'fileType',     label: 'Tipo file',      type: 'select', required: false,
      options: ['pdf', 'docx', 'xlsx', 'pptx', 'other'] },
    { key: 'modifiedDate', label: 'Data modifica',  type: 'date',   required: false },
    { key: 'modifiedBy',   label: 'Modificato da',  type: 'text',   required: false },
    { key: 'url',          label: 'Link',           type: 'url',    required: true  },
  ],
},
```

Field labels ("Titolo", "Tipo file", ...) stay hardcoded Italian, matching every other entry in this file — `blockContentSchemas.js` has never routed field labels through `t()`, this is a pre-existing, consistent convention across all 32 blocks, not a gap introduced here.

`client/src/data/blockCatalog.js` — new catalog entry, same `defaultProps`/`configurableProps` shape already used by the other list-style `KNOWLEDGE_BASE`/`PRODUCTIVITY` blocks (`procedure`, `sezione-welfare`, `bacheca-sindacale`):

```js
{ id: 'documenti-m365', label: 'Documenti M365', category: CATEGORIES.KNOWLEDGE_BASE, icon: 'FileText',
  defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
```

No `CanvasBlockPreview.jsx` changes — the block renders through the existing generic list-rendering path already used by `procedure`/`sezione-welfare`-style blocks; it is not added to any of that file's special-cased `EVENT_IDS`/`MEDIA_IDS`/`PERSON_IDS` sets.

## Section 2 — Template wiring

`client/src/data/pageTemplates.js` — a new, standalone `oneColumn` section is appended to both `hr-portal` and `onboarding`'s existing `sections` arrays. Existing sections are untouched, so no existing structural assertion (section/column counts, indices) on either template needs to change:

```js
// hr-portal — sections becomes:
sections: [
  { layout: 'twoColumn', blocks: [['sezione-welfare'], ['new-entry']] },
  { layout: 'oneColumn', blocks: [['organigramma']] },
  { layout: 'twoColumn', blocks: [['faq'], ['rubrica-colleghi']] },
  { layout: 'oneColumn', blocks: [['documenti-m365']] },
],
```

```js
// onboarding — sections becomes:
sections: [
  { layout: 'oneColumn', blocks: [['new-entry']] },
  { layout: 'twoColumn', blocks: [['procedure'], ['come-fare-per']] },
  { layout: 'oneColumn', blocks: [['faq']] },
  { layout: 'oneColumn', blocks: [['organigramma']] },
  { layout: 'oneColumn', blocks: [['documenti-m365']] },
],
```

No change to `client/src/data/siteTemplates.js`: `hr-site` and `onboarding-site` reference these page templates by `pageTemplateId`, not by duplicated content, so they pick up the new section automatically.

## Section 3 — i18n

One new key, `blocks.labels.documenti-m365`, in all four locale files:

| Language | Value |
|---|---|
| IT | Documenti M365 |
| EN | M365 Documents |
| FR | Documents M365 |
| DE | M365-Dokumente |

## Section 4 — Testing

**Unit test** (Vitest, `client/src/context/configuratorReducer.test.js`): a direct assertion on the static catalog data (no reducer dispatch needed) confirming `documenti-m365` is present in both `pageTemplateById['hr-portal'].sections` and `pageTemplateById['onboarding'].sections` — cheap, catches an array/syntax mistake in either template immediately.

**E2e test** (Playwright, `client/tests/smoke.spec.js`): apply the "Portale HR" page template (Template tab, Pagina mode — the existing Phase 5a flow) and confirm the "Documenti M365" label is visible in the canvas, the same way Phase 5a's own test already confirms "Sezione Welfare"/"New entry"/"Organigramma" appear after applying that template. One e2e test is enough — Onboarding's wiring exercises the identical mechanism (a static catalog entry resolved by the same generic reducer/UI path), so a second e2e test would cover data, not new logic; the unit test in Section 4 above already guards Onboarding's data directly.

## Out of scope

- Any interactive click-to-open behavior in ShareFlow's own canvas — that belongs to the deployed SharePoint document-library web part, not the editor.
- A real Microsoft Graph API integration to populate the list from an actual document library — this block uses sample/manual data exactly like every other block in the catalog.
- Adding the block to `siteTemplates.js` — unnecessary, it arrives for free via `pageTemplateId` reference.
- Adding the block to any page template other than `hr-portal`/`onboarding` (e.g. Communication, Employee Hub, Training) — not requested, can be a follow-up if desired later.
