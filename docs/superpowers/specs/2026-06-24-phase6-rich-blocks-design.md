# Phase 6, sub-project 2 — rich-rendering content blocks — design spec

**Date:** 2026-06-24
**Scope:** 3 new catalog blocks (Calendario, Carosello, Timeline) requiring new `CanvasBlockPreview.jsx`-family rendering logic, wired into 2 existing page templates

## Goal

Close the "rich-rendering blocks" gap explicitly deferred as out-of-scope by [Phase 6 sub-project 1](2026-06-23-phase6-simple-blocks-design.md): blocks whose preview cannot be expressed through the existing catalog+content-schema+generic-render pattern, because they need dedicated visual treatment (a month grid, a slide-by-slide carousel, a vertical milestone list) rather than a list/grid of skeleton rows.

This is sub-project 2 of 5 in the broader Phase 6 (Origami Connect parity) initiative. The remaining 3 (Tab/Accordion section layouts, Mandatory Read compliance, KPI/Analytics + AI-search/wiki-style end-user nav) stay separate future sub-projects, untouched by this spec.

## Section 1 — The 3 blocks and where they live

| Block | `id` | `category` | `icon` | Page template wiring |
|---|---|---|---|---|
| Calendario | `calendario-eventi` | `COMMUNICATION` | `CalendarClock` | New section in **Homepage Comunicazione** (`communication-home`), alongside `eventi-corporate` |
| Carosello | `carosello-contenuti` | `COMMUNICATION` | `GalleryHorizontalEnd` | New section in **Homepage Comunicazione**, alongside `multimedia-gallery` |
| Timeline | `timeline-aziendale` | `KNOWLEDGE_BASE` | `Milestone` | New section in **Onboarding** (`onboarding`) — company history/milestones for new hires |

**Content schemas** (`client/src/data/blockContentSchemas.js`, `BLOCK_CONTENT_DEFS`):

```js
'calendario-eventi': { sourceTypes: ['sharepoint-list', 'manual'], schema: [
  { key: 'title',    label: 'Titolo', type: 'text', required: true  },
  { key: 'date',     label: 'Data',   type: 'date', required: true  },
  { key: 'location', label: 'Luogo',  type: 'text', required: false },
]},
'carosello-contenuti': { sourceTypes: ['sharepoint-list', 'manual'], schema: [
  { key: 'title',       label: 'Titolo',      type: 'text',     required: true  },
  { key: 'description', label: 'Descrizione', type: 'textarea', required: false },
  { key: 'imageUrl',    label: 'Immagine',    type: 'url',      required: false },
  { key: 'url',         label: 'Link',        type: 'url',      required: false },
]},
'timeline-aziendale': { sourceTypes: ['manual'], schema: [
  { key: 'date',        label: 'Data/Anno',   type: 'text',     required: true  },
  { key: 'title',       label: 'Titolo',      type: 'text',     required: true  },
  { key: 'description', label: 'Descrizione', type: 'textarea', required: false },
]},
```

All three use the standard non-scoped `defaultProps`/`configurableProps` shape already used by `kudos`/`anniversari`/`collegamenti-rapidi`:

```js
defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible']
```

`client/src/data/blockCatalog.js` — three new entries in `_rawCatalog`, inserted alongside their category peers:

```js
{ id: 'calendario-eventi',    label: 'Calendario',         category: CATEGORIES.COMMUNICATION,  icon: 'CalendarClock',        defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
{ id: 'carosello-contenuti',  label: 'Carosello',          category: CATEGORIES.COMMUNICATION,  icon: 'GalleryHorizontalEnd', defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
{ id: 'timeline-aziendale',   label: 'Timeline Aziendale', category: CATEGORIES.KNOWLEDGE_BASE, icon: 'Milestone',            defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
```

`client/src/data/pageTemplates.js`:
- `communication-home` gains two new sections (after the existing `multimedia-gallery` section): one `oneColumn` section with `calendario-eventi`, one `oneColumn` section with `carosello-contenuti`.
- `onboarding` gains one new `oneColumn` section with `timeline-aziendale`, placed after the existing `organigramma` section and before `documenti` (the timeline tells the company story after the org chart, before reference documents).

No change to `siteTemplates.js`: any site bundle referencing these two page templates by `pageTemplateId` inherits the new sections automatically (same reuse-by-reference mechanism as Phase 5b / Phase 6 sub-project 1).

## Section 2 — Rendering architecture

Three new files in `client/src/components/canvas/`, each accepting the same prop contract every preview component already uses: `{ block, width, contentItems }`.

**`CalendarBlockPreview.jsx`** — renders a 7-column (Mon–Sun) month grid for the current calendar month. Pure grid math lives in a new `client/src/components/canvas/calendarGrid.js`:

```js
export function getMonthGrid(year, month) {
  // returns an array of weeks; each week is an array of 7 cells: { day, inMonth }
  // day is the day-of-month number; inMonth is false for leading/trailing
  // padding cells (days belonging to the previous/next month)
}
```

The component calls `getMonthGrid(today.getFullYear(), today.getMonth())`, then for each day where any `contentItems` entry has a matching `date`, renders a small dot under the day number. With no `contentItems`, the grid renders with no dots (skeleton state — the grid itself is never empty, since "no events this month" is a legitimate real state, not a loading state).

**`CarouselBlockPreview.jsx`** — the first interactive (stateful) block preview in the canvas. Holds `useState` for the current slide index; renders prev/next buttons (`ChevronLeft`/`ChevronRight` from `lucide-react`) and clickable dot indicators. Wrap-around index math lives in a new `client/src/components/canvas/carouselIndex.js`:

```js
export function wrapIndex(current, delta, length) {
  // returns (current + delta) wrapped into [0, length - 1]
  // e.g. wrapIndex(0, -1, 3) === 2; wrapIndex(2, +1, 3) === 0
}
```

Navigation buttons call `e.stopPropagation()` before changing the index, matching every other interactive control already inside `CanvasBlock.jsx` (drag handle, remove, move — all stop propagation so clicking them doesn't unexpectedly bundle with the parent's `onClick` widget-selection handler; in this case selection still fires, which is fine, but the click must not also count as a drag gesture).

With no `contentItems` (the state every block is in immediately after being placed via a page template, since none of the 46 existing blocks seed sample data), the carousel still renders 3 skeleton placeholder slides with working prev/next/dot navigation between them — consistent with every other multi-item block's skeleton state (`MEDIA_IDS`, `EVENT_IDS` etc. all render a fixed plural skeleton count, never a single placeholder). This also means the Playwright test for "next" navigation exercises the real default experience, with no need to first populate content through the property panel — no existing e2e test in this codebase does that for any block.

**`TimelineBlockPreview.jsx`** — purely presentational, no extracted logic (same tier as `EVENT_IDS`/`PERSON_IDS` today). Vertical list of up to 3 milestones (a dot + connecting line per row), each showing `date`, `title`, `description`. With no `contentItems`, renders 3 skeleton rows in the same visual shape.

`CanvasBlockPreview.jsx` gains three dispatch lines, following the existing single-`if`-per-block-id style already used for `avvisi-homepage` and `countdown-lancio`:

```js
if (block.id === 'calendario-eventi') return <CalendarBlockPreview block={block} width={width} contentItems={contentItems} />
if (block.id === 'carosello-contenuti') return <CarouselBlockPreview block={block} width={width} contentItems={contentItems} />
if (block.id === 'timeline-aziendale') return <TimelineBlockPreview block={block} width={width} contentItems={contentItems} />
```

**Required preparatory change:** today's `Header` (the icon + label + "See all" row, lines 26-43 of `CanvasBlockPreview.jsx`) is a function local to that file, not exported — the 3 new files live outside it and need the same header. Move `Header` verbatim into a new `client/src/components/canvas/BlockPreviewHeader.jsx`, export it as the default export, and update `CanvasBlockPreview.jsx` to import and use it instead of its local definition (its own 13 call sites keep working unchanged — only the definition moves). Each of the 3 new components then imports it the same way.

## Section 3 — i18n

In all four locale files (`it.json`, `en.json`, `fr.json`, `de.json`):
- `blocks.labels.calendario-eventi`, `.carosello-contenuti`, `.timeline-aziendale` — catalog labels.
- `tooltips.blocks.calendario-eventi`, `.carosello-contenuti`, `.timeline-aziendale` — sidebar tooltip text (the sidebar tooltip feature looks up `tooltips.blocks.${block.id}` for every catalog block; without these keys the tooltip would render the raw i18n key instead of explanatory text).

24 strings total (3 blocks × 2 keys × 4 locales), authored in full in the implementation plan rather than here, consistent with the project's established preference for reviewing translation content at plan time.

## Section 4 — Testing

**Vitest** (no jsdom — pure logic only, consistent with this project's established split between pure-logic unit tests and Playwright for DOM/interaction):
- `calendarGrid.test.js` — a known month's grid (e.g. verify first-day offset, total cell count, correct `inMonth` flags for leading/trailing padding days).
- `carouselIndex.test.js` — wrap-around at both boundaries (`wrapIndex(0, -1, length)` wraps to `length - 1`; `wrapIndex(length - 1, +1, length)` wraps to `0`).

**Playwright e2e** (`client/tests/smoke.spec.js`), following the established convention that catalog blocks are verified via e2e visibility rather than isolated component tests:
- All 3 new block labels are visible in the Blocchi library.
- Applying "Homepage Comunicazione" shows Calendario and Carosello in the canvas.
- Applying "Onboarding" shows Timeline in the canvas.
- In the Carosello, clicking the "next" arrow changes the visible slide — verifies the one genuinely new interactive behavior this sub-project introduces.

## Out of scope

- Real external/live data integration for any of the 3 blocks (a real SharePoint-bound calendar, a real CMS-driven carousel) — every block configures sample/manual data exactly like the rest of the catalog; live data binding is a deploy-time SharePoint concern, never fetched or previewed live by ShareFlow's editor itself, for any of the 46 existing blocks either.
- Carousel autoplay.
- Calendar month navigation (previous/next month) — the grid always shows the current calendar month.
- Drag-to-reorder carousel slides.
- The other 3 remaining Phase 6 sub-projects (Tab/Accordion layouts, Mandatory Read compliance, KPI/Analytics + AI-search/wiki-style end-user nav).
- Wiring these 3 blocks into page templates other than `communication-home`/`onboarding`.
