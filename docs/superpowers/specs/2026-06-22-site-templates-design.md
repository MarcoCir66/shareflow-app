# Site templates (Phase 5b) — design spec

**Date:** 2026-06-22
**Phase:** Phase 5, sub-project 2 (site-level template bundles — the goal Phase 5a was built to evolve into)

## Goal

Let a user provision an entire site in one click from a gallery of pre-composed site bundles (Comunicazione Corporate, Portale HR, Percorso Onboarding, Employee Hub, Centro Formazione), each combining several of Phase 5a's existing page templates into a page hierarchy plus a visual theme — inspired by Origami Connect's SharePoint intranet template verticals. This is the second half of the two-part initiative Phase 5a was explicitly designed to evolve into without a rewrite.

## Architecture commitment closed out from Phase 5a

Phase 5a locked in three guarantees specifically so this phase wouldn't require a rewrite. Revisiting them now that the real shape of the work is known:

1. **Template content reuses the exact `Page.sections` shape verbatim.** Confirmed and reused as-is: a site bundle's pages are still just `{ title, sections }` descriptors expanded into full pages by the reducer, identical to Phase 5a's single-page expansion.
2. **`APPLY_TEMPLATE`'s payload is `{ pages: Page[], navigation?, theme? }` from day one.** Implemented for `pages` (now supporting more than one entry) and `theme`. **Correction found while exploring the real codebase, not assumed:** the `navigation?` field is dropped entirely — it was never needed. Page navigation already exists in this app as the page hierarchy (`parentId`), already live-rendered by `CanvasTopNav.jsx`/`MegaMenuPanel.jsx` and already exported by `buildTenantExport`'s `navigation` field (built from `parentId` via `buildNavigationExport`). A site bundle only has to create pages with the right `parentId` relationships — the navigation menu appears automatically, with zero new code. The final payload shape is `{ pages: Page[], theme? }`.
3. **Every template entry carries a `category` field from day one.** Confirmed and reused: site bundles use the exact same `PAGE_TEMPLATE_CATEGORIES` taxonomy from `pageTemplates.js` — no new categories introduced.

## Section 1 — Architecture & files

**New file:**
- `client/src/data/siteTemplates.js` — exports `SITE_TEMPLATES`, an array of 5 entries. Each entry composes existing page templates by reference (`pageTemplateId`, resolved against `pageTemplateById` from `pageTemplates.js` at apply time) rather than duplicating any section/block content:
  ```js
  {
    id: 'communication-site',
    label: 'Comunicazione Corporate',           // defaultValue for t('templates.siteLabels.communication-site')
    category: PAGE_TEMPLATE_CATEGORIES.COMMUNICATION,
    icon: 'Newspaper',
    description: 'Un sito di comunicazione corporate con homepage news e una sezione formazione collegata.', // defaultValue for t('templates.siteDescriptions.communication-site')
    themeId: 'corporate-classic',                // matches an id in themeTemplates.js
    pages: [
      { pageTemplateId: 'communication-home', parentIndex: null },
      { pageTemplateId: 'training', parentIndex: 0 },
    ],
  }
  ```
  `parentIndex` is an index into this same `pages` array (not a real `pageId` — those are minted at apply time), identifying which other entry is this page's parent; `null` marks the bundle's root page. Following the same i18n pattern Phase 5a established, `label`/`description`/`category` are `defaultValue` fallbacks for `t()`, not the final display text.

  **The 5 bundles:**

  | Bundle id | Category | Root page template | Child page template | Theme |
  |---|---|---|---|---|
  | `communication-site` | COMMUNICATION | `communication-home` | `training` | `corporate-classic` |
  | `hr-site` | HR | `hr-portal` | `onboarding` | `modern-light` |
  | `onboarding-site` | ONBOARDING | `onboarding` | `hr-portal` | `vibrant-color` |
  | `employee-hub-site` | EMPLOYEE_HUB | `employee-hub` | `communication-home` | `dark-glass` |
  | `training-site` | LEARNING | `training` | `onboarding` | `vibrant-color` |

**Modified files:**
- `client/src/context/configuratorReducer.js` — `ACTIONS.APPLY_TEMPLATE` gains its multi-page branch (today a no-op guard; see Section 2). The section-expansion logic (`sectionId`/`columnId`/`instanceId`/`props` minting) is extracted into a shared `expandTemplateSections(sections)` helper, used by both the existing single-page branch and the new multi-page branch, instead of being duplicated.
- `client/src/components/sidebar-left/TemplateGallery.jsx` — gains a "Pagina"/"Sito" mode toggle at the top (`useState`, default `'page'`, not persisted across sessions). In `'site'` mode it renders `SITE_TEMPLATES` with the same flat-card-grid styling as page templates, resolves each bundle's `pageTemplateId` references via `pageTemplateById`, and builds the multi-page dispatch payload (see Section 3).
- `client/src/components/sidebar-left/ApplyTemplateDialog.jsx` — gains a `kind: 'page' | 'site'` prop (default `'page'`) selecting between `templates.confirmBody` and the new `templates.confirmBodySite`. Title and Annulla/Conferma button labels stay shared (`templates.confirmTitle`/`confirmCancel`/`confirmApply`) — generic enough for both.
- `client/src/locales/{it,en,fr,de}.json` — new keys under the existing `templates` namespace: `modePage`, `modeSite` (toggle button labels), `confirmBodySite` (site-specific warning, `{{name}}` interpolation), `siteLabels.*` and `siteDescriptions.*` (one key per bundle id, mirroring `templates.labels.*`/`descriptions.*`). `templates.categories.*` is reused unchanged — no new category keys, since site bundles use the same 5 category values as page templates.

No changes to `blockCatalog.js`, `sectionLayouts.js`, `themeTemplates.js`, or `pageTemplates.js` — this feature composes them, it doesn't modify them.

## Section 2 — Data shape & reducer action

The `APPLY_TEMPLATE` payload is now `{ pages: Page[], theme? }` (the `navigation?` field from Phase 5a's original commitment is dropped — see the architecture-commitment correction above). The reducer branches on `pages.length`:

```js
function expandTemplateSections(sections) {
  return sections.map(section => ({
    sectionId: crypto.randomUUID(),
    layout: section.layout,
    columns: section.blocks.map(columnBlocks => ({
      columnId: crypto.randomUUID(),
      widgets: columnBlocks.map(blockId => ({
        instanceId: crypto.randomUUID(),
        blockId,
        props: { ...blockById[blockId].defaultProps },
      })),
    })),
  }))
}
```

```js
case ACTIONS.APPLY_TEMPLATE: {
  const { pages, theme } = action.payload
  if (pages.length === 0) return state

  if (pages.length === 1) {
    const [{ title, sections }] = pages
    return {
      ...state,
      pages: state.pages.map(p =>
        p.pageId === state.activePageId ? { ...p, title, sections: expandTemplateSections(sections) } : p
      ),
      selectedWidgetInstanceId: null,
      selectedSectionId: null,
    }
  }

  // Phase 5b: multi-page site bundle — replaces the entire site.
  const pageIds = pages.map(() => crypto.randomUUID())
  const newPages = pages.reduce((acc, { title, sections, parentIndex }, i) => {
    const baseTitle = title.it ?? Object.values(title)[0]
    acc.push({
      pageId: pageIds[i],
      title,
      slug: uniqueSlug(acc, slugify(baseTitle)),
      parentId: parentIndex == null ? null : pageIds[parentIndex],
      sections: expandTemplateSections(sections),
    })
    return acc
  }, [])

  return {
    ...state,
    pages: newPages,
    activePageId: pageIds[pages.findIndex(p => p.parentIndex == null)],
    tenantConfiguration: theme
      ? { ...state.tenantConfiguration, theme }
      : state.tenantConfiguration,
    selectedWidgetInstanceId: null,
    selectedSectionId: null,
  }
}
```

Notes:
- `theme`, when present, **replaces** `tenantConfiguration.theme` wholesale rather than merging field-by-field — a previously-customized `accentColor` must not survive under an unrelated bundle's theme. `TemplateGallery.jsx` always dispatches a complete `theme: { templateId: bundle.themeId, accentColor: null }`.
- Slugs are built incrementally via `uniqueSlug(acc, ...)` (the same helper `ADD_PAGE`/`RENAME_PAGE` already use), checked against the pages already placed in this same bundle, so two pages in one bundle can never collide.
- `activePageId` is set to the bundle's root page (the one whose `parentIndex` is `null`).
- No id is ever reused from the static catalog — every `pageId`/`sectionId`/`columnId`/`instanceId` is minted fresh at apply time, the same guarantee Phase 5a already enforced for page-level templates.
- The existing single-page branch is functionally unchanged; it now calls the extracted `expandTemplateSections` helper instead of inlining the same loop.

## Section 3 — UI flow & catalog interaction

`TemplateGallery.jsx`'s new mode toggle defaults to `'page'`. In `'site'` mode:

- **Emptiness check, extended to the whole site:** `isSiteEmpty = state.pages.length === 1 && isPageEmpty(state.pages[0])` — true only when the site is still in its untouched initial state (one empty Home page). This generalizes Phase 5a's per-page emptiness check to "is there anything in the whole site to lose."
- **Empty site** → applying a bundle dispatches immediately, no dialog (same convention as Phase 5a).
- **Non-empty site** → opens `ApplyTemplateDialog` with `kind="site"`. Body text (new `templates.confirmBodySite` key): *"Sostituire l'intero sito con '{{name}}'? Tutte le pagine attuali verranno eliminate e sostituite, e il tema cambierà. Questa azione non può essere annullata."* Conferma dispatches; Annulla or Escape closes with no state change.

Dispatch payload construction:
```js
const pages = siteTemplate.pages.map(({ pageTemplateId, parentIndex }) => ({
  title: pageTemplateById[pageTemplateId].defaultPageTitle,
  sections: pageTemplateById[pageTemplateId].sections,
  parentIndex,
}))
dispatch({
  type: ACTIONS.APPLY_TEMPLATE,
  payload: { pages, theme: { templateId: siteTemplate.themeId, accentColor: null } },
})
```

After applying, the new navigation (root tab + child in the mega-menu) appears automatically in `CanvasTopNav.jsx`/`MegaMenuPanel.jsx` — a direct consequence of the Section "Architecture commitment" correction above, requiring no new navigation-rendering code.

## Section 4 — Testing

**Unit tests** (Vitest, `client/src/context/configuratorReducer.test.js`):
- `APPLY_TEMPLATE` with a multi-page payload replaces every existing page, rebuilds `parentId` from `parentIndex`, and sets `activePageId` to the root page.
- `APPLY_TEMPLATE` with a multi-page payload and a `theme` replaces `tenantConfiguration.theme` wholesale (a pre-existing custom `accentColor` does not survive).
- Applying two different bundles in sequence produces two structurally-equal but fully id-disjoint page/section/widget trees (extends Phase 5a's "fresh ids on every application" regression test to the multi-page case).
- Regression: the single-page branch still only touches the active page, even when the site already has multiple pages.
- The pages within one applied bundle get distinct slugs.

**E2e tests** (Playwright, `client/tests/smoke.spec.js`):
- The Template tab's Pagina/Sito toggle switches between the two galleries; Sito mode renders all 5 bundle cards.
- Applying a bundle to the pristine default site (one empty Home page) applies immediately: results in 2 pages, the root page appears as a navigation tab, the child page appears in its mega-menu.
- Applying a bundle when the site already has content opens the confirm dialog with the site-specific wording; Annulla leaves the original pages untouched; Conferma replaces everything.
- Escape also cancels the site-bundle dialog (reusing `useFocusTrap`'s already-tested behavior).
- An axe-core scan of the Sito sub-tab and its open confirm dialog reports no in-scope violations (reusing `OUT_OF_SCOPE_AXE_RULES` from Phase 4).

## Out of scope

- A UI for creating or editing site bundles — the 5 catalog entries are static data in `siteTemplates.js`, edited by changing code.
- Extending an already-built site by adding another bundle's pages alongside it — applying a bundle is always a full replacement, never a merge.
- Per-page theme overrides within a bundle — a bundle's theme applies site-wide, not per page.
- Real graphical thumbnails/screenshots for bundle cards (text + icon cards only, matching the page-template gallery's existing style).
- Any page-hierarchy management beyond what `PagesPanel.jsx` already offers (existing drag-and-drop reparenting) — no bundle-specific structure-editing UI.
