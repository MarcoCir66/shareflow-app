# Left Sidebar Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the left sidebar's cramped horizontal equal-width tab bar with a vertical icon+label list that scales by height instead of squeezing text into a fixed 260px width, while fixing the pre-existing i18n gap on 3 of the 4 tab labels along the way.

**Architecture:** A single-file change to `LeftSidebar.jsx`: the tab container becomes a vertical flex column, each tab button becomes a full-width row with a lucide-react icon and an i18n-routed label, and the active-state accent moves from a bottom underline to a left border. A new `sidebar` locale namespace supplies the 3 previously-hardcoded labels in all 4 languages, with Italian values kept textually identical to today so no existing test that locates these buttons by name needs to change.

**Tech Stack:** React 19, `lucide-react` icons, i18next/react-i18next, Playwright.

## Global Constraints

- No reducer, data, or backend changes — this is a UI-only revision of `client/src/components/sidebar-left/LeftSidebar.jsx` and 4 locale files.
- Italian label text must stay byte-identical to today ("Blocchi", "Pagine", "Aspetto") — every existing Playwright test that locates a sidebar tab button by name must keep passing unmodified.
- The icon element is decorative (`aria-hidden="true"`) — it must never become the icon's accessible name when a visible text label already exists beside it.
- No `role="tablist"`/`role="tab"`/`aria-selected`/`aria-controls` semantics — out of scope for this revision.
- The already-i18n-routed 4th tab (`templates.tabLabel`) and `TemplateGallery.jsx`'s Pagina/Sito sub-toggle are untouched.
- Run `npx playwright test` and `npx vitest run` from `client/` for verification.

---

### Task 1: Vertical icon+label nav list with the `sidebar` i18n namespace

**Files:**
- Modify: `client/src/components/sidebar-left/LeftSidebar.jsx`
- Modify: `client/src/locales/it.json`, `client/src/locales/en.json`, `client/src/locales/fr.json`, `client/src/locales/de.json`
- Modify: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: nothing new from other files — `BlockLibrary`, `PagesPanel`, `AppearancePanel`, `TemplateGallery` imports are unchanged; `templates.tabLabel` (existing key, unchanged) is still read for the 4th tab.
- Produces: new locale keys `sidebar.tabBlocks`, `sidebar.tabPages`, `sidebar.tabAppearance` in all 4 locale files. No other file consumes these except `LeftSidebar.jsx` itself.

- [ ] **Step 1: Write the failing e2e test**

In `client/tests/smoke.spec.js`, add this test at the end of the `test.describe('i18n language switching', ...)` block (currently closes at line 599), immediately after the `'page title rename in IT does not change EN variant'` test:

```js
  test('switching to EN translates the sidebar tab labels', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Blocchi', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pagine', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aspetto', exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Switch language to EN', exact: true }).click()

    await expect(page.getByRole('button', { name: 'Blocks', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pages', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Appearance', exact: true })).toBeVisible()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && npx playwright test -g "translates the sidebar tab labels"`

Expected: FAILS — after switching to EN, `getByRole('button', { name: 'Blocks', exact: true })` finds nothing, because the labels are still the hardcoded Italian strings "Blocchi"/"Pagine"/"Aspetto" and don't change with the language switch yet.

- [ ] **Step 3: Add the `sidebar` locale namespace to all four locale files**

In `client/src/locales/it.json`, insert a new top-level `sidebar` block immediately after `navbar` (currently lines 2-7) and before `pages` (currently line 8):

```json
  "sidebar": {
    "tabBlocks": "Blocchi",
    "tabPages": "Pagine",
    "tabAppearance": "Aspetto"
  },
```

In `client/src/locales/en.json`, insert at the same position (after `navbar`, before `pages`):

```json
  "sidebar": {
    "tabBlocks": "Blocks",
    "tabPages": "Pages",
    "tabAppearance": "Appearance"
  },
```

In `client/src/locales/fr.json`, insert at the same position:

```json
  "sidebar": {
    "tabBlocks": "Blocs",
    "tabPages": "Pages",
    "tabAppearance": "Apparence"
  },
```

In `client/src/locales/de.json`, insert at the same position:

```json
  "sidebar": {
    "tabBlocks": "Blöcke",
    "tabPages": "Seiten",
    "tabAppearance": "Erscheinungsbild"
  },
```

(Each file's `navbar` block ends with a line containing only `  },` — insert the new `sidebar` block immediately after that line, before the line starting `  "pages": {`.)

- [ ] **Step 4: Rewrite `LeftSidebar.jsx`**

Replace the full content of `client/src/components/sidebar-left/LeftSidebar.jsx` with:

```jsx
import * as icons from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import BlockLibrary from './BlockLibrary.jsx'
import PagesPanel from './PagesPanel.jsx'
import AppearancePanel from './AppearancePanel.jsx'
import TemplateGallery from './TemplateGallery.jsx'

export default function LeftSidebar() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('blocks')

  const TABS = [
    { id: 'blocks', label: t('sidebar.tabBlocks'), icon: 'Blocks' },
    { id: 'pages', label: t('sidebar.tabPages'), icon: 'Files' },
    { id: 'appearance', label: t('sidebar.tabAppearance'), icon: 'Palette' },
    { id: 'templates', label: t('templates.tabLabel'), icon: 'LayoutTemplate' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col border-b border-slate-mid flex-shrink-0">
        {TABS.map(tabItem => {
          const Icon = icons[tabItem.icon] ?? icons.Box
          return (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider
                transition-colors border-l-2
                ${tab === tabItem.id
                  ? 'text-blue-electric border-blue-electric bg-blue-electric/10'
                  : 'text-slate-light border-transparent hover:text-white hover:bg-navy-light'}`}
            >
              <Icon size={16} aria-hidden="true" className="flex-shrink-0" />
              {tabItem.label}
            </button>
          )
        })}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'blocks' && <BlockLibrary />}
        {tab === 'pages' && <PagesPanel />}
        {tab === 'appearance' && <AppearancePanel />}
        {tab === 'templates' && <TemplateGallery />}
      </div>
    </div>
  )
}
```

The `icons[tabItem.icon] ?? icons.Box` fallback mirrors the same defensive pattern already used in `client/src/components/sidebar-left/BlockCard.jsx` and `TemplateGallery.jsx` for icon lookups.

- [ ] **Step 5: Run the new test and the full e2e suite**

Run: `cd client && npx playwright test`

Expected: all pass, including the new test from Step 1. In particular, confirm every pre-existing test that locates a sidebar tab by name still passes unmodified — e.g. `getByRole('button', { name: 'Aspetto' })`, `getByRole('button', { name: 'Pagine' })`, `getByRole('button', { name: 'Template', exact: true })` — since the Italian label text is unchanged, only how each label reaches the DOM (via `t()` instead of a literal string) and what's rendered beside it (an `aria-hidden` icon) changed.

- [ ] **Step 6: Manually verify the icons render correctly**

Run the app's dev server (see this project's own run/dev instructions) and open the left sidebar. Confirm all 4 lucide-react icons (`Blocks`, `Files`, `Palette`, `LayoutTemplate`) render as recognizable glyphs next to their labels, not as the `Box` fallback (which would indicate an invalid icon name). If any icon name is invalid, replace it with a valid `lucide-react` export of similar meaning and re-run Step 5.

- [ ] **Step 7: Run the full unit suite to check for regressions**

Run: `cd client && npx vitest run`

Expected: all pass (no reducer/data files were touched, so no count change is expected versus the current baseline).

- [ ] **Step 8: Commit**

```bash
git add client/src/components/sidebar-left/LeftSidebar.jsx client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json client/tests/smoke.spec.js
git commit -m "feat: redesign left sidebar nav as a vertical icon+label list"
```

---

## Final check

After Task 1, run both suites once more from `client/`:

```bash
npx vitest run
npx playwright test
```

Expected: all Vitest tests pass (unchanged count from before this plan), all Playwright tests pass (1 new test added on top of the pre-existing count).
