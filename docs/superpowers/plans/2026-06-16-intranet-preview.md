# Intranet Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Preview" button to the editor navbar that opens a separate browser tab showing the current intranet page in read-only mode at full width, with a device switcher (Desktop/Tablet/Mobile) and live sync from the editor via localStorage + BroadcastChannel.

**Architecture:** The editor serializes its configurator state to `localStorage['shareflow-preview']` on every change (debounced 300 ms) and broadcasts updates via `BroadcastChannel('shareflow-preview')`. A new route `/?mode=preview` detects preview mode and renders `PreviewApp` instead of the editor shell; `PreviewApp` reads state from localStorage/BroadcastChannel, injects it into a read-only `ConfiguratorContext.Provider` (no-op dispatch), and renders the canvas components without any editing chrome. `CanvasColumn` in read-only mode renders `CanvasBlockPreview` directly, bypassing `CanvasBlock` and all DnD dependencies.

**Tech Stack:** React 19, Vite, Tailwind CSS 3.4 (JIT), `localStorage`, `BroadcastChannel` API, Playwright (e2e tests). No new npm packages required.

---

## File Map

**New files:**
- `client/src/hooks/usePreviewSync.js` — debounced localStorage write + BroadcastChannel publish (editor side)
- `client/src/hooks/usePreviewState.js` — localStorage read on mount + BroadcastChannel subscribe (preview side)
- `client/src/components/preview/PreviewProvider.jsx` — read-only `ConfiguratorContext.Provider` with no-op dispatch
- `client/src/components/preview/PreviewToolbar.jsx` — toolbar: logo, LIVE badge, device switcher, close button
- `client/src/components/preview/PreviewApp.jsx` — top-level preview tab component

**Modified files:**
- `client/src/components/canvas/CanvasSection.jsx` — add `readOnly` prop, suppress edit chrome
- `client/src/components/canvas/CanvasColumn.jsx` — add `readOnly` prop, render `CanvasBlockPreview` directly (skips DnD)
- `client/src/App.jsx` — detect `?mode=preview`, conditionally render `PreviewApp`, call `usePreviewSync`
- `client/src/components/layout/Navbar.jsx` — add "Preview" button
- `client/tests/smoke.spec.js` — 4 new Playwright tests

---

## Task 1: `usePreviewSync` hook

**Files:**
- Create: `client/src/hooks/usePreviewSync.js`

**Context:** This hook runs in the editor tab. It listens to state changes from `ConfiguratorContext`, debounces them by 300 ms, writes the serialized state to `localStorage['shareflow-preview']`, and broadcasts a message on `BroadcastChannel('shareflow-preview')` so any open preview tab receives the update immediately without polling.

- [ ] **Step 1: Create the hook file**

```js
// client/src/hooks/usePreviewSync.js
import { useEffect, useRef } from 'react'

const CHANNEL_NAME = 'shareflow-preview'
const STORAGE_KEY  = 'shareflow-preview'
const DEBOUNCE_MS  = 300

export function usePreviewSync(state) {
  const channelRef = useRef(null)

  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL_NAME)
    return () => channelRef.current.close()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      const json = JSON.stringify(state)
      localStorage.setItem(STORAGE_KEY, json)
      channelRef.current?.postMessage({ type: 'state-update', state })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [state])
}
```

- [ ] **Step 2: Verify no build errors**

Run from `shareflow-app/client/`:
```
npm run build
```
Expected: build succeeds, no errors. (The hook is not yet called anywhere — that's fine.)

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/usePreviewSync.js
git commit -m "feat: add usePreviewSync hook (editor → localStorage + BroadcastChannel)"
```

---

## Task 2: `usePreviewState` hook

**Files:**
- Create: `client/src/hooks/usePreviewState.js`

**Context:** This hook runs in the preview tab. It reads the initial state from `localStorage['shareflow-preview']` on mount (handles missing/malformed JSON gracefully) and then subscribes to `BroadcastChannel('shareflow-preview')` for live updates from the editor.

- [ ] **Step 1: Create the hook file**

```js
// client/src/hooks/usePreviewState.js
import { useState, useEffect } from 'react'

const CHANNEL_NAME = 'shareflow-preview'
const STORAGE_KEY  = 'shareflow-preview'

export function usePreviewState() {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = e => {
      if (e.data?.type === 'state-update') setState(e.data.state)
    }
    return () => channel.close()
  }, [])

  return state
}
```

- [ ] **Step 2: Verify no build errors**

```
npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/usePreviewState.js
git commit -m "feat: add usePreviewState hook (localStorage + BroadcastChannel subscribe)"
```

---

## Task 3: `PreviewProvider` component

**Files:**
- Create: `client/src/components/preview/PreviewProvider.jsx`

**Context:** All canvas components (`CanvasTopNav`, `HeroBanner`, `CanvasSection`) call `useConfigurator()` internally, which reads from `ConfiguratorContext`. `PreviewApp` must supply a context so these components work without modification. `PreviewProvider` wraps `ConfiguratorContext.Provider` with the preview state and a no-op dispatch — dispatched actions are silently ignored, so clicks in the preview nav or other interactive elements do nothing harmful.

Note: `useConfigurator` in `hooks/useConfigurator.js` adds `ACTIONS` from the reducer module — `PreviewProvider` does NOT need to include `ACTIONS` in the value since `useConfigurator` imports them directly:

```js
// hooks/useConfigurator.js — existing code, do not modify
export function useConfigurator() {
  const ctx = useContext(ConfiguratorContext)
  if (!ctx) throw new Error('useConfigurator must be used inside ConfiguratorProvider')
  return { ...ctx, ACTIONS }  // ACTIONS comes from the import, not from ctx
}
```

So `ConfiguratorContext.Provider` only needs `{ state, dispatch }` in its value.

- [ ] **Step 1: Create the component**

```jsx
// client/src/components/preview/PreviewProvider.jsx
import { ConfiguratorContext } from '../../context/ConfiguratorContext.jsx'

const noop = () => {}

export function PreviewProvider({ state, children }) {
  return (
    <ConfiguratorContext.Provider value={{ state, dispatch: noop }}>
      {children}
    </ConfiguratorContext.Provider>
  )
}
```

- [ ] **Step 2: Verify no build errors**

```
npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/preview/PreviewProvider.jsx
git commit -m "feat: add PreviewProvider (read-only ConfiguratorContext for preview tab)"
```

---

## Task 4: `CanvasSection` — `readOnly` prop

**Files:**
- Modify: `client/src/components/canvas/CanvasSection.jsx`

**Context:** `CanvasSection` currently renders: (a) a `div` with `onClick` that selects the section, (b) a dashed border ring showing selection state, (c) hover-visible buttons for changing layout and deleting the section. In read-only mode, all of this must disappear — only the grid of columns remains, with no interactivity.

The `readOnly` prop is passed down to `CanvasColumn` (Task 5).

- [ ] **Step 1: Add `readOnly` branch to `CanvasSection`**

Replace the entire content of `client/src/components/canvas/CanvasSection.jsx` with:

```jsx
import { useState } from 'react'
import { LayoutGrid, Trash2 } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { SECTION_LAYOUTS } from '../../data/sectionLayouts.js'
import CanvasColumn from './CanvasColumn.jsx'
import SectionLayoutPicker from './SectionLayoutPicker.jsx'

export default function CanvasSection({ section, readOnly = false }) {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const [pickerOpen, setPickerOpen] = useState(false)

  const layout = SECTION_LAYOUTS[section.layout]

  if (readOnly) {
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

  const isSelected = state.selectedSectionId === section.sectionId
  const isEmpty = section.columns.every(c => c.widgets.length === 0)

  return (
    <div
      onClick={() => dispatch({ type: ACTIONS.SELECT_SECTION, payload: { sectionId: section.sectionId } })}
      className={`
        group relative mb-4 p-2 rounded-xl border-2 border-dashed transition-colors cursor-pointer
        ${isSelected ? 'border-blue bg-blue/5' : 'border-transparent hover:border-slate-mid'}
      `}
    >
      <div className="absolute -top-3 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setPickerOpen(o => !o) }}
          className="p-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-slate hover:text-blue hover:border-blue transition-colors"
          title="Cambia layout sezione"
        >
          <LayoutGrid size={14} />
        </button>
        {isEmpty && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              dispatch({ type: ACTIONS.REMOVE_SECTION, payload: { sectionId: section.sectionId } })
            }}
            className="p-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-slate hover:text-red-500 hover:border-red-300 transition-colors"
            title="Elimina sezione"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

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
    </div>
  )
}
```

- [ ] **Step 2: Verify no build errors and editor still works**

```
npm run build
```
Expected: build succeeds with no errors. Start `npm run dev` and verify the editor canvas still renders sections normally (edit mode unchanged).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/canvas/CanvasSection.jsx
git commit -m "feat: add readOnly prop to CanvasSection (suppresses edit chrome)"
```

---

## Task 5: `CanvasColumn` — `readOnly` prop

**Files:**
- Modify: `client/src/components/canvas/CanvasColumn.jsx`

**Context:** `CanvasColumn` currently uses `useDroppable` (DnD drop target) and `SortableContext` to render draggable `CanvasBlock` widgets. Both require a parent `DndContext` which doesn't exist in the preview tab. In `readOnly` mode, we bypass DnD entirely and render `CanvasBlockPreview` directly for each widget, passing `block` from `blockById` and `contentItems` from `widget.props`.

- [ ] **Step 1: Add `readOnly` branch to `CanvasColumn`**

Replace the entire content of `client/src/components/canvas/CanvasColumn.jsx` with:

```jsx
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { blockById } from '../../data/blockCatalog.js'
import CanvasBlock from './CanvasBlock.jsx'
import CanvasBlockPreview from './CanvasBlockPreview.jsx'

export default function CanvasColumn({ sectionId, column, widthHint, readOnly = false }) {
  if (readOnly) {
    return (
      <div className="min-h-0">
        {column.widgets.map(widget => {
          const block = blockById[widget.blockId]
          if (!block) return null
          return (
            <div key={widget.instanceId} className="mb-3">
              <CanvasBlockPreview
                block={block}
                width={widthHint}
                contentItems={widget.props.contentItems ?? []}
              />
            </div>
          )
        })}
      </div>
    )
  }

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.columnId}`,
    data: { type: 'column' },
  })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[7rem] rounded-xl transition-colors ${isOver ? 'bg-blue/5' : ''}`}
    >
      <SortableContext items={column.widgets.map(w => w.instanceId)} strategy={verticalListSortingStrategy}>
        {column.widgets.length === 0 ? (
          <div className="h-28 flex items-center justify-center text-center text-xs text-slate-light border-2 border-dashed border-slate-mid rounded-xl px-3">
            Trascina qui un blocco
          </div>
        ) : (
          column.widgets.map(widget => (
            <CanvasBlock
              key={widget.instanceId}
              widget={widget}
              sectionId={sectionId}
              columnId={column.columnId}
              widthHint={widthHint}
            />
          ))
        )}
      </SortableContext>
    </div>
  )
}
```

- [ ] **Step 2: Verify no build errors and editor still works**

```
npm run build
```
Expected: build succeeds. Start `npm run dev`, add a block to the canvas — confirm it still renders and drag-and-drop still works.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/canvas/CanvasColumn.jsx
git commit -m "feat: add readOnly prop to CanvasColumn (renders CanvasBlockPreview directly, no DnD)"
```

---

## Task 6: `PreviewToolbar` component

**Files:**
- Create: `client/src/components/preview/PreviewToolbar.jsx`

**Context:** The preview tab shows a thin `h-10` navy toolbar at the top. It contains: left — "ShareFlow" logo + green "LIVE" badge; center — device switcher with three buttons (Desktop / Tablet / Mobile); right — "Chiudi preview" button that calls `window.close()`.

- [ ] **Step 1: Create the toolbar component**

```jsx
// client/src/components/preview/PreviewToolbar.jsx
import { Monitor, Tablet, Smartphone, X } from 'lucide-react'

const DEVICES = [
  { key: 'desktop', label: 'Desktop', Icon: Monitor },
  { key: 'tablet',  label: 'Tablet',  Icon: Tablet },
  { key: 'mobile',  label: 'Mobile',  Icon: Smartphone },
]

export default function PreviewToolbar({ device, onDevice }) {
  return (
    <div className="flex items-center justify-between bg-navy h-10 px-4 flex-shrink-0 border-b border-slate">
      <div className="flex items-center gap-2">
        <span className="text-blue-electric font-bold text-sm">ShareFlow</span>
        <span className="bg-green-500 text-white text-[9px] font-bold rounded px-1.5 py-0.5 tracking-wide">
          LIVE
        </span>
      </div>

      <div className="flex gap-1 bg-navy-light rounded-md p-0.5">
        {DEVICES.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onDevice(key)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-medium transition-colors ${
              device === key ? 'bg-blue text-white' : 'text-slate-light hover:text-white'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={() => window.close()}
        className="flex items-center gap-1 text-slate-light hover:text-white text-[10px] transition-colors"
      >
        <X size={12} />
        Chiudi preview
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify no build errors**

```
npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/preview/PreviewToolbar.jsx
git commit -m "feat: add PreviewToolbar (device switcher + LIVE badge)"
```

---

## Task 7: `PreviewApp` component

**Files:**
- Create: `client/src/components/preview/PreviewApp.jsx`

**Context:** `PreviewApp` is the top-level component rendered in the preview tab. It orchestrates: reading preview state via `usePreviewState()`, wrapping children in `PreviewProvider`, rendering `PreviewToolbar` with device switcher state, and rendering the full page (nav + hero + sections) inside a width-constrained container. If no state is available in localStorage yet (tab opened before editor), it shows a prompt.

The `data-device` attribute on the content container is used by Playwright tests to verify device switching.

- [ ] **Step 1: Create the component**

```jsx
// client/src/components/preview/PreviewApp.jsx
import { useState } from 'react'
import { usePreviewState } from '../../hooks/usePreviewState.js'
import { PreviewProvider } from './PreviewProvider.jsx'
import PreviewToolbar from './PreviewToolbar.jsx'
import { findPage } from '../../context/pageHelpers.js'
import { resolveTheme } from '../../data/themeTemplates.js'
import CanvasTopNav from '../canvas/CanvasTopNav.jsx'
import HeroBanner from '../canvas/HeroBanner.jsx'
import CanvasSection from '../canvas/CanvasSection.jsx'

const WIDTH = { desktop: '100%', tablet: '768px', mobile: '375px' }

export default function PreviewApp() {
  const [device, setDevice] = useState('desktop')
  const state = usePreviewState()

  if (!state) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-slate text-sm">
          Apri ShareFlow nell&apos;editor per vedere la preview.
        </p>
      </div>
    )
  }

  const { accentColor } = resolveTheme(state.tenantConfiguration.theme)
  const activePage = findPage(state.pages, state.activePageId)

  return (
    <PreviewProvider state={state}>
      <div className="min-h-screen bg-surface flex flex-col">
        <PreviewToolbar device={device} onDevice={setDevice} />
        <div className="flex-1 overflow-y-auto p-6">
          <div
            data-device={device}
            style={{
              width: WIDTH[device],
              maxWidth: device === 'desktop' ? '1440px' : undefined,
              margin: '0 auto',
              '--theme-accent': accentColor,
            }}
          >
            <CanvasTopNav />
            <HeroBanner />
            {activePage.sections.map(section => (
              <CanvasSection key={section.sectionId} section={section} readOnly />
            ))}
          </div>
        </div>
      </div>
    </PreviewProvider>
  )
}
```

- [ ] **Step 2: Verify no build errors**

```
npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/preview/PreviewApp.jsx
git commit -m "feat: add PreviewApp (full read-only page render with device switcher)"
```

---

## Task 8: Wire `App.jsx` — preview mode detection + `usePreviewSync`

**Files:**
- Modify: `client/src/App.jsx`

**Context:** Two changes: (1) `AppInner` (the existing editor function) must call `usePreviewSync(state)` so state is written to localStorage as the editor runs. (2) `App` (the default export) must detect `?mode=preview` and render `PreviewApp` instead of `AppInner`.

`IS_PREVIEW` is computed once at module level (before any React renders). Because the preview tab always loads with `?mode=preview` in the URL and the URL never changes during the session, module-level evaluation is safe.

Note: `AppInner` is already inside `ConfiguratorProvider` (from `main.jsx`), so calling `useConfigurator()` there is fine. In preview mode, `App` renders `PreviewApp` which uses `PreviewProvider` internally — it is also inside `ConfiguratorProvider`, but `PreviewProvider` overrides the context for its children.

- [ ] **Step 1: Rewrite `App.jsx`**

Replace the entire content of `client/src/App.jsx` with:

```jsx
import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { useConfigurator } from './hooks/useConfigurator.js'
import { usePreviewSync } from './hooks/usePreviewSync.js'
import { blockById } from './data/blockCatalog.js'
import { findWidgetLocation, findColumnById } from './context/sectionHelpers.js'
import { findPage } from './context/pageHelpers.js'
import Navbar from './components/layout/Navbar.jsx'
import WorkspaceShell from './components/layout/WorkspaceShell.jsx'
import LeftSidebar from './components/sidebar-left/LeftSidebar.jsx'
import CanvasDropZone from './components/canvas/CanvasDropZone.jsx'
import PropertiesPanel from './components/sidebar-right/PropertiesPanel.jsx'
import DeployModal from './components/deploy/DeployModal.jsx'
import CanvasBlockPreview from './components/canvas/CanvasBlockPreview.jsx'
import PreviewApp from './components/preview/PreviewApp.jsx'

const COLUMN_PREFIX = 'column-'
const IS_PREVIEW = new URLSearchParams(window.location.search).get('mode') === 'preview'

function resolveColumnTarget(overId, sections) {
  if (typeof overId === 'string' && overId.startsWith(COLUMN_PREFIX)) {
    return findColumnById(sections, overId.slice(COLUMN_PREFIX.length))
  }
  return findWidgetLocation(sections, overId)
}

function AppInner() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  usePreviewSync(state)
  const [deployOpen, setDeployOpen] = useState(false)
  const [activeDragData, setActiveDragData] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const activePage = findPage(state.pages, state.activePageId)

  function handleDragStart({ active }) {
    setActiveDragData(active.data.current)
  }

  function handleDragEnd({ active, over }) {
    setActiveDragData(null)
    if (!over) return
    const type = active.data.current?.type

    if (type === 'catalog-block') {
      const target = resolveColumnTarget(over.id, activePage.sections)
      if (!target) return
      dispatch({
        type: ACTIONS.ADD_WIDGET,
        payload: { blockId: active.data.current.blockId, sectionId: target.sectionId, columnId: target.columnId },
      })
    } else if (type === 'canvas-block' && active.id !== over.id) {
      const activeLocation = findWidgetLocation(activePage.sections, active.id)
      const target = resolveColumnTarget(over.id, activePage.sections)
      if (!activeLocation || !target) return
      if (activeLocation.sectionId !== target.sectionId || activeLocation.columnId !== target.columnId) return
      dispatch({
        type: ACTIONS.REORDER_WIDGETS,
        payload: { activeId: active.id, overId: over.id, sectionId: activeLocation.sectionId, columnId: activeLocation.columnId },
      })
    }
  }

  const overlayBlock = activeDragData?.type === 'catalog-block'
    ? blockById[activeDragData.blockId]
    : null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Navbar onDeployClick={() => setDeployOpen(true)} />
      <WorkspaceShell
        left={<LeftSidebar />}
        center={<CanvasDropZone />}
        right={<PropertiesPanel />}
      />
      <DragOverlay>
        {overlayBlock && (
          <div className="bg-white border-2 border-blue rounded-lg p-4 w-64 shadow-xl">
            <CanvasBlockPreview block={overlayBlock} />
          </div>
        )}
      </DragOverlay>
      {deployOpen && <DeployModal onClose={() => setDeployOpen(false)} />}
    </DndContext>
  )
}

export default function App() {
  return IS_PREVIEW ? <PreviewApp /> : <AppInner />
}
```

- [ ] **Step 2: Start the dev server and test manually**

```
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) — editor works as before.

Open [http://localhost:5173/?mode=preview](http://localhost:5173/?mode=preview) in a second tab — should show: "Apri ShareFlow nell'editor per vedere la preview."

Now go back to the editor tab and wait ~1 second, then hard-refresh the preview tab — it should now render the intranet page (nav + hero + any sections).

- [ ] **Step 3: Verify no build errors**

```
npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat: wire preview mode in App.jsx (IS_PREVIEW detection + usePreviewSync)"
```

---

## Task 9: `Navbar` — add "Preview" button

**Files:**
- Modify: `client/src/components/layout/Navbar.jsx`

**Context:** The "Preview" button opens `/?mode=preview` in a window named `'shareflow-preview'`. Using a named window means clicking the button a second time focuses the already-open preview tab instead of opening a new one. The button is styled as a secondary outline button (different from the primary "Deploy to SharePoint" CTA).

- [ ] **Step 1: Add the Preview button**

Replace the entire content of `client/src/components/layout/Navbar.jsx` with:

```jsx
import { Layers, Eye } from 'lucide-react'
import { isMsalConfigured } from '../../auth/msalInstance.js'
import AuthSection from './AuthSection.jsx'

function openPreview() {
  window.open('/?mode=preview', 'shareflow-preview')
}

export default function Navbar({ onDeployClick }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-navy flex items-center justify-between px-6 border-b border-slate">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-electric">
          <Layers size={18} className="text-navy" />
        </div>
        <div>
          <span className="text-white font-semibold text-sm tracking-wide">ShareFlow</span>
          <span className="text-slate-light text-xs ml-2 hidden md:inline">
            The No-Code SharePoint Intranet Factory
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isMsalConfigured ? <AuthSection /> : (
          <span className="text-xs text-slate-light bg-slate px-3 py-1 rounded-full border border-slate-mid">
            Tenant: Contoso Corp
          </span>
        )}
        <button
          onClick={openPreview}
          className="flex items-center gap-2 text-slate-light hover:text-white border border-slate-mid hover:border-slate text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          <Eye size={14} />
          Preview
        </button>
        <button
          onClick={onDeployClick}
          className="flex items-center gap-2 bg-blue-electric hover:bg-blue text-navy font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Deploy to SharePoint
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Test the full flow manually**

Start `npm run dev`. In the editor:
1. Confirm "Preview" button appears between the tenant badge and "Deploy to SharePoint"
2. Click "Preview" → a new tab opens at `/?mode=preview`
3. The preview tab should render: LIVE badge in toolbar, the intranet nav, hero banner, and any sections/blocks
4. In the editor, add a "News - Corporate" block → after ~300ms the preview tab should update to show it
5. Click Desktop / Tablet / Mobile in the preview toolbar → the content should narrow/widen
6. Clicking "Preview" again in the editor focuses the existing preview tab, not a new one

- [ ] **Step 3: Verify no build errors**

```
npm run build
```
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/layout/Navbar.jsx
git commit -m "feat: add Preview button to Navbar (opens named preview tab)"
```

---

## Task 10: Playwright tests

**Files:**
- Modify: `client/tests/smoke.spec.js`

**Context:** Four new tests are added. Tests run from `shareflow-app/client/` with `npm run test:e2e`. The existing `test.describe` block stays unchanged; append the new tests inside it. All tests use the base URL `http://localhost:5173/`.

The preview tab test uses `context.waitForEvent('page')` to capture the new window opened by `window.open()`. Before clicking Preview, we wait for `usePreviewSync` to write state to localStorage with `page.waitForFunction`.

- [ ] **Step 1: Add 4 new tests to `smoke.spec.js`**

Append the following 4 tests inside the existing `test.describe('ShareFlow configurator smoke test', ...)` block, after the last existing test:

```js
  test('Preview button is visible in the navbar', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Preview', exact: true })).toBeVisible()
  })

  test('Preview tab opens and shows page without edit chrome', async ({ page, context }) => {
    // Wait for usePreviewSync to write initial state to localStorage (debounced 300ms)
    await page.waitForFunction(() => !!localStorage.getItem('shareflow-preview'))

    const [previewPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'Preview', exact: true }).click(),
    ])
    await previewPage.waitForLoadState('domcontentloaded')

    // Preview toolbar with LIVE badge is visible
    await expect(previewPage.getByText('LIVE', { exact: true })).toBeVisible()
    // The intranet site name from initialState is visible (hero/nav)
    await expect(previewPage.getByText('My Corporate Intranet')).toBeVisible()
    // No editing chrome: no "Aggiungi sezione" button, no Deploy button
    await expect(previewPage.getByRole('button', { name: 'Aggiungi sezione' })).not.toBeVisible()
    await expect(previewPage.getByRole('button', { name: 'Deploy to SharePoint' })).not.toBeVisible()
  })

  test('Preview tab shows block content added in the editor', async ({ page, context }) => {
    // Add a block in the editor
    await page.getByText('News - Corporate', { exact: true }).click()

    // Wait for usePreviewSync to write the updated state
    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(localStorage.getItem('shareflow-preview') || 'null')
        return s?.pages?.some(p => p.sections?.some(sec => sec.columns?.some(col => col.widgets?.length > 0)))
      } catch { return false }
    })

    const [previewPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'Preview', exact: true }).click(),
    ])
    await previewPage.waitForLoadState('domcontentloaded')

    // The block type label from CanvasBlockPreview should be visible
    await expect(previewPage.getByText('News Corporate', { exact: false })).toBeVisible()
  })

  test('device switcher in preview toolbar updates the data-device attribute', async ({ page, context }) => {
    await page.waitForFunction(() => !!localStorage.getItem('shareflow-preview'))

    const [previewPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'Preview', exact: true }).click(),
    ])
    await previewPage.waitForLoadState('domcontentloaded')

    // Default is desktop
    await expect(previewPage.locator('[data-device="desktop"]')).toBeVisible()

    // Switch to mobile
    await previewPage.getByRole('button', { name: 'Mobile', exact: true }).click()
    await expect(previewPage.locator('[data-device="mobile"]')).toBeVisible()
    await expect(previewPage.locator('[data-device="desktop"]')).not.toBeVisible()

    // Switch to tablet
    await previewPage.getByRole('button', { name: 'Tablet', exact: true }).click()
    await expect(previewPage.locator('[data-device="tablet"]')).toBeVisible()
  })
```

- [ ] **Step 2: Run the test suite**

Run from `shareflow-app/client/`:
```
npm run test:e2e
```
Expected: all tests pass (15 existing + 4 new = 19 total).

If any new test fails, read the error and fix the implementation before proceeding.

- [ ] **Step 3: Commit**

```bash
git add client/tests/smoke.spec.js
git commit -m "test: add 4 e2e tests for preview mode (tab, content, device switcher)"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Section 1 (Navbar button + named window) → Task 9
- ✅ Section 2 (usePreviewSync + usePreviewState) → Tasks 1, 2
- ✅ Section 3 (IS_PREVIEW detection in App.jsx) → Task 8
- ✅ Section 4 (PreviewApp: toolbar + device switcher + null state) → Tasks 6, 7
- ✅ Section 5 (PreviewProvider + readOnly canvas) → Tasks 3, 4, 5
- ✅ Section 6 (File map) → covered by all tasks above
- ✅ Section 7 (4 Playwright tests) → Task 10

**Type/API consistency:**
- `usePreviewSync(state)` takes the full `state` object — same shape as `usePreviewState()` returns ✅
- `PreviewProvider` passes `{ state, dispatch: noop }` — matches what `ConfiguratorContext.Provider` in `ConfiguratorContext.jsx` expects ✅
- `CanvasSection` receives `readOnly` → passes `readOnly` to `CanvasColumn` ✅
- `CanvasColumn` in readOnly reads `blockById[widget.blockId]` and `widget.props.contentItems ?? []` — same signature as `CanvasBlockPreview(block, width, contentItems)` ✅
- `PreviewApp` uses `resolveTheme` from `themeTemplates.js` (already used by `useTheme.js`) ✅
- `data-device` attribute added to container in `PreviewApp` — matched by `locator('[data-device="mobile"]')` in tests ✅
