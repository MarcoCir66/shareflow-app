# Phase 6 Sub-Project 3 — Accordion Section Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Accordion" section layout to ShareFlow's canvas — freely-managed, independently-collapsible panels with multilingual labels — alongside the existing fixed-column-count grid layouts.

**Architecture:** `SECTION_LAYOUTS` gains a `kind` discriminator (`'grid'` vs `'accordion'`); accordion panels reuse the exact column shape (`{columnId, widgets}`) plus `label`/`expanded`, so the existing "move to another column" menu and `CanvasColumn` component work unmodified. A new `AccordionPanels.jsx` renders only the panel list, mounted inside `CanvasSection.jsx`'s existing wrapper (selection, hover icons, layout picker all stay shared with grid sections). Four new reducer actions manage panels; `CHANGE_SECTION_LAYOUT` is extended (not duplicated) to convert between grid and accordion.

**Tech Stack:** React 19, `lucide-react` icons, `react-i18next`, Vitest (reducer logic), Playwright (e2e). No new dependencies.

## Global Constraints

- No new npm dependencies.
- `SECTION_LAYOUTS` (`client/src/data/sectionLayouts.js`) entries all gain a `kind: 'grid' | 'accordion'` field; the new `accordion` entry has `label: 'Accordion'` hardcoded in Italian, matching the existing 5 entries' un-translated labels exactly — this is a known pre-existing gap (the picker's `title` attribute is never routed through i18n), not something this plan fixes.
- A brand-new accordion section (via `ADD_SECTION`) always starts with exactly 2 panels — `emptyColumns('accordion')` must never return zero panels (today's `Array.from({length: undefined}, ...)` would silently do exactly that if left unhandled).
- `REMOVE_PANEL` must defensively re-check both conditions inside the reducer itself, not only via a hidden UI button: the target panel's `widgets` must be empty, AND the section must have more than one panel — mirrors `REMOVE_SECTION`'s existing `isEmpty`/`sections.length === 1` double guard exactly.
- Converting a section to the *same* layout it already has (most relevantly: re-selecting "Accordion" on a section that's already an accordion) must be a no-op — it must never regenerate default panel labels and destroy the user's custom renames.
- `CanvasColumn.jsx` is reused for accordion panel bodies with **zero modifications**. It does not know or need to know whether its container is a grid column or an accordion panel.
- A collapsed accordion panel's `CanvasColumn` is unmounted, not hidden via CSS — collapsed panels are not drag-and-drop targets. Moving a widget into a collapsed panel works only through the existing "move to another column" menu in `CanvasBlock.jsx`, which operates on `columnId`s directly and doesn't care about visibility.
- A panel's header is a `<div role="button" tabIndex={0}>`, never a literal `<button>` — it contains other interactive elements (a rename input, a delete button), which a real `<button>` cannot validly contain. Manual `onKeyDown` handling for Enter/Space provides the same activation a real button gets for free.
- Every interactive control inside a panel header (the header's own toggle, the delete button) calls `e.stopPropagation()` before dispatching, matching the established convention everywhere else in `CanvasSection.jsx`/`CanvasBlock.jsx`, even where the only consequence of skipping it would be the harmless side effect of also selecting the section.
- Panel labels are multilingual objects (`{it, en, fr, de}`), edited one language at a time via the current UI language — same pattern as `RENAME_PAGE`/site name editing. Default labels are hardcoded string literals in the reducer, never i18n lookups (they are page content, not UI chrome).
- Test commands (run from `client/`): `npm run test:unit` (Vitest) and `npm run test:e2e` (Playwright). `smoke.spec.js`'s `beforeEach` sets `localStorage.setItem('i18nextLng', 'it')` before navigating — every e2e assertion in this plan uses Italian strings for that reason.

---

### Task 1: Data model — `kind` discriminator and default accordion panels

**Files:**
- Modify: `client/src/data/sectionLayouts.js` (entire file, 8 lines)
- Modify: `client/src/context/configuratorReducer.js:32-37` (`emptyColumns`)
- Test: `client/src/context/configuratorReducer.test.js` (append)

**Interfaces:**
- Produces: `SECTION_LAYOUTS[key].kind` (`'grid' | 'accordion'`), consumed by Task 2 (`CHANGE_SECTION_LAYOUT`) and Task 3 (`SectionLayoutPicker.jsx`, `CanvasSection.jsx`). `emptyColumns('accordion')` always returns exactly 2 panels shaped `{ columnId, label: {it,en,fr,de}, expanded: false, widgets: [] }`, consumed by Task 2's `ADD_SECTION` (unchanged call site, new behavior).

- [ ] **Step 1: Write the failing test**

```js
test('ADD_SECTION with layout "accordion" creates 2 default panels with multilingual labels', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.ADD_SECTION, payload: { layout: 'accordion' } })
  const section = next.pages[0].sections[1]
  expect(section.layout).toBe('accordion')
  expect(section.columns).toHaveLength(2)
  expect(section.columns[0].label).toEqual({ it: 'Pannello 1', en: 'Panel 1', fr: 'Panneau 1', de: 'Panel 1' })
  expect(section.columns[1].label).toEqual({ it: 'Pannello 2', en: 'Panel 2', fr: 'Panneau 2', de: 'Panel 2' })
  expect(section.columns[0].expanded).toBe(false)
  expect(section.columns[0].widgets).toEqual([])
})
```

Append this to `client/src/context/configuratorReducer.test.js`, anywhere after the existing `ADD_SECTION` test.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/context/configuratorReducer.test.js -t "ADD_SECTION with layout"`
Expected: FAIL — `section.layout` is `'accordion'` but `section.columns` has length 0 (today's `emptyColumns` divides by `SECTION_LAYOUTS.accordion.columns`, which doesn't exist yet, so `Array.from({length: undefined})` returns `[]`).

- [ ] **Step 3: Update `sectionLayouts.js`**

Replace the entire file:

```js
/** @type {Record<string, {label:string, kind:'grid'|'accordion', columns?:number, gridCols?:string, widths?:string[]}>} */
export const SECTION_LAYOUTS = {
  oneColumn:     { label: 'Una colonna', kind: 'grid', columns: 1, gridCols: 'grid-cols-1',         widths: ['full'] },
  twoColumn:     { label: 'Due colonne', kind: 'grid', columns: 2, gridCols: 'grid-cols-2',         widths: ['half', 'half'] },
  threeColumn:   { label: 'Tre colonne', kind: 'grid', columns: 3, gridCols: 'grid-cols-3',         widths: ['third', 'third', 'third'] },
  oneThirdLeft:  { label: '1/3 + 2/3',   kind: 'grid', columns: 2, gridCols: 'grid-cols-[1fr_2fr]', widths: ['third', 'twoThirds'] },
  oneThirdRight: { label: '2/3 + 1/3',   kind: 'grid', columns: 2, gridCols: 'grid-cols-[2fr_1fr]', widths: ['twoThirds', 'third'] },
  accordion:     { label: 'Accordion',   kind: 'accordion' },
}
```

- [ ] **Step 4: Update `emptyColumns` in `configuratorReducer.js`**

Replace lines 32-37:

```js
const DEFAULT_PANEL_LABELS = { it: 'Pannello', en: 'Panel', fr: 'Panneau', de: 'Panel' }

function defaultPanelLabel(n) {
  return Object.fromEntries(Object.entries(DEFAULT_PANEL_LABELS).map(([lang, word]) => [lang, `${word} ${n}`]))
}

function emptyColumns(layoutKey) {
  if (SECTION_LAYOUTS[layoutKey].kind === 'accordion') {
    return Array.from({ length: 2 }, (_, i) => ({
      columnId: generateId(),
      label: defaultPanelLabel(i + 1),
      expanded: false,
      widgets: [],
    }))
  }
  return Array.from({ length: SECTION_LAYOUTS[layoutKey].columns }, () => ({
    columnId: generateId(),
    widgets: [],
  }))
}
```

`defaultPanelLabel(n)` is reused by Task 2's `ADD_PANEL` and `toAccordionPanels` — both need the exact same "`Pannello N`/`Panel N`/`Panneau N`/`Panel N`" generation, and this avoids writing the 4-language object literal three separate times.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd client && npx vitest run src/context/configuratorReducer.test.js -t "ADD_SECTION with layout"`
Expected: PASS

- [ ] **Step 6: Run the full unit suite to confirm no regression**

Run: `cd client && npm run test:unit`
Expected: all existing tests still pass — `SECTION_LAYOUTS`'s 5 existing entries gained a `kind` field but kept every field `SectionLayoutPicker.jsx`/`CanvasSection.jsx` currently read (`label`, `columns`, `gridCols`, `widths`), so no existing grid behavior changes.

- [ ] **Step 7: Commit**

```bash
git add client/src/data/sectionLayouts.js client/src/context/configuratorReducer.js client/src/context/configuratorReducer.test.js
git commit -m "feat: add accordion layout kind and default 2-panel creation"
```

---

### Task 2: Panel management reducer actions

**Files:**
- Modify: `client/src/context/configuratorReducer.js` (ACTIONS map, new cases, `CHANGE_SECTION_LAYOUT` rewrite)
- Test: `client/src/context/configuratorReducer.test.js` (append)

**Interfaces:**
- Consumes: `defaultPanelLabel(n)` from Task 1 (same file).
- Produces: action types `ACTIONS.ADD_PANEL`, `ACTIONS.REMOVE_PANEL`, `ACTIONS.RENAME_PANEL`, `ACTIONS.TOGGLE_PANEL_EXPANDED` — exact payload shapes below — consumed by Task 3's `AccordionPanels.jsx` dispatch calls.

- [ ] **Step 1: Write the failing tests**

Append to `client/src/context/configuratorReducer.test.js`:

```js
function makeAccordionState(columns) {
  return makeState({
    pages: [{
      pageId: 'page-home', title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, slug: 'home', parentId: null,
      sections: [{ sectionId: 'section-1', layout: 'accordion', columns }],
    }],
  })
}

test('ADD_PANEL appends a panel with the next default label, collapsed and empty', () => {
  const state = makeAccordionState([
    { columnId: 'col-1', label: { it: 'Pannello 1', en: 'Panel 1', fr: 'Panneau 1', de: 'Panel 1' }, expanded: true, widgets: [] },
  ])
  const next = configuratorReducer(state, { type: ACTIONS.ADD_PANEL, payload: { sectionId: 'section-1' } })
  const columns = next.pages[0].sections[0].columns
  expect(columns).toHaveLength(2)
  expect(columns[1].label).toEqual({ it: 'Pannello 2', en: 'Panel 2', fr: 'Panneau 2', de: 'Panel 2' })
  expect(columns[1].expanded).toBe(false)
  expect(columns[1].widgets).toEqual([])
})

test('REMOVE_PANEL removes an empty panel when more than one panel remains', () => {
  const state = makeAccordionState([
    { columnId: 'col-1', label: { it: 'Pannello 1', en: 'Panel 1', fr: 'Panneau 1', de: 'Panel 1' }, expanded: false, widgets: [] },
    { columnId: 'col-2', label: { it: 'Pannello 2', en: 'Panel 2', fr: 'Panneau 2', de: 'Panel 2' }, expanded: false, widgets: [] },
  ])
  const next = configuratorReducer(state, { type: ACTIONS.REMOVE_PANEL, payload: { sectionId: 'section-1', columnId: 'col-2' } })
  expect(next.pages[0].sections[0].columns.map(c => c.columnId)).toEqual(['col-1'])
})

test('REMOVE_PANEL is a no-op when the target panel has widgets', () => {
  const state = makeAccordionState([
    { columnId: 'col-1', label: { it: 'Pannello 1', en: 'Panel 1', fr: 'Panneau 1', de: 'Panel 1' }, expanded: false, widgets: [{ instanceId: 'w1', blockId: 'a', props: {} }] },
    { columnId: 'col-2', label: { it: 'Pannello 2', en: 'Panel 2', fr: 'Panneau 2', de: 'Panel 2' }, expanded: false, widgets: [] },
  ])
  const next = configuratorReducer(state, { type: ACTIONS.REMOVE_PANEL, payload: { sectionId: 'section-1', columnId: 'col-1' } })
  expect(next).toBe(state)
})

test('REMOVE_PANEL is a no-op when it is the only panel left, even if empty', () => {
  const state = makeAccordionState([
    { columnId: 'col-1', label: { it: 'Pannello 1', en: 'Panel 1', fr: 'Panneau 1', de: 'Panel 1' }, expanded: false, widgets: [] },
  ])
  const next = configuratorReducer(state, { type: ACTIONS.REMOVE_PANEL, payload: { sectionId: 'section-1', columnId: 'col-1' } })
  expect(next).toBe(state)
})

test('RENAME_PANEL updates only the current language\'s label', () => {
  const state = makeAccordionState([
    { columnId: 'col-1', label: { it: 'Pannello 1', en: 'Panel 1', fr: 'Panneau 1', de: 'Panel 1' }, expanded: false, widgets: [] },
  ])
  const next = configuratorReducer(state, {
    type: ACTIONS.RENAME_PANEL,
    payload: { sectionId: 'section-1', columnId: 'col-1', lang: 'it', label: 'Domande Frequenti' },
  })
  expect(next.pages[0].sections[0].columns[0].label).toEqual({ it: 'Domande Frequenti', en: 'Panel 1', fr: 'Panneau 1', de: 'Panel 1' })
})

test('RENAME_PANEL ignores an empty/whitespace-only label', () => {
  const state = makeAccordionState([
    { columnId: 'col-1', label: { it: 'Pannello 1', en: 'Panel 1', fr: 'Panneau 1', de: 'Panel 1' }, expanded: false, widgets: [] },
  ])
  const next = configuratorReducer(state, {
    type: ACTIONS.RENAME_PANEL,
    payload: { sectionId: 'section-1', columnId: 'col-1', lang: 'it', label: '   ' },
  })
  expect(next).toBe(state)
})

test('TOGGLE_PANEL_EXPANDED flips a single panel\'s expanded flag', () => {
  const state = makeAccordionState([
    { columnId: 'col-1', label: { it: 'Pannello 1', en: 'Panel 1', fr: 'Panneau 1', de: 'Panel 1' }, expanded: false, widgets: [] },
    { columnId: 'col-2', label: { it: 'Pannello 2', en: 'Panel 2', fr: 'Panneau 2', de: 'Panel 2' }, expanded: false, widgets: [] },
  ])
  const next = configuratorReducer(state, { type: ACTIONS.TOGGLE_PANEL_EXPANDED, payload: { sectionId: 'section-1', columnId: 'col-1' } })
  expect(next.pages[0].sections[0].columns[0].expanded).toBe(true)
  expect(next.pages[0].sections[0].columns[1].expanded).toBe(false)
})

test('CHANGE_SECTION_LAYOUT from a grid layout to accordion turns each column into a labeled panel', () => {
  const state = makeState({
    pages: [{
      pageId: 'page-home', title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, slug: 'home', parentId: null,
      sections: [{
        sectionId: 'section-1', layout: 'twoColumn',
        columns: [
          { columnId: 'col-1', widgets: [{ instanceId: 'w1', blockId: 'a', props: {} }] },
          { columnId: 'col-2', widgets: [] },
        ],
      }],
    }],
  })
  const next = configuratorReducer(state, { type: ACTIONS.CHANGE_SECTION_LAYOUT, payload: { sectionId: 'section-1', layout: 'accordion' } })
  const columns = next.pages[0].sections[0].columns
  expect(next.pages[0].sections[0].layout).toBe('accordion')
  expect(columns).toHaveLength(2)
  expect(columns[0]).toEqual({ columnId: 'col-1', label: { it: 'Pannello 1', en: 'Panel 1', fr: 'Panneau 1', de: 'Panel 1' }, expanded: false, widgets: [{ instanceId: 'w1', blockId: 'a', props: {} }] })
  expect(columns[1].label).toEqual({ it: 'Pannello 2', en: 'Panel 2', fr: 'Panneau 2', de: 'Panel 2' })
})

test('CHANGE_SECTION_LAYOUT from accordion to a grid layout drops labels/expanded and keeps the existing overflow behavior', () => {
  const state = makeAccordionState([
    { columnId: 'col-1', label: { it: 'A', en: 'A', fr: 'A', de: 'A' }, expanded: true, widgets: [{ instanceId: 'w1', blockId: 'a', props: {} }] },
    { columnId: 'col-2', label: { it: 'B', en: 'B', fr: 'B', de: 'B' }, expanded: false, widgets: [{ instanceId: 'w2', blockId: 'b', props: {} }] },
    { columnId: 'col-3', label: { it: 'C', en: 'C', fr: 'C', de: 'C' }, expanded: false, widgets: [{ instanceId: 'w3', blockId: 'c', props: {} }] },
  ])
  const next = configuratorReducer(state, { type: ACTIONS.CHANGE_SECTION_LAYOUT, payload: { sectionId: 'section-1', layout: 'oneColumn' } })
  const columns = next.pages[0].sections[0].columns
  expect(columns).toHaveLength(1)
  expect(columns[0].label).toBeUndefined()
  expect(columns[0].expanded).toBeUndefined()
  expect(columns[0].widgets.map(w => w.instanceId)).toEqual(['w1', 'w2', 'w3'])
})

test('CHANGE_SECTION_LAYOUT to the same layout the section already has is a no-op (preserves custom labels)', () => {
  const state = makeAccordionState([
    { columnId: 'col-1', label: { it: 'Domande Frequenti', en: 'FAQ', fr: 'FAQ', de: 'FAQ' }, expanded: false, widgets: [] },
  ])
  const next = configuratorReducer(state, { type: ACTIONS.CHANGE_SECTION_LAYOUT, payload: { sectionId: 'section-1', layout: 'accordion' } })
  expect(next).toBe(state)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd client && npx vitest run src/context/configuratorReducer.test.js`
Expected: FAIL — `ACTIONS.ADD_PANEL` etc. are `undefined` (not yet in the `ACTIONS` map), and the reducer has no matching `case` for them; the two `CHANGE_SECTION_LAYOUT` accordion tests fail because that case doesn't yet branch on `kind`.

- [ ] **Step 3: Add the 4 new action types**

In `client/src/context/configuratorReducer.js`, add to the `ACTIONS` object (anywhere after `CHANGE_SECTION_LAYOUT`):

```js
  ADD_PANEL:            'ADD_PANEL',
  REMOVE_PANEL:          'REMOVE_PANEL',
  RENAME_PANEL:          'RENAME_PANEL',
  TOGGLE_PANEL_EXPANDED: 'TOGGLE_PANEL_EXPANDED',
```

- [ ] **Step 4: Add the `toAccordionPanels`/`toGridColumns` helpers**

Add immediately after the `emptyColumns` function (Task 1's location):

```js
function toAccordionPanels(columns) {
  return columns.map((c, i) => ({
    columnId: c.columnId,
    label: defaultPanelLabel(i + 1),
    expanded: false,
    widgets: c.widgets,
  }))
}

function toGridColumns(columns) {
  return columns.map(c => ({ columnId: c.columnId, widgets: c.widgets }))
}
```

- [ ] **Step 5: Rewrite `CHANGE_SECTION_LAYOUT`**

Replace the existing case (lines 199-224) with:

```js
    case ACTIONS.CHANGE_SECTION_LAYOUT: {
      const { sectionId, layout: newLayoutKey } = action.payload
      const newLayout = SECTION_LAYOUTS[newLayoutKey]
      return updateActivePageSections(state, sections =>
        sections.map(section => {
          if (section.sectionId !== sectionId) return section
          if (section.layout === newLayoutKey) return section

          const oldLayout = SECTION_LAYOUTS[section.layout]

          if (newLayout.kind === 'accordion') {
            return { ...section, layout: newLayoutKey, columns: toAccordionPanels(section.columns) }
          }

          const fromColumns = oldLayout.kind === 'accordion' ? toGridColumns(section.columns) : section.columns

          let newColumns
          if (newLayout.columns >= fromColumns.length) {
            newColumns = [...fromColumns]
            while (newColumns.length < newLayout.columns) {
              newColumns.push({ columnId: generateId(), widgets: [] })
            }
          } else {
            const kept = fromColumns.slice(0, newLayout.columns)
            const overflowWidgets = fromColumns.slice(newLayout.columns).flatMap(c => c.widgets)
            newColumns = kept.map((c, i) =>
              i === kept.length - 1 ? { ...c, widgets: [...c.widgets, ...overflowWidgets] } : c
            )
          }

          return { ...section, layout: newLayoutKey, columns: newColumns }
        })
      )
    }
```

Note the new `if (section.layout === newLayoutKey) return section` guard at the top — this is what makes re-selecting the same layout a true no-op (`next).toBe(state)` in the test, not just behaviorally equivalent — `updateActivePageSections`'s `.map` returns the exact same `section` object reference, and since nothing else in the page changed, the whole `next` state is reference-equal to the input `state` for that specific test's single-section page. (If other sections existed, only the targeted section would be unchanged-by-reference; the page/sections array wrapper would still be a new object from `.map`, exactly as the existing `CHANGE_SECTION_LAYOUT increasing columns` test already accepts new-array-with-old-references norms — this test happens to have only one section, making the whole-state reference-equality assertion valid.)

- [ ] **Step 6: Add the 4 new reducer cases**

Add immediately after the `CHANGE_SECTION_LAYOUT` case:

```js
    case ACTIONS.ADD_PANEL: {
      const { sectionId } = action.payload
      return updateActivePageSections(state, sections =>
        sections.map(section => {
          if (section.sectionId !== sectionId) return section
          const newPanel = {
            columnId: generateId(),
            label: defaultPanelLabel(section.columns.length + 1),
            expanded: false,
            widgets: [],
          }
          return { ...section, columns: [...section.columns, newPanel] }
        })
      )
    }
    case ACTIONS.REMOVE_PANEL: {
      const { sectionId, columnId } = action.payload
      return updateActivePageSections(state, sections =>
        sections.map(section => {
          if (section.sectionId !== sectionId) return section
          const panel = section.columns.find(c => c.columnId === columnId)
          if (!panel || panel.widgets.length > 0 || section.columns.length <= 1) return section
          return { ...section, columns: section.columns.filter(c => c.columnId !== columnId) }
        })
      )
    }
    case ACTIONS.RENAME_PANEL: {
      const { sectionId, columnId, lang, label } = action.payload
      const trimmed = label.trim()
      if (!trimmed) return state
      return updateActivePageSections(state, sections =>
        sections.map(section => {
          if (section.sectionId !== sectionId) return section
          return {
            ...section,
            columns: section.columns.map(c =>
              c.columnId === columnId ? { ...c, label: { ...c.label, [lang]: trimmed } } : c
            ),
          }
        })
      )
    }
    case ACTIONS.TOGGLE_PANEL_EXPANDED: {
      const { sectionId, columnId } = action.payload
      return updateActivePageSections(state, sections =>
        sections.map(section => {
          if (section.sectionId !== sectionId) return section
          return {
            ...section,
            columns: section.columns.map(c =>
              c.columnId === columnId ? { ...c, expanded: !c.expanded } : c
            ),
          }
        })
      )
    }
```

Important: `ACTIONS.REMOVE_PANEL`'s guard (`!panel || panel.widgets.length > 0 || section.columns.length <= 1`) re-checks the same two conditions inside the reducer itself — Task 3's UI will also hide the delete button under the same conditions, but the reducer never trusts that alone, mirroring `REMOVE_SECTION`'s existing double-guard exactly.

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd client && npx vitest run src/context/configuratorReducer.test.js`
Expected: PASS, all tests including the pre-existing `CHANGE_SECTION_LAYOUT increasing/decreasing columns` ones (grid→grid transitions are untouched by the rewrite — same logic, just now reached via `fromColumns` which equals `section.columns` unchanged when `oldLayout.kind !== 'accordion'`).

- [ ] **Step 8: Commit**

```bash
git add client/src/context/configuratorReducer.js client/src/context/configuratorReducer.test.js
git commit -m "feat: add panel management actions and grid<->accordion layout conversion"
```

---

### Task 3: Accordion rendering

**Files:**
- Create: `client/src/components/canvas/AccordionPanels.jsx`
- Modify: `client/src/components/canvas/CanvasSection.jsx`
- Modify: `client/src/components/canvas/SectionLayoutPicker.jsx`
- Modify: `client/src/locales/it.json`, `en.json`, `fr.json`, `de.json`

**Interfaces:**
- Consumes: `ACTIONS.ADD_PANEL`/`REMOVE_PANEL`/`RENAME_PANEL`/`TOGGLE_PANEL_EXPANDED` from Task 2; `SECTION_LAYOUTS[key].kind` from Task 1; `CanvasColumn` (unmodified, `{sectionId, column, widthHint, readOnly}`); `useLang()`, `t2(field, lang)`.
- Produces: `export default function AccordionPanels({ section, readOnly })` — consumed by `CanvasSection.jsx` in this same task.

- [ ] **Step 1: Create `AccordionPanels.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'
import CanvasColumn from './CanvasColumn.jsx'

function PanelLabel({ panel, lang, onRename }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(t2(panel.label, lang))

  useEffect(() => {
    if (!editing) setDraft(t2(panel.label, lang))
  }, [panel.label, lang, editing])

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    const current = t2(panel.label, lang)
    if (trimmed && trimmed !== current) {
      onRename(trimmed)
    } else {
      setDraft(current)
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(t2(panel.label, lang)); setEditing(false) }
        }}
        onClick={e => e.stopPropagation()}
        className="flex-1 bg-white text-navy text-sm px-1.5 py-0.5 rounded border border-blue focus:outline-none min-w-0"
      />
    )
  }

  return (
    <span
      onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
      className="flex-1 text-sm font-medium text-navy truncate"
    >
      {t2(panel.label, lang)}
    </span>
  )
}

export default function AccordionPanels({ section, readOnly = false }) {
  const { dispatch, ACTIONS } = useConfigurator()
  const { t } = useTranslation()
  const lang = useLang()
  const canRemovePanel = section.columns.length > 1

  return (
    <div className="space-y-2">
      {section.columns.map(panel => {
        const isEmpty = panel.widgets.length === 0

        return (
          <div key={panel.columnId} className="rounded-xl border border-slate-mid overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={panel.expanded}
              aria-label={t('canvas.togglePanel')}
              onClick={e => {
                e.stopPropagation()
                dispatch({ type: ACTIONS.TOGGLE_PANEL_EXPANDED, payload: { sectionId: section.sectionId, columnId: panel.columnId } })
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  dispatch({ type: ACTIONS.TOGGLE_PANEL_EXPANDED, payload: { sectionId: section.sectionId, columnId: panel.columnId } })
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-surface cursor-pointer"
            >
              {panel.expanded ? <ChevronDown size={14} className="flex-shrink-0 text-slate" /> : <ChevronRight size={14} className="flex-shrink-0 text-slate" />}
              {readOnly ? (
                <span className="flex-1 text-sm font-medium text-navy truncate">{t2(panel.label, lang)}</span>
              ) : (
                <PanelLabel
                  panel={panel}
                  lang={lang}
                  onRename={label => dispatch({
                    type: ACTIONS.RENAME_PANEL,
                    payload: { sectionId: section.sectionId, columnId: panel.columnId, lang, label },
                  })}
                />
              )}
              {!readOnly && isEmpty && canRemovePanel && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    dispatch({ type: ACTIONS.REMOVE_PANEL, payload: { sectionId: section.sectionId, columnId: panel.columnId } })
                  }}
                  aria-label={t('canvas.removePanel')}
                  className="text-slate-light hover:text-red-500 flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            {panel.expanded && (
              <div className="p-3">
                <CanvasColumn sectionId={section.sectionId} column={panel} widthHint="full" readOnly={readOnly} />
              </div>
            )}
          </div>
        )
      })}

      {!readOnly && (
        <button
          type="button"
          onClick={() => dispatch({ type: ACTIONS.ADD_PANEL, payload: { sectionId: section.sectionId } })}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-light hover:text-blue border border-dashed border-slate-mid hover:border-blue rounded-lg px-3 py-1.5 transition-colors"
        >
          <Plus size={14} /> {t('canvas.addPanel')}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire it into `CanvasSection.jsx`**

Add the import alongside the existing ones:

```js
import AccordionPanels from './AccordionPanels.jsx'
```

In the `readOnly` branch (currently lines 18-31), branch on `section.layout`:

```jsx
  if (readOnly) {
    if (section.layout === 'accordion') {
      return <AccordionPanels section={section} readOnly />
    }
    return (
      <div className={`mb-4 grid ${layout.gridCols} gap-3`}>
        {section.columns.map((column, i) => (
          <CanvasColumn
            key={column.columnId}
            sectionId={section.sectionId}
            column={column}
            widthHint={layout.widths[i]}
            readOnly
          />
        ))}
      </div>
    )
  }
```

In the editable branch, replace only the final grid `<div>` (currently lines 87-96) — everything above it (the outer selectable wrapper, the hover icons, the `AccessibleMenu`/`SectionLayoutPicker` for changing layout) stays exactly as it is today:

```jsx
      {section.layout === 'accordion' ? (
        <AccordionPanels section={section} />
      ) : (
        <div className={`grid ${layout.gridCols} gap-3`}>
          {section.columns.map((column, i) => (
            <CanvasColumn
              key={column.columnId}
              sectionId={section.sectionId}
              column={column}
              widthHint={layout.widths[i]}
            />
          ))}
        </div>
      )}
```

Note: `const layout = SECTION_LAYOUTS[section.layout]` (existing line) stays unconditional at the top of the component — for an accordion section, `layout` resolves to `{ label: 'Accordion', kind: 'accordion' }`, which has no `gridCols`/`widths`, but those are now only read inside the grid branch, which doesn't execute for accordion sections. The `isEmpty` calculation (`section.columns.every(c => c.widgets.length === 0)`, used to show/hide the "delete section" icon) is unaffected — it only reads `widgets`, present on both column shapes.

- [ ] **Step 3: Add the `Rows3` icon branch to `SectionLayoutPicker.jsx`**

Replace the file:

```jsx
import { Rows3 } from 'lucide-react'
import { SECTION_LAYOUTS } from '../../data/sectionLayouts.js'

export default function SectionLayoutPicker({ value, onSelect, asMenuItems = false }) {
  return (
    <div className="flex gap-1.5 bg-white rounded-lg border border-gray-200 shadow-lg p-1.5">
      {Object.entries(SECTION_LAYOUTS).map(([key, layout]) => (
        <button
          key={key}
          type="button"
          role={asMenuItems ? 'menuitem' : undefined}
          onClick={() => onSelect(key)}
          title={layout.label}
          className={`
            w-10 h-8 rounded border p-1 grid gap-0.5 ${layout.kind === 'grid' ? layout.gridCols : 'grid-rows-3'}
            ${value === key ? 'border-blue ring-1 ring-blue/30' : 'border-gray-200 hover:border-gray-300'}
          `}
        >
          {layout.kind === 'grid' ? (
            Array.from({ length: layout.columns }).map((_, i) => (
              <div key={i} className="bg-gray-300 rounded-sm" />
            ))
          ) : (
            <Rows3 size={16} className="text-gray-500 m-auto" />
          )}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Add the 3 new i18n keys to all 4 locale files**

In `client/src/locales/it.json`, inside the existing `canvas` object, add (after `"hidden": "Nascosto"` — remember to add a trailing comma to that line since it's no longer last):

```json
"addPanel": "+ Aggiungi pannello",
"removePanel": "Rimuovi pannello",
"togglePanel": "Apri/chiudi pannello"
```

In `client/src/locales/en.json`:

```json
"addPanel": "+ Add panel",
"removePanel": "Remove panel",
"togglePanel": "Toggle panel"
```

In `client/src/locales/fr.json`:

```json
"addPanel": "+ Ajouter un panneau",
"removePanel": "Supprimer le panneau",
"togglePanel": "Ouvrir/fermer le panneau"
```

In `client/src/locales/de.json`:

```json
"addPanel": "+ Panel hinzufügen",
"removePanel": "Panel entfernen",
"togglePanel": "Panel auf-/zuklappen"
```

- [ ] **Step 5: Manually verify in the running app**

Run: `cd client && npm run dev`, open the app, click "Aggiungi sezione", select the new Accordion icon (3 stacked bars). Confirm: 2 panels appear ("Pannello 1"/"Pannello 2"), each collapsed by default; clicking a header toggles it open/closed; double-clicking a label lets you rename it; the "+ Aggiungi pannello" button adds a 3rd panel; the trash icon only appears on empty panels when more than one panel exists.

- [ ] **Step 6: Run the full test suites**

Run: `cd client && npm run test:unit && npm run test:e2e`
Expected: unit suite unchanged from Task 2's count, all passing. e2e suite: same pass count and same 2 pre-existing unrelated failures (deploy-flow timeout, Deploy-modal a11y) as the project's established baseline — this task adds no new e2e tests yet (Task 4 does), so the count should be identical to before this task.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/canvas/AccordionPanels.jsx client/src/components/canvas/CanvasSection.jsx client/src/components/canvas/SectionLayoutPicker.jsx client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json
git commit -m "feat: render accordion panels in the canvas, reusing CanvasSection's existing chrome"
```

---

### Task 4: "Move to column" label improvement and end-to-end tests

**Files:**
- Modify: `client/src/components/canvas/CanvasBlock.jsx:1-40`
- Modify: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: `useLang()`, `t2(field, lang)` (same utilities Task 3 used); accordion panels' `label` field from Task 1/2.

- [ ] **Step 1: Update `CanvasBlock.jsx`'s `otherColumns` to show real panel labels**

Add these two imports alongside the existing ones:

```js
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'
```

Add `const lang = useLang()` alongside the component's existing hook calls (near `const { t } = useTranslation()`).

Replace the `otherColumns` computation:

```js
  const otherColumns = activePage.sections.flatMap((section, si) =>
    section.columns.map((column, ci) => ({
      sectionId: section.sectionId,
      columnId: column.columnId,
      label: column.label ? t2(column.label, lang) : t('canvas.sectionCol', { section: si + 1, col: ci + 1 }),
    }))
  ).filter(c => !(c.sectionId === sectionId && c.columnId === columnId))
```

Grid columns have no `label` field, so they keep the exact generic text they show today; accordion panels show their real, author-chosen name.

- [ ] **Step 2: Write the end-to-end tests**

Append to `client/tests/smoke.spec.js`, inside the existing `test.describe('ShareFlow configurator smoke test', ...)` block:

```js
  test('creating an Accordion section adds 2 default panels, collapsed', async ({ page }) => {
    await page.getByRole('button', { name: 'Aggiungi sezione' }).click()
    await page.getByTitle('Accordion').click()

    const main = page.locator('main')
    await expect(main.getByText('Pannello 1', { exact: true })).toBeVisible()
    await expect(main.getByText('Pannello 2', { exact: true })).toBeVisible()
    await expect(main.getByRole('button', { name: 'Apri/chiudi pannello' }).first()).toHaveAttribute('aria-expanded', 'false')
  })

  test('toggling an accordion panel expands and collapses it', async ({ page }) => {
    await page.getByRole('button', { name: 'Aggiungi sezione' }).click()
    await page.getByTitle('Accordion').click()

    const toggle = page.locator('main').getByRole('button', { name: 'Apri/chiudi pannello' }).first()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  test('renaming an accordion panel updates its visible label', async ({ page }) => {
    await page.getByRole('button', { name: 'Aggiungi sezione' }).click()
    await page.getByTitle('Accordion').click()

    await page.locator('main').getByText('Pannello 1', { exact: true }).dblclick()
    const input = page.locator('main').getByRole('textbox')
    await input.fill('Domande Frequenti')
    await input.press('Enter')

    await expect(page.locator('main').getByText('Domande Frequenti', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('Pannello 1', { exact: true })).not.toBeVisible()
  })

  test('adding and removing an accordion panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Aggiungi sezione' }).click()
    await page.getByTitle('Accordion').click()

    await page.locator('main').getByRole('button', { name: '+ Aggiungi pannello' }).click()
    await expect(page.locator('main').getByText('Pannello 3', { exact: true })).toBeVisible()

    const removeButtons = page.locator('main').getByRole('button', { name: 'Rimuovi pannello' })
    await expect(removeButtons).toHaveCount(3)
    await removeButtons.last().click()
    await expect(page.locator('main').getByText('Pannello 3', { exact: true })).not.toBeVisible()
  })

  test('a widget moved into a collapsed accordion panel appears there once reopened', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    await page.getByRole('button', { name: 'Aggiungi sezione' }).click()
    await page.getByTitle('Accordion').click()

    const newsBlock = page.locator('main div.group.bg-white', { hasText: 'News - Corporate' })
    await newsBlock.hover()
    await newsBlock.getByRole('button', { name: 'Sposta in un\'altra colonna' }).click()
    await page.getByRole('menuitem', { name: 'Pannello 1' }).click()

    const panel1Toggle = page.locator('main').getByRole('button', { name: 'Apri/chiudi pannello' }).first()
    await expect(panel1Toggle).toHaveAttribute('aria-expanded', 'false')
    await panel1Toggle.click()
    await expect(page.locator('main').getByText('News - Corporate', { exact: true })).toBeVisible()
  })
```

The "adding and removing" test relies on the 3rd panel having 0 widgets and there being more than 1 panel — both true right after `ADD_PANEL`, so the delete button is visible per `AccordionPanels.jsx`'s `isEmpty && canRemovePanel` condition. The last test does not need to add a 2nd panel before removing one (2 panels already exist by default), satisfying `canRemovePanel` after the move (3 panels would exist if combined with the previous test, but each test starts from a fresh page per `beforeEach`).

- [ ] **Step 3: Run the new tests**

Run: `cd client && npm run test:e2e -- -g "Accordion|accordion"`
Expected: PASS (5/5)

- [ ] **Step 4: Run the full unit and e2e suites**

Run: `cd client && npm run test:unit`
Expected: PASS, same count as Task 2's end state.

Run: `cd client && npm run test:e2e`
Expected: PASS, previous baseline count + 5 new tests, with the same 2 pre-existing unrelated failures (deploy-flow timeout, Deploy-modal a11y) carried forward unchanged.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/canvas/CanvasBlock.jsx client/tests/smoke.spec.js
git commit -m "feat: show real panel names in the move-to-column menu, add accordion e2e coverage"
```
