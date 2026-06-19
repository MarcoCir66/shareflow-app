# Accessibility hardening — design spec

**Date:** 2026-06-19
**Phase:** Phase 4 (completamento/hardening), sub-project 3 of 3 (after backend security/robustness and unit tests, both complete)

## Goal

Make the ShareFlow editor usable via keyboard alone and intelligible to screen readers (NVDA/JAWS/VoiceOver). This is not a formal WCAG conformance audit — it targets the four concrete gaps identified in a prior codebase survey (2026-06-17):

1. Drag-and-drop (canvas blocks/sections, page tree) has no keyboard path — only `PointerSensor` is registered.
2. `DeployModal` has no `role="dialog"`, no focus trap, Escape doesn't close it.
3. Popup menus (`CanvasBlock`'s "move to column" menu, `SectionLayoutPicker`) have no `role="menu"`/`menuitem"`, no arrow-key navigation, no Escape/click-outside handling.
4. No React Error Boundary exists anywhere — any render error produces a blank white page.

`LanguageSwitcher.jsx` already implements the target pattern correctly (`role="group"`, `aria-label`, `aria-pressed`) and serves as the reference for "what good looks like" in this codebase.

## Scope

In scope: the four items above, plus the supporting primitives needed to fix them (focus-trap hook, shared accessible menu component) and their tests. No broader WCAG audit, no redesign of visual styling, no per-region error boundaries (single global boundary).

## Section 1 — Architecture & files

**New files:**
- `client/src/hooks/useFocusTrap.js` — generic hook. Traps Tab/Shift+Tab inside a container ref while `active`, calls `onEscape` on the Escape key, captures `document.activeElement` when activated and restores focus to it on deactivation/unmount.
- `client/src/components/common/AccessibleMenu.jsx` — shared popup-menu primitive. Renders a `trigger` plus, when `isOpen`, a `role="menu"` container that: navigates `[role="menuitem"]` children with ArrowUp/ArrowDown, closes on Escape (via `useFocusTrap`) and on click-outside, and restores focus to the trigger on close.
- `client/src/components/common/ErrorBoundary.jsx` — standard React class component (`getDerivedStateFromError` + `componentDidCatch`), global fallback UI with a reload button.

**Modified files:**
- `client/src/components/deploy/DeployModal.jsx` — adds `role="dialog" aria-modal="true" aria-labelledby="deploy-modal-title"` on the dialog container and wires `useFocusTrap`.
- `client/src/components/canvas/CanvasBlock.jsx` — the "move to column" popup switches from a raw `<div>` to `<AccessibleMenu>`; each target button gains `role="menuitem"`; dnd-kit's `{...attributes}` move from the outer wrapper `<div>` to the grip-handle `<button>` (merging with the `{...listeners}` already there).
- `client/src/components/canvas/SectionLayoutPicker.jsx` — same `AccessibleMenu` treatment for its popup; each layout option gains `role="menuitem"`.
- `client/src/App.jsx` — registers a `KeyboardSensor` (with `sortableKeyboardCoordinates` from `@dnd-kit/sortable`) alongside the existing `PointerSensor` in `useSensors`.
- `client/src/main.jsx` — wraps `<App />` in `<ErrorBoundary>`.
- `client/package.json` — adds `@axe-core/playwright` devDependency.
- `client/tests/smoke.spec.js` — extended with the new tests described in Section 6.

No backend/server changes. No changes to `configuratorReducer.js` or any state shape — this is purely a presentation/interaction-layer hardening pass, consistent with how the prior two Phase 4 sub-projects stayed scoped to their respective layers.

## Section 2 — Focus trap & `DeployModal`

`useFocusTrap(containerRef, { active, onEscape })`:

```js
import { useEffect } from 'react'

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

The hook captures `document.activeElement` itself when the effect runs — no external "trigger ref" needs to be threaded through. For `DeployModal`, that element will naturally be the Navbar's "Deploy to SharePoint" button, since that's what has focus when the modal opens.

`DeployModal.jsx` changes:

```jsx
const dialogRef = useRef(null)
useFocusTrap(dialogRef, { active: true, onEscape: onClose })

return (
  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="deploy-modal-title" /* ...existing classes... */>
      <h2 id="deploy-modal-title">{t('deploy.title')}</h2>
      {/* ...existing content unchanged... */}
    </div>
  </div>
)
```

`onClose` is already safe to call in any modal state (the existing X button and "Done" button call it unconditionally today), so Escape needs no extra guard.

## Section 3 — `AccessibleMenu` shared primitive

```jsx
import { useEffect, useRef } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'

export default function AccessibleMenu({ isOpen, onClose, trigger, children, className }) {
  const menuRef = useRef(null)
  useFocusTrap(menuRef, { active: isOpen, onEscape: onClose })

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e) {
      if (!menuRef.current?.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  function handleArrowKey(e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = Array.from(menuRef.current.querySelectorAll('[role="menuitem"]'))
    if (items.length === 0) return
    const idx = items.indexOf(document.activeElement)
    const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length
    items[next]?.focus()
  }

  return (
    <>
      {trigger}
      {isOpen && (
        <div ref={menuRef} role="menu" onKeyDown={handleArrowKey} className={className}>
          {children}
        </div>
      )}
    </>
  )
}
```

`CanvasBlock.jsx` usage — the existing trigger button and menu markup are kept; only the wrapper and `role="menuitem"` on each item change:

```jsx
<AccessibleMenu
  isOpen={moveMenuOpen}
  onClose={() => setMoveMenuOpen(false)}
  trigger={
    <button onClick={e => { e.stopPropagation(); setMoveMenuOpen(o => !o) }} title={t('canvas.moveToOtherColumn')}>
      <ArrowRightLeft size={14} />
    </button>
  }
  className="absolute right-2 top-9 z-20 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1"
>
  <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{t('canvas.moveTo')}</p>
  {otherColumns.map(target => (
    <button key={target.columnId} role="menuitem" onClick={() => { /* unchanged dispatch */ setMoveMenuOpen(false) }}>
      {target.label}
    </button>
  ))}
</AccessibleMenu>
```

`SectionLayoutPicker.jsx` gets the same treatment: its trigger button becomes `trigger`, and each layout-choice button gains `role="menuitem"`.

No dispatch/business logic changes in either component — only the accessibility wrapper around already-existing markup.

## Section 4 — Drag-and-drop keyboard support

`App.jsx`:

```jsx
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
)
```

This single change enables Tab → Space (pick up) → Arrow keys (move) → Space (drop) / Escape (cancel) on every existing `useSortable()` instance in the app (canvas blocks, page tree) — dnd-kit's built-in behavior, no new interaction logic to write.

`CanvasBlock.jsx` fix — dnd-kit's `attributes` (which carry `role`, `tabIndex`, `aria-roledescription="draggable"`, and the auto-generated `aria-describedby` screen-reader instructions) currently land on the outer wrapper `<div>`, while the keyboard/pointer `listeners` are on the small grip-handle `<button>`. Without this fix, the keyboard sensor would technically work (the grip button is focusable and has the listeners) but a screen reader would announce a plain unlabeled button with no indication it's draggable or how to operate it. `PageTreeItem.jsx` already does this correctly and is the reference:

```jsx
// before: <div ref={setNodeRef} style={style} {...attributes} onClick={...}>
// after:  <div ref={setNodeRef} style={style} onClick={...}>
...
// before: <button {...listeners} onClick={...}><GripVertical /></button>
// after:  <button {...listeners} {...attributes} onClick={...}><GripVertical /></button>
```

No other change needed — dnd-kit manages its own live-region announcements during keyboard drag internally.

## Section 5 — Global Error Boundary

```jsx
// client/src/components/common/ErrorBoundary.jsx
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

`main.jsx`:

```jsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

The fallback text is a static, non-translated string (not routed through `useTranslation()`/`t()`): if the app has crashed, the i18next provider itself could be the cause, so the fallback must not depend on it. `role="alert"` ensures screen readers announce it immediately on render.

Single global boundary, not per-region — consistent with the chosen scope (simplicity over fault isolation for this pass).

## Section 6 — Testing

**Setup:** add `@axe-core/playwright` as a client devDependency, used from the existing Playwright suite (`client/tests/smoke.spec.js`).

**Automated violation scans (axe-core):**
1. Default editor load (Home page) — no violations.
2. `DeployModal` open — no violations (confirms the new `role="dialog"`/`aria-modal` doesn't introduce new issues).
3. `AccessibleMenu` open (both the block "move to" menu and the section layout picker) — no violations.

**Keyboard-interaction e2e tests (behavior, not just static violations):**
4. Open `DeployModal`, Tab repeatedly — focus stays inside the dialog; Escape closes it and focus returns to the Navbar's "Deploy to SharePoint" button.
5. Tab to a block's "move to" button, Enter opens the menu — assert `role="menu"`/`menuitem"`, ArrowDown moves focus between items, Escape closes and returns focus to the trigger button.
6. Tab to a canvas block's grip handle, Space to pick up, ArrowDown, Space to drop — assert block order changed in state (same pattern as the existing mega-menu interaction tests).

**Vitest unit test** for `ErrorBoundary` (reuses the Vitest infrastructure added in the prior unit-tests sub-project): render a child that throws during render, assert the fallback UI is shown instead of the error propagating.

No coverage threshold enforcement, consistent with the decision made in the unit-tests sub-project — tests exist, no automated minimum-percentage gate.

## Out of scope

- Formal WCAG 2.1 AA conformance audit/certification.
- Per-region error boundaries (canvas / left sidebar / right sidebar isolated from each other).
- Keyboard-equivalent buttons as an alternative to drag-and-drop (e.g., explicit "move up/down" buttons) — dnd-kit's `KeyboardSensor` is the chosen mechanism.
- Any other component not touched by the four identified gaps. Note: `PreviewToolbar`'s device switcher buttons (Desktop/Tablet/Mobile) were checked during spec self-review and do **not** follow the `LanguageSwitcher` reference pattern (no `role`/`aria-pressed`) — this is a real, separate gap, but it falls outside the four areas scoped for this sub-project and is left for a future pass rather than expanding scope here.
