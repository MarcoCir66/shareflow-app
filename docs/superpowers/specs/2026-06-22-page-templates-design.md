# Page templates (Phase 5a) — design spec

**Date:** 2026-06-22
**Phase:** Phase 5, sub-project 1 (page-level templates — designed to evolve into Phase 5b site-level template bundles)

## Goal

Let a user scaffold a page instantly from a gallery of pre-composed templates (News homepage, HR portal, Onboarding, Employee Hub, Training), inspired by Origami Connect's SharePoint intranet template catalog. This is the first half of a two-part initiative: Phase 5a ships page-level templates now; Phase 5b (multi-page site bundles with navigation and theme) is explicitly deferred but the data/action shapes below are chosen so 5b extends them rather than replacing them.

## Architecture commitment carried from Phase 4

Three decisions are locked in from the start specifically so Phase 5b doesn't require a rewrite:

1. A template's page content reuses the **exact** `Page.sections` shape already defined in `configuratorReducer.js` (`{ sectionId, layout, columns: [{ columnId, widgets: [{ instanceId, blockId, props }] }] }`) — no template-specific schema.
2. The new `ACTIONS.APPLY_TEMPLATE` dispatch payload is `{ pages: Page[], navigation?, theme? }` from day one, even though Phase 5a always dispatches a single-element `pages` array and omits `navigation`/`theme`.
3. Every template entry carries a `category` field (`COMMUNICATION`, `HR`, `ONBOARDING`, `EMPLOYEE_HUB`, `LEARNING`) from day one, matching the taxonomy Phase 5b's site bundles will reuse.

## Section 1 — Architecture & files

**New files:**
- `client/src/data/pageTemplates.js` — mirrors `blockCatalog.js`'s pattern: exports `PAGE_TEMPLATE_CATEGORIES` / `PAGE_TEMPLATE_CATEGORY_LABELS` (flat, non-translated strings — `HR`, `Onboarding`, `Employee Hub`, `Communication`, `Learning` — matching the existing, deliberately non-localized convention of `CATEGORY_LABELS` in `blockCatalog.js`) and `PAGE_TEMPLATES`, an array of 5 entries:
  ```js
  {
    id: 'communication-home',
    label: 'Homepage Comunicazione',           // flat string, not {it,en,fr,de} — matches blockCatalog.js's label convention
    category: PAGE_TEMPLATE_CATEGORIES.COMMUNICATION,
    icon: 'Newspaper',                          // lucide-react icon name, same convention as blockCatalog.js
    description: 'Una homepage di comunicazione con news, avvisi, eventi e galleria multimedia.',
    defaultPageTitle: { it: 'Comunicazione', en: 'Communication', fr: 'Communication', de: 'Kommunikation' },
    sections: [
      { layout: 'twoColumn', blocks: [['news-corporate'], ['avvisi-homepage']] },
      { layout: 'oneColumn', blocks: [['eventi-corporate']] },
      { layout: 'oneColumn', blocks: [['multimedia-gallery']] },
    ],
  }
  ```
  Note: `sections[].blocks` is an array of column-arrays of block ids (no `sectionId`/`columnId`/`instanceId`, no `props` — those are minted fresh at apply time from `blockById[id].defaultProps`, exactly like `ADD_WIDGET` already does). This keeps the static catalog free of any ID that could collide on reuse.

**New components:**
- `client/src/components/sidebar-left/TemplateGallery.jsx` — the 4th tab's content. Cards grouped by category with a collapsible header (visual pattern matching `BlockLibrary.jsx`'s category groups), each card showing icon + `label` + category badge + `description`.
- `client/src/components/sidebar-left/ApplyTemplateDialog.jsx` — confirmation dialog shown only when the active page already has content. `role="dialog"`, `aria-modal="true"`, wired to `useFocusTrap` (reused from Phase 4, no changes to the hook itself) with Escape-to-cancel.

**Modified files:**
- `client/src/components/sidebar-left/LeftSidebar.jsx` — adds a 4th tab, `{ id: 'templates', label: t('templates.tabLabel') }` (a new `templates` locale namespace, matching the existing per-feature namespace convention like `canvas.*`/`props.*`; the only one of the four tabs routed through `t()` — the other three are pre-existing, non-localized hardcoded strings; that gap is not touched here).
- `client/src/context/configuratorReducer.js` — adds `ACTIONS.APPLY_TEMPLATE` (see Section 2).
- `client/src/locales/{it,en,fr,de}.json` — new `templates` namespace with keys for the tab label and the confirm dialog's title/body/buttons (generic UI chrome, unlike the template catalog's own flat-string content): `templates.tabLabel`, `templates.confirmTitle`, `templates.confirmBody`, `templates.confirmApply`, `templates.confirmCancel`.

No backend/server changes. No changes to `blockCatalog.js`, `sectionLayouts.js`, or `themeTemplates.js` — this feature composes them, it doesn't modify them.

## Section 2 — Data shape & reducer action

A template's `sections` never stores `sectionId`/`columnId`/`instanceId` — these are `crypto.randomUUID()`-generated identifiers, and the existing reducer already mints them fresh for every new section/widget (`ADD_SECTION`, `ADD_WIDGET`). Storing fixed IDs in the static catalog would cause collisions the moment the same template was applied twice, or applied to two different pages. The apply logic regenerates every id.

`ACTIONS.APPLY_TEMPLATE`, dispatched as:
```js
dispatch({
  type: ACTIONS.APPLY_TEMPLATE,
  payload: { pages: [{ title: template.defaultPageTitle, sections: template.sections }], navigation: undefined, theme: undefined },
})
```

Reducer case:
```js
case ACTIONS.APPLY_TEMPLATE: {
  const { pages, navigation, theme } = action.payload
  if (pages.length !== 1 || navigation || theme) {
    // Phase 5b: multi-page site bundles with navigation/theme — not implemented yet.
    return state
  }
  const [{ title, sections }] = pages
  const newSections = sections.map(section => ({
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
  return {
    ...updateActivePageSections(state, () => newSections),
    pages: state.pages.map(p => p.pageId === state.activePageId ? { ...p, title } : p),
    selectedWidgetInstanceId: null,
    selectedSectionId: null,
  }
}
```

The Phase 5b guard (`pages.length !== 1 || navigation || theme`) is a deliberate, visible `return state` with a comment — not a silent `default` fallthrough — so whoever builds Phase 5b finds the exact line to replace, and the dispatch payload shape never has to change.

## Section 3 — UI flow & initial catalog

**Five templates, composed only from blocks already in `blockCatalog.js`:**

| Template | Category | Sections (layout: blocks) |
|---|---|---|
| Homepage Comunicazione | COMMUNICATION | twoColumn: news-corporate + avvisi-homepage · oneColumn: eventi-corporate · oneColumn: multimedia-gallery |
| Portale HR | HR | twoColumn: sezione-welfare + new-entry · oneColumn: organigramma · twoColumn: faq + rubrica-colleghi |
| Onboarding | ONBOARDING | oneColumn: new-entry · twoColumn: procedure + come-fare-per · oneColumn: faq · oneColumn: organigramma |
| Employee Hub | EMPLOYEE_HUB | twoColumn: motore-ricerca + rubrica-colleghi · oneColumn: polls-survey · oneColumn: bacheca-scambio |
| Formazione | LEARNING | oneColumn: oggi-presentiamo · twoColumn: procedure + come-fare-per · oneColumn: faq |

**Apply flow:** clicking a template card checks whether the active page is empty (`activePage.sections.every(s => s.columns.every(c => c.widgets.length === 0))` — the same emptiness check `ACTIONS.REMOVE_SECTION` already uses per-section, extended across the whole page):
- **Empty page** → dispatch `APPLY_TEMPLATE` immediately, no dialog.
- **Non-empty page** → open `ApplyTemplateDialog` (`"Applicare '[nome]'? Sostituirà il contenuto attuale della pagina."`, Annulla/Conferma). Conferma dispatches `APPLY_TEMPLATE`; Annulla or Escape closes with no state change.

## Section 4 — Testing

**Unit tests** (Vitest, `client/src/context/configuratorReducer.test.js`):
- `APPLY_TEMPLATE` replaces the active page's sections and sets its title to the template's `defaultPageTitle`.
- Applying the same template twice in a row produces two structurally-equal but id-disjoint section trees (no `sectionId`/`columnId`/`instanceId` collisions).
- `APPLY_TEMPLATE` with `pages.length > 1` or a `navigation`/`theme` present returns the state unchanged (Phase 5b guard regression test).

**E2e tests** (Playwright, `client/tests/smoke.spec.js`):
- The Template tab renders all 5 cards grouped by category.
- Applying a template to the default empty Home page applies immediately; the expected blocks appear in the canvas.
- Applying a template to a page with existing content opens the confirm dialog; Annulla leaves the page untouched; Conferma replaces it.
- The confirm dialog is `role="dialog"` and Escape closes it without applying (reusing `useFocusTrap`'s already-tested behavior).
- An axe-core scan of the open Template tab and of the open confirm dialog reports no in-scope violations (reusing `OUT_OF_SCOPE_AXE_RULES` from Phase 4).

## Out of scope

- Phase 5b: multi-page site bundles (navigation + theme + multiple linked pages applied together). The data and action shapes above are chosen so this extends rather than replaces Phase 5a, but no 5b UI or reducer logic ships now.
- Real graphical thumbnails/screenshots for template cards (text + icon cards only, matching `BlockLibrary`'s existing visual style).
- A UI for creating or editing templates — the 5 catalog entries are static data in `pageTemplates.js`, edited by changing code, not through the app.
- Localizing the three pre-existing, already-non-localized `LeftSidebar` tab labels (Blocchi/Pagine/Aspetto) — a pre-existing gap, unrelated to this feature. Only the new 4th tab and the new confirm dialog are routed through `t()`.
