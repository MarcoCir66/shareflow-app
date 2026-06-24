# Phase 6, sub-project 3 — Accordion section layout — design spec

**Date:** 2026-06-24
**Scope:** A new "Accordion" section layout with freely-managed panels (add/remove/rename, independent open/closed state, multilingual labels), as an alternative to the existing fixed-column-count grid layouts.

## Goal

Close the "Tab/Accordion section layouts" gap from the Phase 6 (Origami Connect parity) decomposition — see [Phase 6 sub-project 1](2026-06-23-phase6-simple-blocks-design.md) and [Phase 6 sub-project 2](2026-06-24-phase6-rich-blocks-design.md) for the prior two closed sub-projects. This sub-project covers **Accordion only**. Tab (single-panel-visible-at-a-time, switched via a tab bar) is a separate future sub-project that will reuse the panel data model built here — building both at once was considered and explicitly rejected in favor of doing one well first.

Today, ShareFlow's section layout model (`client/src/data/sectionLayouts.js`) is a closed set of column-count layouts (`oneColumn`, `twoColumn`, `threeColumn`, `oneThirdLeft`, `oneThirdRight`), each a fixed grid of side-by-side columns rendered simultaneously. Accordion is structurally different: independently collapsible panels stacked vertically, with an open-ended count the author manages directly (not picked from a fixed palette like column counts are).

## Section 1 — Behavior

- Any number of panels, added/removed/renamed by the author directly in the canvas — no fixed-count presets.
- Multiple panels can be expanded at once; opening one never closes another (no single-open/exclusive mode).
- Each panel's expanded/collapsed state is **saved as part of the page data**, not transient UI state. The author sets it simply by interacting with the accordion in the canvas exactly as an end visitor would — there is no separate "default expanded" control in the properties panel.
- Each panel has a label, **multilingual** (`{it, en, fr, de}`), edited the same way as the site name and page titles — one value per language, editing the current language's value, the others preserved.
- The accordion renders and behaves identically in the editor canvas and in the read-only preview / published site (same component for both, same precedent as the Carosello block from sub-project 2) — an end visitor can open/close panels locally in their own browser, but that interaction is never persisted anywhere (this product has no per-visitor identity or persistence).

## Section 2 — Data model

`section.layout = 'accordion'` is a value distinct from the grid layout keys. `SECTION_LAYOUTS` (`client/src/data/sectionLayouts.js`) gains a `kind: 'grid' | 'accordion'` field on every entry (grid entries get `kind: 'grid'`, retroactively, with no behavior change) plus one new entry:

```js
accordion: { label: 'Accordion', kind: 'accordion' }
```

(No `columns`/`gridCols`/`widths` for the accordion entry — those fields are meaningless for it and stay unused.)

Each panel reuses the exact shape of today's columns (`{ columnId, widgets }`), with two additional fields:

```js
{
  columnId: 'col-abc123',
  label: { it: 'Pannello 1', en: 'Panel 1', fr: 'Panneau 1', de: 'Panel 1' },
  expanded: false,
  widgets: [],
}
```

This reuse is deliberate, not just convenient: `CanvasBlock.jsx`'s existing "move to another column" menu already lists every column of every section on the page, identified only by `columnId` — it will work for moving a widget into/out of an accordion panel with zero changes to that code, because an accordion panel and a grid column are indistinguishable at that level.

Converting a section between a grid layout and accordion (via the existing layout picker) reuses the existing `CHANGE_SECTION_LAYOUT` overflow logic (excess widgets merge into the last remaining column/panel) and extends it: converting **to** accordion assigns default labels (`Pannello 1`, `Pannello 2`, …, the exact 4-locale strings hardcoded the same way the default Home page title is hardcoded in `initialState`) and `expanded: false` to every resulting panel, one per existing column (a 2-column grid becomes a 2-panel accordion, etc.); converting **away from** accordion simply drops the `label`/`expanded` fields (grid columns carry neither).

**Creating a brand-new accordion section from scratch** (picking "Accordion" directly from the picker when adding a new section, not converting an existing one) has no prior columns to carry over. It starts with **2 panels** — today's `emptyColumns(layoutKey)` helper divides by `SECTION_LAYOUTS[layoutKey].columns`, which is `undefined` for the accordion entry (it has no `columns` field, per this section's registry shape) and would silently create a zero-panel section if left unhandled; the helper needs an explicit accordion case that always returns 2 panels with default labels, never zero.

## Section 3 — Reducer actions

Four new actions, all only meaningful on `layout === 'accordion'` sections:

- **`ADD_PANEL`** `{ sectionId }` — appends a new panel: label defaulted to `Pannello N` (N = new panel count) in all 4 locales, `expanded: false`, `widgets: []`.
- **`REMOVE_PANEL`** `{ sectionId, columnId }` — removes a panel. The reducer itself defensively re-checks two conditions before removing, mirroring exactly how `REMOVE_SECTION` already guards itself (not just relying on the UI hiding the button): the target panel's `widgets` array must be empty, AND the section must have more than one panel (an accordion can never be reduced to zero panels, the same way a page can never be reduced to zero sections). Either condition failing is a no-op, returning the unchanged state.
- **`RENAME_PANEL`** `{ sectionId, columnId, label }` — updates the panel's label for the current UI language only, same pattern as the existing site-name rename (`{ ...current, [lang]: value }`).
- **`TOGGLE_PANEL_EXPANDED`** `{ sectionId, columnId }` — flips that panel's `expanded` boolean.

None of these four actions touch grid-layout sections' `columns` array — they are new, isolated actions, not a generalization of any existing column action.

## Section 4 — Rendering and interaction

A new component `client/src/components/canvas/AccordionSection.jsx`, dispatched from `CanvasSection.jsx` with a single check at the top: if `section.layout === 'accordion'`, render `AccordionSection`; otherwise render today's grid unchanged (zero changes to the grid branch).

Each panel is a clickable header (label + chevron) above a body containing an **unmodified** `CanvasColumn` — the same component already used inside grid columns today, reused as-is: it has no awareness of, and needs no awareness of, whether its container is a grid column or an accordion panel.

**Collapsed panels stay valid drop targets for direct drag-and-drop.** A collapsed panel's `CanvasColumn` is never unmounted from the DOM (so its `dnd-kit` `useDroppable` registration is never lost) — it is only visually compressed (`max-height: 0; overflow: hidden`) while `expanded` is `false`. To give visual feedback while dragging, a collapsed panel's header auto-expands when a drag is in progress and the pointer is over it (the same "hover-to-expand-a-collapsed-target" pattern used by file-manager folder trees), collapsing again if the drag moves away without a drop, and staying open if the drop lands there.

This component works identically in the editor canvas and in the read-only preview/published-site rendering path (`CanvasSection.jsx`'s existing `readOnly` branch) — same precedent as the Carosello block (Phase 6 sub-project 2), which was the first interactive canvas preview; this accordion is the first interactive *section layout*.

## Section 5 — Panel management UI

Entirely inside `AccordionSection.jsx`, in the canvas — no new UI in the right-hand properties panel:

- **Rename:** clicking a panel's label turns it into a text input — the same local `editing`/`draft` state, commit-on-blur/Enter, Escape-cancels pattern already used for renaming pages in `PageTreeItem.jsx`. Dispatches `RENAME_PANEL` only if the trimmed text actually changed.
- **Add panel:** a "+ Aggiungi pannello" button at the bottom of the section, always visible (not hover-only — adding a panel is at least as common an action as adding a block).
- **Remove panel:** a trash icon on the header, visible on hover, **enabled only when the panel is empty and the section has more than one panel** — same two constraints the reducer itself enforces (Section 3), mirroring exactly how "delete section" is shown only when the section is empty.
- **Open/close:** clicking the rest of the header (chevron + label, outside the rename input and the trash icon) dispatches `TOGGLE_PANEL_EXPANDED`. Real `aria-expanded` semantics on the header button, not a purely visual indicator.

## Section 6 — Layout picker and i18n

The existing layout picker (`SectionLayoutPicker.jsx`, reused both for "add a new section" and "change an existing section's layout") gains one more button: "Accordion", rendered with a distinct icon (stacked horizontal bars, not the grid-of-squares icon used for column layouts) — driven by the new `kind` field on `SECTION_LAYOUTS` so the registry stays a single source of truth.

New UI-chrome i18n keys (interface labels only — panel labels are page content, not translated UI strings, exactly like the site name):
- `sectionLayouts.accordion` — the picker button's label
- `canvas.addPanel` — the "+ Aggiungi pannello" button text
- `canvas.removePanel` — the trash icon's aria-label
- `canvas.togglePanel` — the header toggle button's aria-label

Default panel labels (`Pannello 1`/`Panel 1`/`Panneau 1`/`Panel 1`, etc.) are written directly into the reducer as hardcoded 4-locale string literals, the same way the default Home page's title is hardcoded in `initialState` — they are page data, not i18n lookups.

## Section 7 — Testing

**Vitest** (pure reducer logic, no DOM — same convention as every existing `configuratorReducer.test.js` case): `ADD_PANEL`, `REMOVE_PANEL` (including the empty-only constraint), `RENAME_PANEL`, `TOGGLE_PANEL_EXPANDED`, and the extended `CHANGE_SECTION_LAYOUT` grid↔accordion conversion (default labels assigned going in, dropped going out, overflow-widget merging preserved).

**Playwright e2e**: creating an accordion section from the layout picker; adding/renaming/removing a panel; toggling a panel open/closed and confirming the state persists (e.g. survives switching to another page and back); dragging a block over a collapsed panel auto-expands it — included if it can be verified reliably with Playwright's drag simulation against this codebase's existing `dnd-kit` test patterns, otherwise deferred to manual verification and noted as such in the implementation plan.

## Out of scope

- Tab layout (separate future sub-project; will reuse this sub-project's panel data model).
- Reordering panels via drag-and-drop.
- Fixed-panel-count presets (explicitly rejected in favor of free add/remove/rename).
- Per-visitor persistence of open/closed state on the published site (impossible — this product has no per-visitor identity).
- Nested accordions (an accordion panel containing another accordion section).
- Any change to the existing grid-layout rendering, column actions, or `SectionLayoutPicker`'s grid-icon rendering path.
