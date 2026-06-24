# Phase 6 Sub-Project 2 — Rich-Rendering Content Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 new ShareFlow catalog blocks (Calendario, Carosello, Timeline Aziendale) whose canvas preview needs dedicated rendering logic beyond the existing generic list/grid/skeleton patterns, and wire them into 2 existing page templates.

**Architecture:** Each block gets its own preview component in `client/src/components/canvas/` (not inlined into the existing `CanvasBlockPreview.jsx` monolith), dispatched from it with a single `if` line each. A shared `BlockPreviewHeader.jsx` (extracted from the monolith) is reused by all of them. Two of the three blocks need real algorithmic logic (month-grid layout, carousel index wrap-around) — that logic is extracted into small pure functions, unit-tested with Vitest, completely separate from the React rendering.

**Tech Stack:** React 19, Vite, lucide-react icons, react-i18next, Tailwind, Vitest (pure-logic unit tests), Playwright (e2e).

## Global Constraints

- No new npm dependencies — `lucide-react`, `react-i18next`, `react` are already installed and are all this work needs. Icons confirmed to exist in the installed `lucide-react` version: `CalendarClock`, `GalleryHorizontalEnd`, `Milestone`, `ChevronLeft`, `ChevronRight`.
- Exact new block ids: `calendario-eventi` (category `COMMUNICATION`, icon `CalendarClock`), `carosello-contenuti` (category `COMMUNICATION`, icon `GalleryHorizontalEnd`), `timeline-aziendale` (category `KNOWLEDGE_BASE`, icon `Milestone`). Do not reuse `CalendarRange` — it already belongs to `eventi-country`.
- All three new catalog entries use `defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible']` — the same shape as `kudos`/`anniversari`/`collegamenti-rapidi`.
- Pure logic (`calendarGrid.js`, `carouselIndex.js`) is tested with Vitest and must have **zero DOM dependency** — this repo's Vitest runs in plain `node` environment (no jsdom), per `client/vitest.config.js`. Test files must match the existing glob `client/src/**/*.test.js`.
- Every interactive control inside a block preview (carousel prev/next/dot buttons) must call `e.stopPropagation()` before changing state — matches the existing pattern in `client/src/components/canvas/CanvasBlock.jsx` for its drag handle, remove, and move-to-column buttons, which all stop propagation so they don't get tangled up with the parent's click-to-select handler.
- Every new icon-only interactive control needs a translated `aria-label` via `t(...)`, matching the existing convention (`canvas.dragHandle`, `canvas.removeBlock`, `canvas.moveToOtherColumn` are all i18n keys, not hardcoded strings).
- The sidebar tooltip feature looks up `tooltips.blocks.${block.id}` for every catalog block. Any new block without a matching key in all 4 locale files will show a raw i18n key as its tooltip text instead of real copy — this is treated as equally required as the catalog label itself.
- Page template descriptions in `client/src/data/pageTemplates.js` (`description` field) are **not** updated by this plan — matches the precedent set when Phase 6 sub-project 1 added `kudos`/`anniversari`/`contatti-chiave` to `employee-hub` without rewording its description.
- Test commands (run from `client/`): `npm run test:unit` (Vitest, no jsdom) and `npm run test:e2e` (Playwright). `client/tests/smoke.spec.js`'s `beforeEach` sets `localStorage.setItem('i18nextLng', 'it')` before navigating — every e2e assertion in this plan uses the Italian strings for that reason.

---

### Task 1: Extract `BlockPreviewHeader.jsx` from the monolith

**Files:**
- Create: `client/src/components/canvas/BlockPreviewHeader.jsx`
- Modify: `client/src/components/canvas/CanvasBlockPreview.jsx:1-44` (remove the local `Header` function, add an import)
- Test: existing Playwright suite (no new test — this is a no-behavior-change refactor; verified by the full suite still passing)

**Interfaces:**
- Produces: `export default function Header({ template, block, Icon, showSeeAll = true })` — a JSX component, importable from `./BlockPreviewHeader.jsx`. Tasks 2-4 import this.

This task must run first: every other task's new component imports `BlockPreviewHeader.jsx`, which does not exist until this task creates it.

- [ ] **Step 1: Create the new header file with the function moved verbatim**

`CanvasBlockPreview.jsx` currently defines `Header` locally (lines 26-43) and never exports it. Move it into its own file. It only uses `useTranslation` from its current imports — it does not reference the `icons` namespace import (it receives `Icon` as a prop), so the new file does not need that import.

```jsx
import { useTranslation } from 'react-i18next'

export default function Header({ template, block, Icon, showSeeAll = true }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={16} className={`${template.card.accentText} flex-shrink-0`} />
        <span className={`text-sm font-semibold truncate ${template.card.text}`}>
          {t(`blocks.labels.${block.id}`, { defaultValue: block.label })}
        </span>
      </div>
      {showSeeAll && (
        <span className={`text-xs font-medium flex-shrink-0 ${template.card.accentText}`}>
          {t('blocks.seeAll')}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update `CanvasBlockPreview.jsx` to import it instead of defining it locally**

Remove lines 26-43 (the local `function Header(...) { ... }` block) entirely. Add this import alongside the existing imports at the top of the file:

```js
import Header from './BlockPreviewHeader.jsx'
```

The file's only other imports (`icons`, `useTranslation`, `useTheme`) and every one of its 13 `<Header ... />` call sites stay exactly as they are — only where `Header` is *defined* changes.

- [ ] **Step 3: Run the full e2e suite to confirm zero behavior change**

Run: `cd client && npm run test:e2e`
Expected: same pass/fail counts as before this change (52 passed; 2 pre-existing unrelated failures: a deploy-flow timeout and a Deploy-modal accessibility violation — both predate this plan and are not part of its scope). If any *other* test now fails, stop and investigate before proceeding — it means the extraction broke something.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/canvas/BlockPreviewHeader.jsx client/src/components/canvas/CanvasBlockPreview.jsx
git commit -m "refactor: extract BlockPreviewHeader from CanvasBlockPreview monolith"
```

---

### Task 2: Calendario (`calendario-eventi`)

**Files:**
- Create: `client/src/components/canvas/calendarGrid.js`
- Create: `client/src/components/canvas/calendarGrid.test.js`
- Create: `client/src/components/canvas/CalendarBlockPreview.jsx`
- Modify: `client/src/data/blockCatalog.js:52` (insert new catalog entry after the `linkedin-feed` line)
- Modify: `client/src/data/blockContentSchemas.js:146` (insert new content schema after `sezione-mostre`, before the `// ── Learning` comment)
- Modify: `client/src/data/pageTemplates.js:17-21` (`communication-home` sections array)
- Modify: `client/src/components/canvas/CanvasBlockPreview.jsx` (add import + dispatch line)
- Modify: `client/src/locales/it.json`, `en.json`, `fr.json`, `de.json` (add `blocks.labels.calendario-eventi` and `tooltips.blocks.calendario-eventi`)
- Modify: `client/tests/smoke.spec.js` (new test)

**Interfaces:**
- Consumes: `Header` from Task 1's `./BlockPreviewHeader.jsx`.
- Produces: `export function getMonthGrid(year, month)` from `calendarGrid.js` — returns an array of weeks; each week is an array of exactly 7 cell objects `{ day: number, inMonth: boolean }`. `month` is 0-indexed (JS `Date` convention: 0 = January). Used only inside `CalendarBlockPreview.jsx` in this plan, but is a standalone pure export other future calendar work could reuse.

- [ ] **Step 1: Write the failing Vitest test for `getMonthGrid`**

These two fixed months were picked and their exact expected output verified by running the algorithm directly in Node before writing this test: June 2026 starts on a Monday (no leading padding), and February 2024 is a leap year with 3 days of leading padding — between them they exercise leading padding, trailing padding, and a leap-year day count.

```js
import { describe, test, expect } from 'vitest'
import { getMonthGrid } from './calendarGrid.js'

describe('getMonthGrid', () => {
  test('a month starting on Monday has no leading padding (June 2026)', () => {
    const weeks = getMonthGrid(2026, 5) // month is 0-indexed: 5 = June
    expect(weeks).toHaveLength(5)
    expect(weeks[0]).toEqual([
      { day: 1, inMonth: true }, { day: 2, inMonth: true }, { day: 3, inMonth: true },
      { day: 4, inMonth: true }, { day: 5, inMonth: true }, { day: 6, inMonth: true }, { day: 7, inMonth: true },
    ])
    expect(weeks[4]).toEqual([
      { day: 29, inMonth: true }, { day: 30, inMonth: true },
      { day: 1, inMonth: false }, { day: 2, inMonth: false }, { day: 3, inMonth: false },
      { day: 4, inMonth: false }, { day: 5, inMonth: false },
    ])
  })

  test('a leap-year February has 3 days of leading padding (February 2024)', () => {
    const weeks = getMonthGrid(2024, 1) // month is 0-indexed: 1 = February
    expect(weeks).toHaveLength(5)
    expect(weeks[0]).toEqual([
      { day: 29, inMonth: false }, { day: 30, inMonth: false }, { day: 31, inMonth: false },
      { day: 1, inMonth: true }, { day: 2, inMonth: true }, { day: 3, inMonth: true }, { day: 4, inMonth: true },
    ])
    expect(weeks[4]).toEqual([
      { day: 26, inMonth: true }, { day: 27, inMonth: true }, { day: 28, inMonth: true }, { day: 29, inMonth: true },
      { day: 1, inMonth: false }, { day: 2, inMonth: false }, { day: 3, inMonth: false },
    ])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd client && npx vitest run src/components/canvas/calendarGrid.test.js`
Expected: FAIL — `calendarGrid.js` does not exist yet (`Failed to resolve import "./calendarGrid.js"`).

- [ ] **Step 3: Implement `calendarGrid.js`**

```js
/**
 * Builds a 7-column, Monday-first month grid.
 * Returns an array of weeks; each week is an array of 7 cells.
 * Leading/trailing cells from the previous/next month carry inMonth: false.
 */
export function getMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7 // 0 = Monday … 6 = Sunday

  const cells = []
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, inMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, inMonth: true })
  }
  let nextMonthDay = 1
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextMonthDay++, inMonth: false })
  }

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd client && npx vitest run src/components/canvas/calendarGrid.test.js`
Expected: PASS (2/2 tests)

- [ ] **Step 5: Commit the pure logic**

```bash
git add client/src/components/canvas/calendarGrid.js client/src/components/canvas/calendarGrid.test.js
git commit -m "feat: add getMonthGrid pure month-layout helper"
```

- [ ] **Step 6: Create `CalendarBlockPreview.jsx`**

Renders the current calendar month; days carrying a `contentItems` event get a small dot underneath. With no `contentItems`, the grid still renders fully (a month is never empty — that's a real state, not a loading state), just with no dots.

```jsx
import * as icons from 'lucide-react'
import Header from './BlockPreviewHeader.jsx'
import { useTheme } from '../../hooks/useTheme.js'
import { getMonthGrid } from './calendarGrid.js'

const WEEKDAY_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

export default function CalendarBlockPreview({ block, contentItems = [] }) {
  const { template } = useTheme()
  const Icon = icons[block.icon] ?? icons.Box
  const today = new Date()
  const weeks = getMonthGrid(today.getFullYear(), today.getMonth())

  const eventDays = new Set(
    contentItems
      .map(item => item.date && new Date(item.date))
      .filter(d => d && d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth())
      .map(d => d.getDate())
  )

  return (
    <div>
      <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} className={`text-[10px] font-semibold ${template.card.textMuted}`}>{label}</span>
        ))}
        {weeks.flat().map((cell, i) => (
          <div key={i} className="flex flex-col items-center py-0.5">
            <span className={`text-[11px] ${cell.inMonth ? template.card.text : `${template.card.textMuted} opacity-40`}`}>
              {cell.day}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full mt-0.5 ${cell.inMonth && eventDays.has(cell.day) ? template.card.iconBg : ''}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Add the catalog entry**

In `client/src/data/blockCatalog.js`, insert this line immediately after the `linkedin-feed` entry (line 52), still inside the `// ── COMMUNICATION ──` group:

```js
{ id: 'calendario-eventi',   label: 'Calendario',                category: CATEGORIES.COMMUNICATION, icon: 'CalendarClock', defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
```

- [ ] **Step 8: Add the content schema**

In `client/src/data/blockContentSchemas.js`, insert this entry immediately after the `sezione-mostre` entry (after line 146), still before the `// ── Learning` comment:

```js
'calendario-eventi': {
  sourceTypes: ['sharepoint-list', 'manual'],
  schema: [
    { key: 'title',    label: 'Titolo', type: 'text', required: true  },
    { key: 'date',     label: 'Data',   type: 'date', required: true  },
    { key: 'location', label: 'Luogo',  type: 'text', required: false },
  ],
},
```

- [ ] **Step 9: Wire it into `CanvasBlockPreview.jsx`**

Add this import alongside the `Header` import added in Task 1:

```js
import CalendarBlockPreview from './CalendarBlockPreview.jsx'
```

Add this dispatch line near the top of the component body, before the `// ── generic fallback` branch (placing it next to the other single-block `if` branches like `countdown-lancio` is fine — order between these `if` branches does not matter since the ids are mutually exclusive):

```js
if (block.id === 'calendario-eventi') return <CalendarBlockPreview block={block} contentItems={contentItems} />
```

- [ ] **Step 10: Add the page template wiring**

In `client/src/data/pageTemplates.js`, the `communication-home` template's `sections` array currently ends with the `multimedia-gallery` section (lines 17-21):

```js
sections: [
  { layout: 'twoColumn', blocks: [['news-corporate'], ['avvisi-homepage']] },
  { layout: 'oneColumn', blocks: [['eventi-corporate']] },
  { layout: 'oneColumn', blocks: [['multimedia-gallery']] },
],
```

Add a new section after it:

```js
sections: [
  { layout: 'twoColumn', blocks: [['news-corporate'], ['avvisi-homepage']] },
  { layout: 'oneColumn', blocks: [['eventi-corporate']] },
  { layout: 'oneColumn', blocks: [['multimedia-gallery']] },
  { layout: 'oneColumn', blocks: [['calendario-eventi']] },
],
```

- [ ] **Step 11: Add the i18n keys to all 4 locale files**

In `client/src/locales/it.json`, add to `blocks.labels` (after `"desc-funzione"`, before the closing `}` of `labels`):
```json
"calendario-eventi": "Calendario"
```
And to `tooltips.blocks` (after `"desc-funzione"`, before the closing `}` of `blocks`):
```json
"calendario-eventi": "Mostra gli eventi del mese in corso in una vista calendario."
```

In `client/src/locales/en.json`, same two insertion points:
```json
"calendario-eventi": "Calendar"
```
```json
"calendario-eventi": "Shows this month's events in a calendar view."
```

In `client/src/locales/fr.json`:
```json
"calendario-eventi": "Calendrier"
```
```json
"calendario-eventi": "Affiche les événements du mois en cours dans une vue calendrier."
```

In `client/src/locales/de.json`:
```json
"calendario-eventi": "Kalender"
```
```json
"calendario-eventi": "Zeigt die Ereignisse des aktuellen Monats in einer Kalenderansicht."
```

Remember each is a comma-separated JSON object entry — add a trailing comma to the *previous* last entry (`"desc-funzione": "..."`) in each of the 8 edited objects (4 files × 2 objects) since it's no longer the last key.

- [ ] **Step 12: Write the Playwright e2e test**

Append to `client/tests/smoke.spec.js`, inside the existing `test.describe('ShareFlow configurator smoke test', ...)` block:

```js
test('Calendario block is visible in the library and in the Homepage Comunicazione template', async ({ page }) => {
  await expect(page.getByText('Calendario', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Template', exact: true }).click()
  await page.getByText('Homepage Comunicazione', { exact: true }).click()
  await expect(page.locator('main').getByText('Calendario', { exact: true })).toBeVisible()
})
```

- [ ] **Step 13: Run the e2e suite to verify it passes**

Run: `cd client && npm run test:e2e -- -g "Calendario"`
Expected: PASS (1/1)

- [ ] **Step 14: Commit the feature**

```bash
git add client/src/components/canvas/CalendarBlockPreview.jsx client/src/components/canvas/CanvasBlockPreview.jsx client/src/data/blockCatalog.js client/src/data/blockContentSchemas.js client/src/data/pageTemplates.js client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json client/tests/smoke.spec.js
git commit -m "feat: add Calendario block (calendario-eventi) with month-grid preview"
```

---

### Task 3: Carosello (`carosello-contenuti`)

**Files:**
- Create: `client/src/components/canvas/carouselIndex.js`
- Create: `client/src/components/canvas/carouselIndex.test.js`
- Create: `client/src/components/canvas/CarouselBlockPreview.jsx`
- Modify: `client/src/data/blockCatalog.js` (insert new catalog entry after the `calendario-eventi` entry added in Task 2)
- Modify: `client/src/data/blockContentSchemas.js` (insert new content schema after `calendario-eventi`)
- Modify: `client/src/data/pageTemplates.js` (`communication-home` sections array, after Task 2's edit)
- Modify: `client/src/components/canvas/CanvasBlockPreview.jsx` (add import + dispatch line)
- Modify: `client/src/locales/it.json`, `en.json`, `fr.json`, `de.json` (add `blocks.labels.carosello-contenuti`, `tooltips.blocks.carosello-contenuti`, and 3 new `canvas.carousel*` navigation-button labels)
- Modify: `client/tests/smoke.spec.js` (new test)

**Interfaces:**
- Consumes: `Header` from Task 1. Does **not** depend on Task 2's files (independent block), but Task 2 must already be merged since this task's file edits describe the *post-Task-2* state of `blockCatalog.js`/`blockContentSchemas.js`/`pageTemplates.js`/`CanvasBlockPreview.jsx`.
- Produces: `export function wrapIndex(current, delta, length)` from `carouselIndex.js` — returns `current + delta` wrapped into `[0, length - 1]`. Used only inside `CarouselBlockPreview.jsx` in this plan.

- [ ] **Step 1: Write the failing Vitest test for `wrapIndex`**

```js
import { describe, test, expect } from 'vitest'
import { wrapIndex } from './carouselIndex.js'

describe('wrapIndex', () => {
  test('wraps backward past the first index to the last', () => {
    expect(wrapIndex(0, -1, 3)).toBe(2)
  })

  test('wraps forward past the last index to the first', () => {
    expect(wrapIndex(2, 1, 3)).toBe(0)
  })

  test('moves within bounds without wrapping', () => {
    expect(wrapIndex(1, 1, 3)).toBe(2)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd client && npx vitest run src/components/canvas/carouselIndex.test.js`
Expected: FAIL — `carouselIndex.js` does not exist yet.

- [ ] **Step 3: Implement `carouselIndex.js`**

```js
/** Wraps `current + delta` into the range [0, length - 1]. */
export function wrapIndex(current, delta, length) {
  return ((current + delta) % length + length) % length
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd client && npx vitest run src/components/canvas/carouselIndex.test.js`
Expected: PASS (3/3 tests)

- [ ] **Step 5: Commit the pure logic**

```bash
git add client/src/components/canvas/carouselIndex.js client/src/components/canvas/carouselIndex.test.js
git commit -m "feat: add wrapIndex pure carousel-index helper"
```

- [ ] **Step 6: Create `CarouselBlockPreview.jsx`**

This is the first interactive (stateful) block preview in the canvas. With no `contentItems` (the default state right after a template is applied — no existing block seeds sample data), it still renders **3** skeleton placeholder slides with working navigation, matching how every other multi-item block's empty/skeleton state shows a plural placeholder count rather than a single static one.

```jsx
import { useState } from 'react'
import * as icons from 'lucide-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Header from './BlockPreviewHeader.jsx'
import { useTheme } from '../../hooks/useTheme.js'
import { wrapIndex } from './carouselIndex.js'

export default function CarouselBlockPreview({ block, contentItems = [] }) {
  const { template } = useTheme()
  const { t } = useTranslation()
  const Icon = icons[block.icon] ?? icons.Box
  const [slideIndex, setSlideIndex] = useState(0)
  const hasContent = contentItems.length > 0
  const slideCount = hasContent ? contentItems.length : 3
  const current = hasContent ? contentItems[slideIndex] : null

  function goTo(delta, e) {
    e.stopPropagation()
    setSlideIndex(i => wrapIndex(i, delta, slideCount))
  }

  return (
    <div>
      <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
      <div className="space-y-2">
        {current ? (
          <div className="space-y-1.5">
            {current.imageUrl ? (
              <img
                src={current.imageUrl}
                alt={current.title || ''}
                className="aspect-[16/9] rounded-md object-cover w-full"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div className={`aspect-[16/9] rounded-md ${template.card.skeletonLight}`} />
            )}
            <p className={`text-xs font-semibold leading-snug ${template.card.text} line-clamp-2`}>{current.title}</p>
            {current.description && (
              <p className={`text-[10px] ${template.card.textMuted} line-clamp-2`}>{current.description}</p>
            )}
          </div>
        ) : (
          <div className={`aspect-[16/9] rounded-md ${template.card.skeletonLight}`} />
        )}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={e => goTo(-1, e)}
            aria-label={t('canvas.carouselPrev')}
            className={`${template.card.accentText} hover:opacity-70`}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: slideCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={e => { e.stopPropagation(); setSlideIndex(i) }}
                aria-label={t('canvas.carouselGoToSlide', { n: i + 1 })}
                className={`w-1.5 h-1.5 rounded-full ${i === slideIndex ? template.card.iconBg : template.card.skeletonLight}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={e => goTo(1, e)}
            aria-label={t('canvas.carouselNext')}
            className={`${template.card.accentText} hover:opacity-70`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Add the catalog entry**

In `client/src/data/blockCatalog.js`, insert this line immediately after the `calendario-eventi` entry added in Task 2:

```js
{ id: 'carosello-contenuti', label: 'Carosello',                  category: CATEGORIES.COMMUNICATION, icon: 'GalleryHorizontalEnd', defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
```

- [ ] **Step 8: Add the content schema**

In `client/src/data/blockContentSchemas.js`, insert this entry immediately after the `calendario-eventi` entry added in Task 2:

```js
'carosello-contenuti': {
  sourceTypes: ['sharepoint-list', 'manual'],
  schema: [
    { key: 'title',       label: 'Titolo',      type: 'text',     required: true  },
    { key: 'description', label: 'Descrizione', type: 'textarea', required: false },
    { key: 'imageUrl',    label: 'Immagine',    type: 'url',      required: false },
    { key: 'url',         label: 'Link',        type: 'url',      required: false },
  ],
},
```

- [ ] **Step 9: Wire it into `CanvasBlockPreview.jsx`**

Add this import alongside the `CalendarBlockPreview` import added in Task 2:

```js
import CarouselBlockPreview from './CarouselBlockPreview.jsx'
```

Add this dispatch line next to the `calendario-eventi` one added in Task 2:

```js
if (block.id === 'carosello-contenuti') return <CarouselBlockPreview block={block} contentItems={contentItems} />
```

- [ ] **Step 10: Add the page template wiring**

In `client/src/data/pageTemplates.js`, the `communication-home` template's `sections` array now ends with the `calendario-eventi` section added in Task 2. Add a new section after it:

```js
sections: [
  { layout: 'twoColumn', blocks: [['news-corporate'], ['avvisi-homepage']] },
  { layout: 'oneColumn', blocks: [['eventi-corporate']] },
  { layout: 'oneColumn', blocks: [['multimedia-gallery']] },
  { layout: 'oneColumn', blocks: [['calendario-eventi']] },
  { layout: 'oneColumn', blocks: [['carosello-contenuti']] },
],
```

- [ ] **Step 11: Add the i18n keys to all 4 locale files**

In `client/src/locales/it.json`, add to `blocks.labels` (after the `calendario-eventi` entry added in Task 2):
```json
"carosello-contenuti": "Carosello"
```
And to `tooltips.blocks` (after the `calendario-eventi` entry added in Task 2):
```json
"carosello-contenuti": "Carosello scorrevole di contenuti in evidenza, con navigazione tra slide."
```
And add 3 new keys to the `canvas` object (anywhere inside it, e.g. after `"hidden": "Nascosto"` — remember to add a trailing comma to that line since it's no longer last):
```json
"carouselPrev": "Slide precedente",
"carouselNext": "Slide successiva",
"carouselGoToSlide": "Vai alla slide {{n}}"
```

In `client/src/locales/en.json`:
```json
"carosello-contenuti": "Carousel"
```
```json
"carosello-contenuti": "A scrollable carousel of featured content, with slide navigation."
```
```json
"carouselPrev": "Previous slide",
"carouselNext": "Next slide",
"carouselGoToSlide": "Go to slide {{n}}"
```

In `client/src/locales/fr.json`:
```json
"carosello-contenuti": "Carrousel"
```
```json
"carosello-contenuti": "Un carrousel déroulant de contenus en vedette, avec navigation entre les diapositives."
```
```json
"carouselPrev": "Diapositive précédente",
"carouselNext": "Diapositive suivante",
"carouselGoToSlide": "Aller à la diapositive {{n}}"
```

In `client/src/locales/de.json`:
```json
"carosello-contenuti": "Karussell"
```
```json
"carosello-contenuti": "Ein durchblätterbares Karussell mit hervorgehobenen Inhalten und Folien-Navigation."
```
```json
"carouselPrev": "Vorherige Folie",
"carouselNext": "Nächste Folie",
"carouselGoToSlide": "Zu Folie {{n}} wechseln"
```

- [ ] **Step 12: Write the Playwright e2e test**

Append to `client/tests/smoke.spec.js`:

```js
test('Carosello block is visible in the library and supports slide navigation in the Homepage Comunicazione template', async ({ page }) => {
  await expect(page.getByText('Carosello', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Template', exact: true }).click()
  await page.getByText('Homepage Comunicazione', { exact: true }).click()
  await expect(page.locator('main').getByText('Carosello', { exact: true })).toBeVisible()

  const dots = page.getByRole('button', { name: /Vai alla slide \d/ })
  await expect(dots).toHaveCount(3)
  await expect(dots.nth(0)).toHaveClass(/theme-accent/)

  await page.getByRole('button', { name: 'Slide successiva' }).click()
  await expect(dots.nth(1)).toHaveClass(/theme-accent/)
  await expect(dots.nth(0)).not.toHaveClass(/theme-accent/)
})
```

This relies on `aria-label`s being globally unique on the page in this test's state, exactly like every other unscoped `getByRole` query already used throughout `smoke.spec.js` — no new DOM-scoping technique is introduced.

- [ ] **Step 13: Run the e2e suite to verify it passes**

Run: `cd client && npm run test:e2e -- -g "Carosello"`
Expected: PASS (1/1)

- [ ] **Step 14: Commit the feature**

```bash
git add client/src/components/canvas/CarouselBlockPreview.jsx client/src/components/canvas/CanvasBlockPreview.jsx client/src/data/blockCatalog.js client/src/data/blockContentSchemas.js client/src/data/pageTemplates.js client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json client/tests/smoke.spec.js
git commit -m "feat: add Carosello block (carosello-contenuti) with interactive slide preview"
```

---

### Task 4: Timeline Aziendale (`timeline-aziendale`)

**Files:**
- Create: `client/src/components/canvas/TimelineBlockPreview.jsx`
- Modify: `client/src/data/blockCatalog.js` (insert new catalog entry after `desc-funzione`, the last `KNOWLEDGE_BASE` entry)
- Modify: `client/src/data/blockContentSchemas.js` (insert new content schema after `desc-funzione`, before the `// Absent:` comment)
- Modify: `client/src/data/pageTemplates.js` (`onboarding` sections array)
- Modify: `client/src/components/canvas/CanvasBlockPreview.jsx` (add import + dispatch line)
- Modify: `client/src/locales/it.json`, `en.json`, `fr.json`, `de.json` (add `blocks.labels.timeline-aziendale`, `tooltips.blocks.timeline-aziendale`)
- Modify: `client/tests/smoke.spec.js` (new test)

**Interfaces:**
- Consumes: `Header` from Task 1.
- Produces: nothing consumed by later tasks — this is the last block.

This block is purely presentational — no pure-logic file to extract, matching the complexity tier of the existing `EVENT_IDS`/`PERSON_IDS` branches already in `CanvasBlockPreview.jsx`.

- [ ] **Step 1: Create `TimelineBlockPreview.jsx`**

Renders up to 3 milestones as a vertical dot-and-line list. With no `contentItems`, renders 3 skeleton rows in the same shape.

```jsx
import * as icons from 'lucide-react'
import Header from './BlockPreviewHeader.jsx'
import { useTheme } from '../../hooks/useTheme.js'

export default function TimelineBlockPreview({ block, contentItems = [] }) {
  const { template } = useTheme()
  const Icon = icons[block.icon] ?? icons.Box
  const milestones = contentItems.length > 0 ? contentItems.slice(0, 3) : [{}, {}, {}]

  return (
    <div>
      <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
      <div className="space-y-3">
        {milestones.map((item, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${template.card.iconBg}`} />
              {i < milestones.length - 1 && <span className={`w-px flex-1 mt-1 ${template.card.skeletonLight}`} />}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              {item.date ? (
                <p className={`text-[10px] font-semibold uppercase ${template.card.accentText}`}>{item.date}</p>
              ) : (
                <div className={`h-2 w-10 rounded mb-1 ${template.card.skeletonLight}`} />
              )}
              {item.title ? (
                <p className={`text-xs font-semibold ${template.card.text}`}>{item.title}</p>
              ) : (
                <div className={`h-2.5 w-3/4 rounded mb-1 ${template.card.skeletonLight}`} />
              )}
              {item.description ? (
                <p className={`text-[10px] ${template.card.textMuted} line-clamp-2`}>{item.description}</p>
              ) : (
                <div className={`h-2 w-1/2 rounded ${template.card.skeletonLight}`} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add the catalog entry**

In `client/src/data/blockCatalog.js`, insert this line immediately after the `desc-funzione` entry (the last line of the `KNOWLEDGE_BASE` group, currently line 82, right before the closing `]`):

```js
{ id: 'timeline-aziendale',  label: 'Timeline Aziendale',         category: CATEGORIES.KNOWLEDGE_BASE, icon: 'Milestone',     defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
```

- [ ] **Step 3: Add the content schema**

In `client/src/data/blockContentSchemas.js`, insert this entry immediately after the `desc-funzione` entry (currently line 331), before the `// Absent:` comment:

```js
'timeline-aziendale': {
  sourceTypes: ['manual'],
  schema: [
    { key: 'date',        label: 'Data/Anno',  type: 'text',     required: true  },
    { key: 'title',       label: 'Titolo',      type: 'text',     required: true  },
    { key: 'description', label: 'Descrizione', type: 'textarea', required: false },
  ],
},
```

- [ ] **Step 4: Wire it into `CanvasBlockPreview.jsx`**

Add this import alongside the others added in Tasks 2-3:

```js
import TimelineBlockPreview from './TimelineBlockPreview.jsx'
```

Add this dispatch line next to the other two:

```js
if (block.id === 'timeline-aziendale') return <TimelineBlockPreview block={block} contentItems={contentItems} />
```

- [ ] **Step 5: Add the page template wiring**

In `client/src/data/pageTemplates.js`, the `onboarding` template's `sections` array currently is:

```js
sections: [
  { layout: 'oneColumn', blocks: [['new-entry']] },
  { layout: 'twoColumn', blocks: [['procedure'], ['come-fare-per']] },
  { layout: 'oneColumn', blocks: [['faq']] },
  { layout: 'oneColumn', blocks: [['organigramma']] },
  { layout: 'oneColumn', blocks: [['documenti']] },
],
```

Insert a new section between `organigramma` and `documenti` (the timeline tells the company's story right after introducing its structure, before reference documents):

```js
sections: [
  { layout: 'oneColumn', blocks: [['new-entry']] },
  { layout: 'twoColumn', blocks: [['procedure'], ['come-fare-per']] },
  { layout: 'oneColumn', blocks: [['faq']] },
  { layout: 'oneColumn', blocks: [['organigramma']] },
  { layout: 'oneColumn', blocks: [['timeline-aziendale']] },
  { layout: 'oneColumn', blocks: [['documenti']] },
],
```

- [ ] **Step 6: Add the i18n keys to all 4 locale files**

In `client/src/locales/it.json`, add to `blocks.labels` (after the `carosello-contenuti` entry added in Task 3):
```json
"timeline-aziendale": "Timeline Aziendale"
```
And to `tooltips.blocks` (after the `carosello-contenuti` entry added in Task 3):
```json
"timeline-aziendale": "Racconta la storia e le tappe principali dell'azienda in ordine cronologico."
```

In `client/src/locales/en.json`:
```json
"timeline-aziendale": "Company Timeline"
```
```json
"timeline-aziendale": "Tells the company's story and key milestones in chronological order."
```

In `client/src/locales/fr.json`:
```json
"timeline-aziendale": "Chronologie de l'entreprise"
```
```json
"timeline-aziendale": "Raconte l'histoire et les étapes clés de l'entreprise dans l'ordre chronologique."
```

In `client/src/locales/de.json`:
```json
"timeline-aziendale": "Unternehmens-Timeline"
```
```json
"timeline-aziendale": "Erzählt die Geschichte und die wichtigsten Meilensteine des Unternehmens in chronologischer Reihenfolge."
```

- [ ] **Step 7: Write the Playwright e2e test**

Append to `client/tests/smoke.spec.js`:

```js
test('Timeline Aziendale block is visible in the library and in the Onboarding template', async ({ page }) => {
  await expect(page.getByText('Timeline Aziendale', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Template', exact: true }).click()
  await page.getByText('Onboarding', { exact: true }).first().click()
  await expect(page.locator('main').getByText('Timeline Aziendale', { exact: true })).toBeVisible()
})
```

- [ ] **Step 8: Run the e2e suite to verify it passes**

Run: `cd client && npm run test:e2e -- -g "Timeline Aziendale"`
Expected: PASS (1/1)

- [ ] **Step 9: Run the full unit and e2e suites one last time**

Run: `cd client && npm run test:unit`
Expected: all tests pass, including the 4 new ones from Tasks 2-3 (`calendarGrid.test.js`, `carouselIndex.test.js`).

Run: `cd client && npm run test:e2e`
Expected: same pass count as the project's established baseline plus the 3 new tests from this plan (1 from Task 2, 1 from Task 3, 1 from this task), with the same 2 pre-existing unrelated failures as Task 1's baseline.

- [ ] **Step 10: Commit the feature**

```bash
git add client/src/components/canvas/TimelineBlockPreview.jsx client/src/components/canvas/CanvasBlockPreview.jsx client/src/data/blockCatalog.js client/src/data/blockContentSchemas.js client/src/data/pageTemplates.js client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json client/tests/smoke.spec.js
git commit -m "feat: add Timeline Aziendale block (timeline-aziendale) with milestone preview"
```
