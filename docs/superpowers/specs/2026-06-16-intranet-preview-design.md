# Intranet Preview — Design Spec

## Goal

Add a "Preview" mode that opens a separate browser tab showing the intranet page exactly as the end user would see it: full width, no editing chrome, with a live sync to the editor and a device switcher for desktop / tablet / mobile breakpoints.

## Architecture

**Approach: localStorage + BroadcastChannel + `?mode=preview` query param.**

The editor serializes its state to `localStorage['shareflow-preview']` on every change (debounced 300 ms) and broadcasts a message on `BroadcastChannel('shareflow-preview')`. Clicking "Preview" opens `/?mode=preview` in a named window; that tab reads localStorage on mount and listens to the channel for live updates. No server changes required.

**Tech stack:** React 19, Vite, Tailwind CSS 3.4 (JIT), existing `ConfiguratorContext`, `BroadcastChannel` API, `localStorage`.

---

## Section 1 — Entry Point

### Navbar button

A "Preview" button is added to the right side of the existing `Navbar.jsx`, between the page title and the "Deploy to SharePoint" button.

```jsx
<button onClick={openPreview} className="...">
  <Eye size={14} />
  Preview
</button>
```

```js
function openPreview() {
  window.open('/?mode=preview', 'shareflow-preview')
}
```

Using `'shareflow-preview'` as the window name means repeated clicks bring the existing preview tab into focus rather than opening a new one.

---

## Section 2 — State Synchronization

### Editor side — `usePreviewSync` hook

A new hook `client/src/hooks/usePreviewSync.js` is responsible for writing state to localStorage and broadcasting updates. It is called once inside `ConfiguratorContext` (or the root `App` component), receives the current `state`, and runs a debounced effect on every state change.

```js
// client/src/hooks/usePreviewSync.js
import { useEffect, useRef } from 'react'

const CHANNEL = 'shareflow-preview'
const KEY     = 'shareflow-preview'
const DELAY   = 300

export function usePreviewSync(state) {
  const channel = useRef(null)

  useEffect(() => {
    channel.current = new BroadcastChannel(CHANNEL)
    return () => channel.current.close()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      const json = JSON.stringify(state)
      localStorage.setItem(KEY, json)
      channel.current?.postMessage({ type: 'state-update', state })
    }, DELAY)
    return () => clearTimeout(timer)
  }, [state])
}
```

### Preview side — `usePreviewState` hook

A new hook `client/src/hooks/usePreviewState.js` reads the initial state from localStorage and subscribes to `BroadcastChannel` updates.

```js
// client/src/hooks/usePreviewState.js
import { useState, useEffect } from 'react'

const CHANNEL = 'shareflow-preview'
const KEY     = 'shareflow-preview'

export function usePreviewState() {
  const [state, setState] = useState(() => {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  })

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL)
    channel.onmessage = e => {
      if (e.data?.type === 'state-update') setState(e.data.state)
    }
    return () => channel.close()
  }, [])

  return state
}
```

---

## Section 3 — Preview Mode Detection

`App.jsx` checks `?mode=preview` on mount. If present, it renders `PreviewApp` instead of `WorkspaceShell`. The check uses `URLSearchParams`:

```js
const isPreview = new URLSearchParams(window.location.search).get('mode') === 'preview'

return isPreview ? <PreviewApp /> : <WorkspaceShell />
```

`PreviewApp` is a new top-level component at `client/src/components/preview/PreviewApp.jsx`.

---

## Section 4 — PreviewApp Component

`PreviewApp` is responsible for the full preview tab layout: a toolbar at the top and the page content below.

```
┌─ Toolbar (bg-navy, h-10) ─────────────────────────────────────────┐
│  ShareFlow [LIVE]      [🖥 Desktop] [📱 Tablet] [📱 Mobile]   [✕]  │
└───────────────────────────────────────────────────────────────────┘
┌─ Page content (scrollable, bg-surface) ───────────────────────────┐
│  ┌─ --preview-width centered ─────────────────────────────────┐   │
│  │  <CanvasTopNav />                                           │   │
│  │  <HeroBanner />                                             │   │
│  │  <sections>                                                 │   │
│  │    <CanvasSection /> × N  (read-only mode)                  │   │
│  │  </sections>                                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

### State

```js
const [device, setDevice] = useState('desktop') // 'desktop' | 'tablet' | 'mobile'
const state = usePreviewState()
```

### Device widths

| `device` | `--preview-width` | Meaning |
|---|---|---|
| `'desktop'` | `100%` (max 1440px) | Full-width, default |
| `'tablet'`  | `768px` | iPad landscape |
| `'mobile'`  | `375px` | iPhone 14 |

The width is applied as an inline style on the content container:

```jsx
const WIDTH = { desktop: '100%', tablet: '768px', mobile: '375px' }

<div style={{ width: WIDTH[device], maxWidth: device === 'desktop' ? '1440px' : undefined, margin: '0 auto' }}>
```

### Null state (no editor open yet)

If `usePreviewState` returns `null` (localStorage empty — user opened preview before the editor), `PreviewApp` shows a centered message:

```
Apri ShareFlow nell'editor per vedere la preview.
```

### Live badge

The "LIVE" badge in the toolbar is always visible. It indicates the preview is receiving updates from an open editor tab. No disconnection detection is needed in v1.

---

## Section 5 — Read-Only Canvas Rendering

`PreviewApp` renders the active page by reusing existing canvas components. Because those components read data internally via `useConfigurator()`, `PreviewApp` must mount a **read-only context provider** that supplies the preview state through the same hook.

### `PreviewProvider`

A new thin provider `client/src/components/preview/PreviewProvider.jsx` wraps `ConfiguratorContext.Provider` with the preview state and a no-op dispatch:

```jsx
import { ConfiguratorContext } from '../../context/ConfiguratorContext.js'
import { ACTIONS } from '../../context/configuratorReducer.js'

export function PreviewProvider({ state, children }) {
  const value = { state, dispatch: () => {}, ACTIONS }
  return (
    <ConfiguratorContext.Provider value={value}>
      {children}
    </ConfiguratorContext.Provider>
  )
}
```

This means `useConfigurator()` works as normal inside all child components; dispatched actions are silently ignored (no state mutation in preview).

### Components reused as-is (no changes needed)

- `CanvasTopNav` — reads theme from `useTheme`; works unchanged inside `PreviewProvider`
- `HeroBanner` — same
- `CanvasBlockPreview` — already stateless; renders block content from props

### Components that need a `readOnly` prop

- `CanvasSection` — currently renders selection ring, layout picker, delete button. `readOnly={true}` suppresses these.
- `CanvasColumn` — in read-only mode renders each widget as `<CanvasBlockPreview>` directly, skipping `CanvasBlock` entirely. This avoids the `useSortable()` / `DndContext` dependency that would throw without a sortable tree.

`CanvasBlock` is **not used** in preview — `CanvasColumn` renders `CanvasBlockPreview` directly when `readOnly={true}`, passing `block` and `contentItems` from the widget props. No DnD context is needed in the preview tab.

The `readOnly` prop is passed down from `PreviewApp` → `CanvasSection` → `CanvasColumn` (2 levels of prop drilling).

### Theme

`PreviewApp` reads `state.tenantConfiguration.theme`, calls `resolveTheme()`, and injects `--theme-accent` as a CSS variable on the root container — identical to how the editor canvas does it today.

---

## Section 6 — Files Created / Modified

### New files

| File | Responsibility |
|---|---|
| `client/src/hooks/usePreviewSync.js` | Debounced localStorage write + BroadcastChannel publish (editor side) |
| `client/src/hooks/usePreviewState.js` | localStorage read on mount + BroadcastChannel subscribe (preview side) |
| `client/src/components/preview/PreviewApp.jsx` | Full preview tab: toolbar + device switcher + read-only page render |
| `client/src/components/preview/PreviewToolbar.jsx` | Toolbar UI: logo, LIVE badge, device switcher, close button |
| `client/src/components/preview/PreviewProvider.jsx` | Read-only ConfiguratorContext provider with no-op dispatch |

### Modified files

| File | Change |
|---|---|
| `client/src/App.jsx` | Detect `?mode=preview`, conditionally render `PreviewApp` |
| `client/src/App.jsx` | Call `usePreviewSync(state)` inside the editor branch |
| `client/src/components/layout/Navbar.jsx` | Add "Preview" button |
| `client/src/components/canvas/CanvasSection.jsx` | Accept `readOnly` prop; suppress selection ring, layout picker, delete button |
| `client/src/components/canvas/CanvasColumn.jsx` | Accept `readOnly` prop; render `CanvasBlockPreview` directly (skips `CanvasBlock` and DnD) |

---

## Section 7 — Testing

New Playwright tests in `client/tests/smoke.spec.js`:

1. **Preview button exists in navbar**: `getByRole('button', { name: 'Preview' })` is visible.
2. **Preview tab opens and renders page**: click "Preview", switch to new page (Playwright `context.waitForEvent('page')`), assert nav and hero are visible.
3. **No edit chrome in preview**: confirm no drag handle (`[data-drag-handle]`) and no "Aggiungi sezione" button in the preview tab.
4. **Device switcher changes container width**: click "Mobile" in preview toolbar, assert content container width is `375px`.

---

## Out of Scope

- Authentication / MSAL flow in preview tab (preview is unauthenticated, editor-only feature)
- Disconnection detection (no "editor closed" indicator in v1)
- Print-to-PDF from preview
- Preview of pages other than the active page (v1 previews only `state.activePageId`)
- Annotations or comments overlay
- Pixel-perfect SharePoint webpart fidelity (design-system faithful only)
