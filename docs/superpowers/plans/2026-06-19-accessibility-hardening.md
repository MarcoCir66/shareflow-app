# Accessibility Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ShareFlow editor usable via keyboard alone and intelligible to screen readers by fixing four concrete gaps: no keyboard path for drag-and-drop, an inaccessible `DeployModal`, two inaccessible popup menus, and no global error boundary.

**Architecture:** Two new shared primitives (`useFocusTrap` hook, `AccessibleMenu` component) are built first against their first real consumer (`DeployModal`, then `CanvasBlock`'s move-to menu), then reused by a second consumer (`CanvasSection`'s layout picker) to prove they generalize. dnd-kit's built-in `KeyboardSensor` is registered once in `App.jsx` and a pre-existing `attributes`/`listeners` placement bug in `CanvasBlock.jsx` is fixed so the keyboard sensor's ARIA output actually reaches the right element. A single global `ErrorBoundary` wraps the app. `@axe-core/playwright` is added to the existing Playwright suite for automated scans, scoped to avoid flagging genuinely out-of-scope, pre-existing issues (color contrast, missing page heading, landmark structure).

**Tech Stack:** React 19, `@dnd-kit/core` + `@dnd-kit/sortable` (already in use), Playwright + `@axe-core/playwright` (new devDependency), Vitest (already in use, no new devDependency needed for this plan).

## Global Constraints

- No backend/server changes. No changes to `configuratorReducer.js` or any state shape.
- No new Vitest devDependencies (no `@testing-library/react`, no `jsdom`) — the one Vitest test in this plan (`ErrorBoundary`) is written by calling the class's static method and `render()` directly and inspecting the returned React element tree, never mounting to a DOM. This matches the project's existing Vitest tests, which only exercise pure functions/reducers, never DOM rendering.
- No coverage threshold enforcement — tests exist, no automated minimum-percentage gate (consistent with the prior unit-tests sub-project).
- Axe-core scans must exclude `color-contrast`, `landmark-unique`, `page-has-heading-one`, and `region` — these are real, pre-existing violations confirmed by manual probing against the running app, but they are out of scope for this hardening pass (visual contrast / document landmark structure, not part of the four identified gaps) and would never go to zero as part of this plan.
- All new e2e tests go in `client/tests/smoke.spec.js`, the project's only e2e suite, following its existing `test.beforeEach` (sets `i18nextLng` to `'it'` in `localStorage` before each test) and selector conventions (`getByRole`, `getByText`, scoped `.locator('main')` / `.locator('aside.border-l')` / `.locator('aside.border-r')`).
- Run `npx playwright test` from `client/` for all e2e verification; run `npx vitest run` from `client/` for the one unit test.

---

### Task 1: Add `@axe-core/playwright` and a baseline accessibility scan

**Files:**
- Modify: `client/package.json` (already has `@axe-core/playwright` installed as of this plan's authoring — verify, don't reinstall if present)
- Modify: `client/tests/smoke.spec.js`

**Interfaces:**
- Produces: the `OUT_OF_SCOPE_AXE_RULES` constant (a plain array of axe rule IDs) at module scope in `client/tests/smoke.spec.js`, reused by Task 5's test.

This task establishes the axe-core tooling with a single scan that is true today, before any other change in this plan — it is a regression guard, not a TDD red/green pair (there is currently nothing broken at the full-page level once the four out-of-scope rule categories are excluded).

- [ ] **Step 1: Confirm `@axe-core/playwright` is installed**

Run: `cd client && npm ls @axe-core/playwright`

Expected: prints a version (e.g. `@axe-core/playwright@4.11.3`). If it errors with "missing", run `npm install -D @axe-core/playwright` first.

- [ ] **Step 2: Add the import and the baseline test**

In `client/tests/smoke.spec.js`, change the top import line:

```js
import { test, expect } from '@playwright/test'
```

to:

```js
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Pre-existing, out-of-scope violations (visual contrast, document landmark
// structure) — not part of the four accessibility gaps this plan addresses.
// Excluded so these tests guard against regressions in scope, not flag
// unrelated issues that would never go to zero here.
const OUT_OF_SCOPE_AXE_RULES = ['color-contrast', 'landmark-unique', 'page-has-heading-one', 'region']
```

Then add this test as the new first test inside `test.describe('ShareFlow configurator smoke test', ...)`, immediately after the `test.beforeEach` block (i.e. right before the existing `test('loads the 3-column workspace with the default Home page', ...)` test):

```js
  test('default editor view has no in-scope accessibility violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).disableRules(OUT_OF_SCOPE_AXE_RULES).analyze()
    expect(results.violations).toEqual([])
  })

```

- [ ] **Step 3: Run the test to verify it passes**

Run: `cd client && npx playwright test -g "default editor view has no in-scope accessibility violations"`

Expected: `1 passed`.

- [ ] **Step 4: Commit**

```bash
git add client/package.json client/package-lock.json client/tests/smoke.spec.js
git commit -m "test(client): add axe-core baseline accessibility scan"
```

---

### Task 2: `useFocusTrap` hook and `DeployModal` dialog semantics

**Files:**
- Create: `client/src/hooks/useFocusTrap.js`
- Modify: `client/src/components/deploy/DeployModal.jsx`
- Modify: `client/tests/smoke.spec.js`

**Interfaces:**
- Produces: `useFocusTrap(containerRef, { active, onEscape })` — a hook with no return value. While `active` is `true`, focuses the first focusable descendant of `containerRef.current` on activation, traps Tab/Shift+Tab inside that subtree, calls `onEscape()` on the Escape key, and restores focus to whatever was focused before activation when the effect's cleanup runs (on `active` becoming `false` or on unmount). Consumed by Task 3's `AccessibleMenu`.

- [ ] **Step 1: Write the failing e2e test**

In `client/tests/smoke.spec.js`, add this test inside `test.describe('ShareFlow configurator smoke test', ...)`, immediately after the existing `test('deploy flow completes end-to-end against the provisioning API', ...)` test (which ends just before the `test('Contenuto tab appears for content-enabled blocks ...')` test):

```js
  test('Deploy modal is a dialog and Escape closes it, returning focus to the Deploy button', async ({ page }) => {
    const deployButton = page.getByRole('button', { name: 'Pubblica su SharePoint' })
    await deployButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(deployButton).toBeFocused()
  })

  test('Deploy modal has no in-scope accessibility violations while open', async ({ page }) => {
    await page.getByRole('button', { name: 'Pubblica su SharePoint' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
    expect(results.violations).toEqual([])
  })

```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd client && npx playwright test -g "Deploy modal"`

Expected: both FAIL — `page.getByRole('dialog')` finds nothing (`DeployModal` has no `role="dialog"` yet), so `toBeVisible()` times out.

- [ ] **Step 3: Create the `useFocusTrap` hook**

Create `client/src/hooks/useFocusTrap.js`:

```js
import { useEffect } from 'react'

/**
 * Traps Tab/Shift+Tab focus inside containerRef while active, calls
 * onEscape on the Escape key, and restores focus to whatever had it
 * before activation when the effect's cleanup runs.
 */
export function useFocusTrap(containerRef, { active, onEscape }) {
  useEffect(() => {
    if (!active) return
    const previouslyFocused = document.activeElement
    const container = containerRef.current
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const focusable = () => container.querySelectorAll(focusableSelector)
    focusable()[0]?.focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') { onEscape?.(); return }
      if (e.key !== 'Tab') return
      const items = Array.from(focusable())
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [active])
}
```

- [ ] **Step 4: Wire `useFocusTrap` and dialog semantics into `DeployModal.jsx`**

In `client/src/components/deploy/DeployModal.jsx`, add the import after the existing `t2` import (line 8):

```js
import { t2 } from '../../utils/localizedText.js'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'
```

Add a ref and the hook call right after the `siteName` line (currently line 72, just before the `return (`):

```js
  const siteName = t2(state.tenantConfiguration.siteName, lang)
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef, { active: true, onEscape: onClose })

  return (
```

Change the dialog container div (currently line 76) from:

```jsx
      <div className="bg-slate rounded-2xl border border-slate-mid w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-mid">
          <h2 className="text-white font-semibold">{t('deploy.title')}</h2>
```

to:

```jsx
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="deploy-modal-title" className="bg-slate rounded-2xl border border-slate-mid w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-mid">
          <h2 id="deploy-modal-title" className="text-white font-semibold">{t('deploy.title')}</h2>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd client && npx playwright test -g "Deploy modal"`

Expected: both PASS (`2 passed`).

- [ ] **Step 6: Run the full e2e suite to check for regressions**

Run: `cd client && npx playwright test`

Expected: all tests pass (no regressions from the dialog markup change).

- [ ] **Step 7: Commit**

```bash
git add client/src/hooks/useFocusTrap.js client/src/components/deploy/DeployModal.jsx client/tests/smoke.spec.js
git commit -m "feat(a11y): add useFocusTrap hook and dialog semantics to DeployModal"
```

---

### Task 3: `AccessibleMenu` primitive and `CanvasBlock`'s move-to menu

**Files:**
- Create: `client/src/components/common/AccessibleMenu.jsx`
- Modify: `client/src/components/canvas/CanvasBlock.jsx`
- Modify: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: `useFocusTrap(containerRef, { active, onEscape })` from Task 2.
- Produces: `<AccessibleMenu isOpen onClose triggerRef? onClick? className?>{children}</AccessibleMenu>`. Renders nothing when `isOpen` is false. When `isOpen` is true, renders a `role="menu"` container (receiving `className`/`onClick` directly) that: focuses the first `[role="menuitem"]` descendant on open (via `useFocusTrap`), traps Tab inside itself, closes on Escape, closes on any click outside both the menu and (if given) the element referenced by `triggerRef`, and lets ArrowUp/ArrowDown move focus between `[role="menuitem"]` children. The component does **not** render a trigger itself — callers keep rendering their own trigger button wherever it already lives in the JSX and pass a ref to it as `triggerRef` (this is necessary because, in `CanvasSection`'s later use in Task 4, the trigger button and the popup are not adjacent in the JSX tree, so a "render the trigger for me" API would not fit both call sites). Consumed again by Task 4.

- [ ] **Step 1: Write the failing e2e test**

In `client/tests/smoke.spec.js`, add this test inside `test.describe('ShareFlow configurator smoke test', ...)`, immediately after the two new Task 2 tests (after `test('Deploy modal has no in-scope accessibility violations while open', ...)`, before `test('Contenuto tab appears for content-enabled blocks ...')`):

```js
  test('block move-to menu is keyboard accessible', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    await page.getByRole('button', { name: 'Aggiungi sezione' }).click()
    await page.getByRole('button', { name: 'Una colonna' }).click()

    const newsBlock = page.locator('main div.group.bg-white', { hasText: 'News - Corporate' })
    await newsBlock.hover()
    await newsBlock.getByTitle('Sposta in un\'altra colonna').click()

    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem').first()).toBeFocused()

    await page.keyboard.press('ArrowDown')
    await expect(menu.getByRole('menuitem').nth(1)).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(menu).not.toBeVisible()

    const results = await new AxeBuilder({ page }).include('main').disableRules(OUT_OF_SCOPE_AXE_RULES).analyze()
    expect(results.violations.filter(v => v.id !== 'nested-interactive' && v.id !== 'button-name')).toEqual([])
  })

```

Note: the final assertion filters out `nested-interactive` and `button-name` because those are the pre-existing `CanvasBlock` violations that Task 5 fixes — this task only needs to confirm the new menu itself introduces no violations, not that the whole card is clean yet.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && npx playwright test -g "block move-to menu is keyboard accessible"`

Expected: FAILS — `page.getByRole('menu')` finds nothing (the popup is a plain `<div>` with no `role="menu"` yet).

- [ ] **Step 3: Create `AccessibleMenu.jsx`**

Create `client/src/components/common/AccessibleMenu.jsx`:

```jsx
import { useEffect, useRef } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'

export default function AccessibleMenu({ isOpen, onClose, triggerRef, onClick, className, children }) {
  const menuRef = useRef(null)
  useFocusTrap(menuRef, { active: isOpen, onEscape: onClose })

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e) {
      if (menuRef.current?.contains(e.target)) return
      if (triggerRef?.current?.contains(e.target)) return
      onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, triggerRef])

  function handleArrowKey(e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = Array.from(menuRef.current.querySelectorAll('[role="menuitem"]'))
    if (items.length === 0) return
    const idx = items.indexOf(document.activeElement)
    const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length
    items[next]?.focus()
  }

  if (!isOpen) return null

  return (
    <div ref={menuRef} role="menu" onKeyDown={handleArrowKey} onClick={onClick} className={className}>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Wire `AccessibleMenu` into `CanvasBlock.jsx`**

In `client/src/components/canvas/CanvasBlock.jsx`, add the import after the `CanvasBlockPreview` import (line 10):

```js
import CanvasBlockPreview from './CanvasBlockPreview.jsx'
import AccessibleMenu from '../common/AccessibleMenu.jsx'
```

Add a ref for the move-to trigger button, right after the `moveMenuOpen` state (currently line 15):

```js
  const [moveMenuOpen, setMoveMenuOpen] = useState(false)
  const moveTriggerRef = useRef(null)
```

Add `useRef` to the existing React import (currently line 1):

```js
import { useState, useRef } from 'react'
```

Change the move-to trigger button (currently lines 65-71) from:

```jsx
          <button
            onClick={e => { e.stopPropagation(); setMoveMenuOpen(o => !o) }}
            className="text-gray-300 hover:text-blue transition-colors"
            title={t('canvas.moveToOtherColumn')}
          >
            <ArrowRightLeft size={14} />
          </button>
```

to:

```jsx
          <button
            ref={moveTriggerRef}
            onClick={e => { e.stopPropagation(); setMoveMenuOpen(o => !o) }}
            className="text-gray-300 hover:text-blue transition-colors"
            title={t('canvas.moveToOtherColumn')}
          >
            <ArrowRightLeft size={14} />
          </button>
```

Change the popup block (currently lines 84-106) from:

```jsx
      {moveMenuOpen && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute right-2 top-9 z-20 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1"
        >
          <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{t('canvas.moveTo')}</p>
          {otherColumns.map(target => (
            <button
              key={target.columnId}
              onClick={() => {
                dispatch({
                  type: ACTIONS.MOVE_WIDGET,
                  payload: { instanceId: widget.instanceId, toSectionId: target.sectionId, toColumnId: target.columnId },
                })
                setMoveMenuOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-navy hover:bg-surface transition-colors"
            >
              {target.label}
            </button>
          ))}
        </div>
      )}
```

to:

```jsx
      <AccessibleMenu
        isOpen={moveMenuOpen}
        onClose={() => setMoveMenuOpen(false)}
        triggerRef={moveTriggerRef}
        onClick={e => e.stopPropagation()}
        className="absolute right-2 top-9 z-20 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1"
      >
        <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{t('canvas.moveTo')}</p>
        {otherColumns.map(target => (
          <button
            key={target.columnId}
            role="menuitem"
            onClick={() => {
              dispatch({
                type: ACTIONS.MOVE_WIDGET,
                payload: { instanceId: widget.instanceId, toSectionId: target.sectionId, toColumnId: target.columnId },
              })
              setMoveMenuOpen(false)
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-navy hover:bg-surface transition-colors"
          >
            {target.label}
          </button>
        ))}
      </AccessibleMenu>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd client && npx playwright test -g "block move-to menu is keyboard accessible"`

Expected: PASSES (`1 passed`).

- [ ] **Step 6: Run the full e2e suite to check for regressions**

Run: `cd client && npx playwright test`

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/common/AccessibleMenu.jsx client/src/components/canvas/CanvasBlock.jsx client/tests/smoke.spec.js
git commit -m "feat(a11y): add AccessibleMenu primitive, wire into CanvasBlock move-to menu"
```

---

### Task 4: `SectionLayoutPicker` as a menu, wired into `CanvasSection`'s popup

**Files:**
- Modify: `client/src/components/canvas/SectionLayoutPicker.jsx`
- Modify: `client/src/components/canvas/CanvasSection.jsx`
- Modify: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: `AccessibleMenu` from Task 3.
- Produces: `SectionLayoutPicker({ value, onSelect, asMenuItems = false })` — when `asMenuItems` is `true`, each layout button additionally gets `role="menuitem"`. The default (`false`) keeps the component's other existing usage, in `client/src/components/sidebar-right/SectionPropertiesPanel.jsx` (an always-visible inline control, not a popup), rendering plain buttons exactly as it does today — that call site is intentionally **not** touched in this task.

- [ ] **Step 1: Write the failing e2e test**

In `client/tests/smoke.spec.js`, add this test inside `test.describe('ShareFlow configurator smoke test', ...)`, immediately after the Task 3 test (`test('block move-to menu is keyboard accessible', ...)`, before `test('Contenuto tab appears for content-enabled blocks ...')`):

```js
  test('section layout picker popup is keyboard accessible', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()

    // The section wrapper is the .group div containing the "change layout"
    // trigger button — distinct from the block's own .group.bg-white wrapper,
    // which does not contain that button.
    const sectionBox = page.locator('main div.group').filter({ has: page.getByTitle('Cambia layout sezione') }).first()
    await sectionBox.hover()
    await sectionBox.getByTitle('Cambia layout sezione').click()

    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem').first()).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(menu).not.toBeVisible()
  })

```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && npx playwright test -g "section layout picker popup is keyboard accessible"`

Expected: FAILS — `page.getByRole('menu')` finds nothing yet.

- [ ] **Step 3: Add `asMenuItems` to `SectionLayoutPicker.jsx`**

Replace the full content of `client/src/components/canvas/SectionLayoutPicker.jsx` with:

```jsx
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
            w-10 h-8 rounded border p-1 grid gap-0.5 ${layout.gridCols}
            ${value === key ? 'border-blue ring-1 ring-blue/30' : 'border-gray-200 hover:border-gray-300'}
          `}
        >
          {Array.from({ length: layout.columns }).map((_, i) => (
            <div key={i} className="bg-gray-300 rounded-sm" />
          ))}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Wire `AccessibleMenu` into `CanvasSection.jsx`**

In `client/src/components/canvas/CanvasSection.jsx`, add the import after the `SectionLayoutPicker` import (line 7):

```js
import SectionLayoutPicker from './SectionLayoutPicker.jsx'
import AccessibleMenu from '../common/AccessibleMenu.jsx'
```

Add `useRef` to the React import (currently line 1) and add a ref for the layout-picker trigger:

```js
import { useState, useRef } from 'react'
```

```js
  const [pickerOpen, setPickerOpen] = useState(false)
  const layoutTriggerRef = useRef(null)
```

Change the layout-picker trigger button (currently lines 44-51) from:

```jsx
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setPickerOpen(o => !o) }}
          className="p-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-slate hover:text-blue hover:border-blue transition-colors"
          title={t('canvas.changeLayout')}
        >
          <LayoutGrid size={14} />
        </button>
```

to:

```jsx
        <button
          ref={layoutTriggerRef}
          type="button"
          onClick={e => { e.stopPropagation(); setPickerOpen(o => !o) }}
          className="p-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-slate hover:text-blue hover:border-blue transition-colors"
          title={t('canvas.changeLayout')}
        >
          <LayoutGrid size={14} />
        </button>
```

Change the popup block (currently lines 67-77) from:

```jsx
      {pickerOpen && (
        <div className="absolute -top-14 right-2 z-20" onClick={e => e.stopPropagation()}>
          <SectionLayoutPicker
            value={section.layout}
            onSelect={key => {
              dispatch({ type: ACTIONS.CHANGE_SECTION_LAYOUT, payload: { sectionId: section.sectionId, layout: key } })
              setPickerOpen(false)
            }}
          />
        </div>
      )}
```

to:

```jsx
      <AccessibleMenu
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        triggerRef={layoutTriggerRef}
        onClick={e => e.stopPropagation()}
        className="absolute -top-14 right-2 z-20"
      >
        <SectionLayoutPicker
          value={section.layout}
          onSelect={key => {
            dispatch({ type: ACTIONS.CHANGE_SECTION_LAYOUT, payload: { sectionId: section.sectionId, layout: key } })
            setPickerOpen(false)
          }}
          asMenuItems
        />
      </AccessibleMenu>
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd client && npx playwright test -g "section layout picker popup is keyboard accessible"`

Expected: PASSES (`1 passed`).

- [ ] **Step 6: Run the full e2e suite to check for regressions**

Run: `cd client && npx playwright test`

Expected: all tests pass. In particular, re-check `test('adding a section adds an empty column drop zone', ...)` and `test('switching to EN translates canvas drop hint', ...)`, both of which use the "Aggiungi sezione" → "Una colonna" flow that sits next to the code touched here.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/canvas/SectionLayoutPicker.jsx client/src/components/canvas/CanvasSection.jsx client/tests/smoke.spec.js
git commit -m "feat(a11y): make SectionLayoutPicker popup keyboard accessible via AccessibleMenu"
```

---

### Task 5: Keyboard drag-and-drop and `CanvasBlock` ARIA fixes

**Files:**
- Modify: `client/src/App.jsx`
- Modify: `client/src/components/canvas/CanvasBlock.jsx`
- Modify: `client/src/locales/it.json`, `client/src/locales/en.json`, `client/src/locales/fr.json`, `client/src/locales/de.json`
- Modify: `client/tests/smoke.spec.js`

This task fixes two real, verified axe-core violations on `CanvasBlock` (confirmed by manually scanning the running app with a block added and the out-of-scope rules disabled: `button-name` on the grip-handle and remove buttons, `nested-interactive` on the card's outer `<div>`), and registers dnd-kit's `KeyboardSensor` so canvas blocks become reorderable via keyboard.

- [ ] **Step 1: Write the failing axe regression test**

In `client/tests/smoke.spec.js`, add this test inside `test.describe('ShareFlow configurator smoke test', ...)`, immediately after the Task 4 test (`test('section layout picker popup is keyboard accessible', ...)`, before `test('Contenuto tab appears for content-enabled blocks ...')`):

```js
  test('canvas block has no in-scope accessibility violations', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()

    const results = await new AxeBuilder({ page }).disableRules(OUT_OF_SCOPE_AXE_RULES).analyze()
    expect(results.violations).toEqual([])
  })

```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && npx playwright test -g "canvas block has no in-scope accessibility violations"`

Expected: FAILS — reports 2 violations (`button-name`, `nested-interactive`).

- [ ] **Step 3: Write the failing keyboard-reorder test**

In the same file, add this test right after the one from Step 1:

```js
  test('canvas blocks can be reordered with the keyboard', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    await page.getByText('Procedure', { exact: true }).click()

    const newsBlock = page.locator('main div.group.bg-white', { hasText: 'News - Corporate' })
    await newsBlock.hover()
    const grip = newsBlock.getByRole('button', { name: 'Maniglia di trascinamento' })
    await grip.focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Space')

    const order = await page.locator('main').evaluate(el => {
      const text = el.textContent
      return text.indexOf('Procedure') < text.indexOf('News - Corporate')
    })
    expect(order).toBe(true)
  })

```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd client && npx playwright test -g "canvas blocks can be reordered with the keyboard"`

Expected: FAILS — `grip.focus()` finds nothing (the grip-handle button has no accessible name yet, so `getByRole('button', { name: 'Maniglia di trascinamento' })` matches no element).

- [ ] **Step 5: Add `dragHandle` and `removeBlock` translation keys**

In `client/src/locales/it.json`, change the `canvas` block (currently lines 68-77) from:

```json
  "canvas": {
    "preview": "Anteprima canvas",
    "addSection": "Aggiungi sezione",
    "dropHere": "Trascina qui un blocco",
    "changeLayout": "Cambia layout sezione",
    "deleteSection": "Elimina sezione",
    "moveTo": "Sposta in",
    "moveToOtherColumn": "Sposta in un'altra colonna",
    "sectionCol": "Sezione {{section}} · Colonna {{col}}"
  },
```

to:

```json
  "canvas": {
    "preview": "Anteprima canvas",
    "addSection": "Aggiungi sezione",
    "dropHere": "Trascina qui un blocco",
    "changeLayout": "Cambia layout sezione",
    "deleteSection": "Elimina sezione",
    "moveTo": "Sposta in",
    "moveToOtherColumn": "Sposta in un'altra colonna",
    "sectionCol": "Sezione {{section}} · Colonna {{col}}",
    "dragHandle": "Maniglia di trascinamento",
    "removeBlock": "Rimuovi blocco"
  },
```

In `client/src/locales/en.json`, change the `canvas` block (currently lines 68-77) from:

```json
  "canvas": {
    "preview": "Canvas Preview",
    "addSection": "Add section",
    "dropHere": "Drag a block here",
    "changeLayout": "Change section layout",
    "deleteSection": "Delete section",
    "moveTo": "Move to",
    "moveToOtherColumn": "Move to another column",
    "sectionCol": "Section {{section}} · Column {{col}}"
  },
```

to:

```json
  "canvas": {
    "preview": "Canvas Preview",
    "addSection": "Add section",
    "dropHere": "Drag a block here",
    "changeLayout": "Change section layout",
    "deleteSection": "Delete section",
    "moveTo": "Move to",
    "moveToOtherColumn": "Move to another column",
    "sectionCol": "Section {{section}} · Column {{col}}",
    "dragHandle": "Drag handle",
    "removeBlock": "Remove block"
  },
```

In `client/src/locales/fr.json`, change the `canvas` block (currently lines 68-77) from:

```json
  "canvas": {
    "preview": "Aperçu Canvas",
    "addSection": "Ajouter une section",
    "dropHere": "Faites glisser un bloc ici",
    "changeLayout": "Changer la disposition",
    "deleteSection": "Supprimer la section",
    "moveTo": "Déplacer vers",
    "moveToOtherColumn": "Déplacer vers une autre colonne",
    "sectionCol": "Section {{section}} · Colonne {{col}}"
  },
```

to:

```json
  "canvas": {
    "preview": "Aperçu Canvas",
    "addSection": "Ajouter une section",
    "dropHere": "Faites glisser un bloc ici",
    "changeLayout": "Changer la disposition",
    "deleteSection": "Supprimer la section",
    "moveTo": "Déplacer vers",
    "moveToOtherColumn": "Déplacer vers une autre colonne",
    "sectionCol": "Section {{section}} · Colonne {{col}}",
    "dragHandle": "Poignée de déplacement",
    "removeBlock": "Supprimer le bloc"
  },
```

In `client/src/locales/de.json`, change the `canvas` block (currently lines 68-77) from:

```json
  "canvas": {
    "preview": "Canvas-Vorschau",
    "addSection": "Abschnitt hinzufügen",
    "dropHere": "Block hierher ziehen",
    "changeLayout": "Abschnittslayout ändern",
    "deleteSection": "Abschnitt löschen",
    "moveTo": "Verschieben nach",
    "moveToOtherColumn": "In eine andere Spalte verschieben",
    "sectionCol": "Abschnitt {{section}} · Spalte {{col}}"
  },
```

to:

```json
  "canvas": {
    "preview": "Canvas-Vorschau",
    "addSection": "Abschnitt hinzufügen",
    "dropHere": "Block hierher ziehen",
    "changeLayout": "Abschnittslayout ändern",
    "deleteSection": "Abschnitt löschen",
    "moveTo": "Verschieben nach",
    "moveToOtherColumn": "In eine andere Spalte verschieben",
    "sectionCol": "Abschnitt {{section}} · Spalte {{col}}",
    "dragHandle": "Ziehgriff",
    "removeBlock": "Block entfernen"
  },
```

- [ ] **Step 6: Fix `CanvasBlock.jsx` — move `attributes` to the grip handle, add `aria-label`s**

In `client/src/components/canvas/CanvasBlock.jsx`, change the outer card `<div>` (currently lines 41-53) from:

```jsx
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={e => {
        e.stopPropagation()
        dispatch({ type: ACTIONS.SELECT_WIDGET, payload: { instanceId: widget.instanceId } })
      }}
      className={`
        group relative p-4 mb-3 cursor-pointer transition-all
        ${template.card.wrapper}
        ${isSelected ? 'ring-2 ring-blue' : 'hover:ring-1 hover:ring-[color-mix(in_srgb,var(--theme-accent)_30%,transparent)]'}
      `}
    >
```

to:

```jsx
    <div
      ref={setNodeRef}
      style={style}
      onClick={e => {
        e.stopPropagation()
        dispatch({ type: ACTIONS.SELECT_WIDGET, payload: { instanceId: widget.instanceId } })
      }}
      className={`
        group relative p-4 mb-3 cursor-pointer transition-all
        ${template.card.wrapper}
        ${isSelected ? 'ring-2 ring-blue' : 'hover:ring-1 hover:ring-[color-mix(in_srgb,var(--theme-accent)_30%,transparent)]'}
      `}
    >
```

(`{...attributes}` removed from the outer `<div>`.)

Change the grip-handle button (currently lines 55-61) from:

```jsx
      <button
        {...listeners}
        onClick={e => e.stopPropagation()}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-navy cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical size={16} />
      </button>
```

to:

```jsx
      <button
        {...listeners}
        {...attributes}
        onClick={e => e.stopPropagation()}
        aria-label={t('canvas.dragHandle')}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-navy cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical size={16} />
      </button>
```

(`{...attributes}` and `aria-label` added to the grip button — this matches the already-correct pattern in `client/src/components/sidebar-left/PageTreeItem.jsx`, which spreads both `listeners` and `attributes` onto the same drag-handle button.)

Change the remove button (currently lines 73-81) from:

```jsx
        <button
          onClick={e => {
            e.stopPropagation()
            dispatch({ type: ACTIONS.REMOVE_WIDGET, payload: { instanceId: widget.instanceId } })
          }}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <X size={14} />
        </button>
```

to:

```jsx
        <button
          onClick={e => {
            e.stopPropagation()
            dispatch({ type: ACTIONS.REMOVE_WIDGET, payload: { instanceId: widget.instanceId } })
          }}
          aria-label={t('canvas.removeBlock')}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <X size={14} />
        </button>
```

- [ ] **Step 7: Register `KeyboardSensor` in `App.jsx`**

In `client/src/App.jsx`, change the dnd-kit import (currently line 2) from:

```js
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
```

to:

```js
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
```

Change the sensors line (currently line 33) from:

```js
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
```

to:

```js
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `cd client && npx playwright test -g "canvas block has no in-scope accessibility violations|canvas blocks can be reordered with the keyboard"`

Expected: both PASS (`2 passed`).

- [ ] **Step 9: Run the full e2e suite to check for regressions**

Run: `cd client && npx playwright test`

Expected: all tests pass, including the existing `test('removing a block clears the canvas and properties panel', ...)` test, which locates the remove button via `.locator('button').last()` inside `div.group.bg-white` — confirm this still resolves to the same remove button now that it carries an `aria-label` (the locator is structural, unaffected by the new attribute).

- [ ] **Step 10: Commit**

```bash
git add client/src/App.jsx client/src/components/canvas/CanvasBlock.jsx client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json client/tests/smoke.spec.js
git commit -m "fix(a11y): register dnd-kit KeyboardSensor, fix CanvasBlock ARIA attributes"
```

---

### Task 6: Global `ErrorBoundary`

**Files:**
- Create: `client/src/components/common/ErrorBoundary.jsx`
- Create: `client/src/components/common/ErrorBoundary.test.js`
- Modify: `client/src/main.jsx`

**Interfaces:**
- Produces: `ErrorBoundary` — a default-exported React class component. Static `getDerivedStateFromError()` returns `{ hasError: true }`. Instance `render()` returns `this.props.children` when `state.hasError` is falsy, or a fallback element with `role="alert"` and a reload button when `state.hasError` is true.

This is the only task using Vitest. The test calls the class directly and inspects the plain object tree JSX produces — no DOM rendering, no new devDependency, matching this project's existing reducer/helper-style Vitest tests.

- [ ] **Step 1: Write the failing unit tests**

Create `client/src/components/common/ErrorBoundary.test.js`:

```js
import { test, expect } from 'vitest'
import ErrorBoundary from './ErrorBoundary.jsx'

test('getDerivedStateFromError flags the error', () => {
  expect(ErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true })
})

test('render returns children when there is no error', () => {
  const instance = new ErrorBoundary({ children: 'child-content' })
  expect(instance.render()).toBe('child-content')
})

test('render returns a role="alert" fallback when hasError is true', () => {
  const instance = new ErrorBoundary({ children: 'child-content' })
  instance.state = { hasError: true }
  const output = instance.render()
  expect(output.props.role).toBe('alert')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd client && npx vitest run src/components/common/ErrorBoundary.test.js`

Expected: FAILS — `client/src/components/common/ErrorBoundary.jsx` does not exist yet (`Cannot find module`).

- [ ] **Step 3: Create `ErrorBoundary.jsx`**

Create `client/src/components/common/ErrorBoundary.jsx`:

```jsx
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('ShareFlow crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface">
          <p className="text-navy font-semibold">Si è verificato un errore imprevisto.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue text-white rounded-lg">
            Ricarica la pagina
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd client && npx vitest run src/components/common/ErrorBoundary.test.js`

Expected: PASSES (`3 passed`).

- [ ] **Step 5: Wire `ErrorBoundary` into `main.jsx`**

In `client/src/main.jsx`, change the import block (currently lines 1-8) from:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n.js'
import './index.css'
import App from './App.jsx'
import { ConfiguratorProvider } from './context/ConfiguratorContext.jsx'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance, isMsalConfigured } from './auth/msalInstance.js'
```

to:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n.js'
import './index.css'
import App from './App.jsx'
import { ConfiguratorProvider } from './context/ConfiguratorContext.jsx'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance, isMsalConfigured } from './auth/msalInstance.js'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
```

Change the render call (currently lines 16-20) from:

```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isMsalConfigured ? <MsalProvider instance={msalInstance}>{app}</MsalProvider> : app}
  </StrictMode>
)
```

to:

```jsx
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {isMsalConfigured ? <MsalProvider instance={msalInstance}>{app}</MsalProvider> : app}
    </ErrorBoundary>
  </StrictMode>
)
```

(`ErrorBoundary` sits outside `MsalProvider`/`ConfiguratorProvider` so it also catches errors thrown by those providers, not just by `<App />` itself.)

- [ ] **Step 6: Run the full unit and e2e suites to check for regressions**

Run: `cd client && npx vitest run && npx playwright test`

Expected: all unit tests pass, all e2e tests pass (the app renders identically when there is no error, since `ErrorBoundary.render()` returns `this.props.children` unchanged in that case).

- [ ] **Step 7: Commit**

```bash
git add client/src/components/common/ErrorBoundary.jsx client/src/components/common/ErrorBoundary.test.js client/src/main.jsx
git commit -m "feat(a11y): add global ErrorBoundary around the app"
```

---

## Final check

After Task 6, run both suites once more from `client/`:

```bash
npx vitest run
npx playwright test
```

Expected: all Vitest tests pass (54 pre-existing + 3 new = 57), all Playwright tests pass (24 pre-existing + 7 new = 31).
