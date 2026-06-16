# Theme/Template Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a curated gallery of 4 visual templates (Corporate Classic, Modern Light, Dark Glass, Vibrant Color) that re-skin the "site preview" portion of ShareFlow's configurator (nav, hero banner, widget cards), with an optional brand accent color override.

**Architecture:** A static catalog (`themeTemplates.js`) maps each template to Tailwind class tokens for nav/hero/card. A `useTheme()` hook resolves the active template + accent color from `tenantConfiguration.theme` (stored via the existing `SET_TENANT_META` action). The accent color is exposed as a CSS custom property `--theme-accent` on the canvas wrapper; template tokens reference it via Tailwind arbitrary-value classes. A new "Aspetto" sidebar tab lets the user pick a template and override the accent color.

**Tech Stack:** React 19, Tailwind CSS 3 (JIT, arbitrary values), Vite, Playwright (e2e smoke tests — no unit test runner is configured).

**Spec:** `docs/superpowers/specs/2026-06-15-theme-template-gallery-design.md`

**Working directory for all commands below:** `shareflow-app/client/`

---

### Task 1: Add `theme` field to tenant configuration state

**Files:**
- Modify: `client/src/context/configuratorReducer.js:66-71`

- [ ] **Step 1: Add the `theme` field to `initialState.tenantConfiguration`**

Open `client/src/context/configuratorReducer.js`. Find the `tenantConfiguration` object inside `initialState` (lines 66-71):

```js
  tenantConfiguration: {
    tenantId: null,
    siteName: 'My Corporate Intranet',
    siteUrl: '',
    widgets: [],
  },
```

Replace it with:

```js
  tenantConfiguration: {
    tenantId: null,
    siteName: 'My Corporate Intranet',
    siteUrl: '',
    widgets: [],
    theme: { templateId: 'corporate-classic', accentColor: null },
  },
```

No new action is needed — the existing `SET_TENANT_META` action (around line 294) already does
`tenantConfiguration: { ...state.tenantConfiguration, ...action.payload }`, a shallow merge that
will be used later to update `theme`.

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/context/configuratorReducer.js
git commit -m "Add theme field to tenant configuration state"
```

---

### Task 2: Theme template catalog

**Files:**
- Create: `client/src/data/themeTemplates.js`

- [ ] **Step 1: Create the catalog file**

Create `client/src/data/themeTemplates.js`:

```js
/**
 * Catalog of visual templates for the "Aspetto" appearance gallery.
 * Each template controls nav, hero banner, and widget-card styling via
 * Tailwind class strings. `accentColor` is the default value of the
 * `--theme-accent` CSS variable, overridable per tenant.
 */
export const THEME_TEMPLATES = [
  {
    id: 'corporate-classic',
    name: 'Corporate Classic',
    accentColor: '#0078D4',
    swatch: { nav: '#0F1C2E', hero: '#1A2F4A', card: '#FFFFFF' },
    nav: {
      wrapper: 'bg-navy rounded-xl px-2',
      tabActive: 'text-white border-[var(--theme-accent)]',
      tabInactive: 'text-slate-light border-transparent hover:text-white',
      megaMenu: 'bg-navy',
      megaMenuBorder: 'border-white/10',
      megaMenuActive: 'text-[var(--theme-accent)]',
      megaMenuInactive: 'text-slate-light hover:text-white',
    },
    hero: {
      wrapper: 'bg-gradient-to-br from-navy to-navy-light',
      eyebrow: 'text-slate-light',
      title: 'text-white',
    },
    card: {
      wrapper: 'bg-white border border-gray-200 shadow-sm rounded-lg',
      text: 'text-navy',
      textMuted: 'text-gray-400',
      accentText: 'text-[var(--theme-accent)]',
      iconBg: 'bg-[var(--theme-accent)]',
      skeleton: 'bg-gray-200',
      skeletonLight: 'bg-gray-100',
      chip: 'bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20',
    },
  },
  {
    id: 'modern-light',
    name: 'Modern Light',
    accentColor: '#14B8A6',
    swatch: { nav: '#FFFFFF', hero: '#EAF4FF', card: '#FFFFFF' },
    nav: {
      wrapper: 'bg-white shadow-sm rounded-xl px-2',
      tabActive: 'text-navy border-[var(--theme-accent)]',
      tabInactive: 'text-slate-400 border-transparent hover:text-navy',
      megaMenu: 'bg-white',
      megaMenuBorder: 'border-slate-200',
      megaMenuActive: 'text-[var(--theme-accent)]',
      megaMenuInactive: 'text-slate-400 hover:text-navy',
    },
    hero: {
      wrapper: 'bg-gradient-to-br from-[#EAF4FF] to-[#FDF2F8]',
      eyebrow: 'text-slate-500',
      title: 'text-navy',
    },
    card: {
      wrapper: 'bg-white rounded-xl shadow-md border-0',
      text: 'text-navy',
      textMuted: 'text-slate-400',
      accentText: 'text-[var(--theme-accent)]',
      iconBg: 'bg-[var(--theme-accent)] rounded-full',
      skeleton: 'bg-slate-200',
      skeletonLight: 'bg-slate-100',
      chip: 'bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20',
    },
  },
  {
    id: 'dark-glass',
    name: 'Dark Glass',
    accentColor: '#00B4FF',
    swatch: { nav: '#0F1C2E', hero: '#241B4E', card: '#2D3E50' },
    nav: {
      wrapper: 'bg-navy/90 backdrop-blur border-b border-white/10 rounded-xl px-2',
      tabActive: 'text-white border-[var(--theme-accent)]',
      tabInactive: 'text-slate-light border-transparent hover:text-white',
      megaMenu: 'bg-navy/90',
      megaMenuBorder: 'border-white/10',
      megaMenuActive: 'text-[var(--theme-accent)]',
      megaMenuInactive: 'text-slate-light hover:text-white',
    },
    hero: {
      wrapper: 'bg-gradient-to-br from-navy via-[#241B4E] to-navy-light',
      eyebrow: 'text-slate-light',
      title: 'text-white [text-shadow:0_0_12px_rgba(0,180,255,0.55)]',
    },
    card: {
      wrapper: 'bg-white/5 backdrop-blur border border-white/10 rounded-lg',
      text: 'text-white',
      textMuted: 'text-slate-light',
      accentText: 'text-[var(--theme-accent)]',
      iconBg: 'bg-[var(--theme-accent)]',
      skeleton: 'bg-white/20',
      skeletonLight: 'bg-white/10',
      chip: 'bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30',
    },
  },
  {
    id: 'vibrant-color',
    name: 'Vibrant Color',
    accentColor: '#E94F37',
    swatch: { nav: '#5B2A86', hero: '#E94F37', card: '#FFFFFF' },
    nav: {
      wrapper: 'bg-[#5B2A86] rounded-xl px-2',
      tabActive: 'text-white border-[var(--theme-accent)]',
      tabInactive: 'text-[#D8C2F0] border-transparent hover:text-white',
      megaMenu: 'bg-[#5B2A86]',
      megaMenuBorder: 'border-white/10',
      megaMenuActive: 'text-[var(--theme-accent)]',
      megaMenuInactive: 'text-[#D8C2F0] hover:text-white',
    },
    hero: {
      wrapper: 'bg-gradient-to-br from-[#5B2A86] to-[#E94F37]',
      eyebrow: 'text-[#F0DCEB]',
      title: 'text-white',
    },
    card: {
      wrapper: 'bg-white rounded-lg shadow-sm border-0',
      text: 'text-navy',
      textMuted: 'text-gray-400',
      accentText: 'text-[var(--theme-accent)]',
      iconBg: 'bg-[var(--theme-accent)]',
      skeleton: 'bg-[#F1E4DC]',
      skeletonLight: 'bg-[#FBF0EA]',
      chip: 'bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20',
    },
  },
]

/**
 * Resolves the effective template + accent color for the given
 * `tenantConfiguration.theme` state (which may be partial or undefined).
 */
export function resolveTheme(themeState) {
  const template = THEME_TEMPLATES.find(t => t.id === themeState?.templateId) ?? THEME_TEMPLATES[0]
  const accentColor = themeState?.accentColor ?? template.accentColor
  return { template, accentColor }
}
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/themeTemplates.js
git commit -m "Add theme template catalog (Corporate Classic, Modern Light, Dark Glass, Vibrant Color)"
```

---

### Task 3: `useTheme` hook

**Files:**
- Create: `client/src/hooks/useTheme.js`

- [ ] **Step 1: Create the hook**

Create `client/src/hooks/useTheme.js`:

```js
import { useConfigurator } from './useConfigurator.js'
import { resolveTheme } from '../data/themeTemplates.js'

/** Returns the active { template, accentColor } based on tenantConfiguration.theme. */
export function useTheme() {
  const { state } = useConfigurator()
  return resolveTheme(state.tenantConfiguration.theme)
}
```

- [ ] **Step 2: Verify lint passes**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTheme.js
git commit -m "Add useTheme hook to resolve active template and accent color"
```

---

### Task 4: Hero banner + canvas accent-color wiring

**Files:**
- Create: `client/src/components/canvas/HeroBanner.jsx`
- Modify: `client/src/components/canvas/CanvasDropZone.jsx`

- [ ] **Step 1: Create `HeroBanner.jsx`**

Create `client/src/components/canvas/HeroBanner.jsx`:

```jsx
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { findPage } from '../../context/pageHelpers.js'

export default function HeroBanner() {
  const { state } = useConfigurator()
  const { template } = useTheme()
  const activePage = findPage(state.pages, state.activePageId)

  return (
    <div className={`mb-4 rounded-2xl px-5 py-6 ${template.hero.wrapper}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-widest ${template.hero.eyebrow}`}>
        {state.tenantConfiguration.siteName}
      </div>
      <div className={`text-xl font-bold mt-1 ${template.hero.title}`}>
        {activePage.title}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire `HeroBanner` and `--theme-accent` into `CanvasDropZone.jsx`**

Open `client/src/components/canvas/CanvasDropZone.jsx`. Current content:

```jsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { findPage } from '../../context/pageHelpers.js'
import CanvasSection from './CanvasSection.jsx'
import SectionLayoutPicker from './SectionLayoutPicker.jsx'
import CanvasTopNav from './CanvasTopNav.jsx'

export default function CanvasDropZone() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const [addPickerOpen, setAddPickerOpen] = useState(false)
  const activePage = findPage(state.pages, state.activePageId)

  return (
    <div className="min-h-full p-6">
      <div className="max-w-2xl mx-auto">
        <CanvasTopNav />

        <div className="mb-4">
          <h2 className="text-navy font-semibold text-sm uppercase tracking-widest">Canvas Preview</h2>
          <p className="text-slate text-xs mt-0.5">SharePoint Communication Site — {activePage.title}</p>
        </div>
```

Replace the imports and the opening of the returned JSX with:

```jsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { findPage } from '../../context/pageHelpers.js'
import CanvasSection from './CanvasSection.jsx'
import SectionLayoutPicker from './SectionLayoutPicker.jsx'
import CanvasTopNav from './CanvasTopNav.jsx'
import HeroBanner from './HeroBanner.jsx'

export default function CanvasDropZone() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { accentColor } = useTheme()
  const [addPickerOpen, setAddPickerOpen] = useState(false)
  const activePage = findPage(state.pages, state.activePageId)

  return (
    <div className="min-h-full p-6">
      <div className="max-w-2xl mx-auto" style={{ '--theme-accent': accentColor }}>
        <CanvasTopNav />
        <HeroBanner />

        <div className="mb-4">
          <h2 className="text-navy font-semibold text-sm uppercase tracking-widest">Canvas Preview</h2>
          <p className="text-slate text-xs mt-0.5">SharePoint Communication Site — {activePage.title}</p>
        </div>
```

The rest of the file (the dashed drop-zone container, sections, "Aggiungi sezione" button) is unchanged.

- [ ] **Step 3: Run the existing smoke tests**

Run: `npm run test:e2e`
Expected: `9 passed` (the hero banner and `--theme-accent` are additive — no existing assertions reference them).

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/HeroBanner.jsx src/components/canvas/CanvasDropZone.jsx
git commit -m "Add HeroBanner and set --theme-accent on the canvas wrapper"
```

---

### Task 5: Theme-aware top nav and mega-menu

**Files:**
- Modify: `client/src/components/canvas/CanvasTopNav.jsx`
- Modify: `client/src/components/canvas/MegaMenuPanel.jsx`

- [ ] **Step 1: Update `CanvasTopNav.jsx`**

Replace the full content of `client/src/components/canvas/CanvasTopNav.jsx` with:

```jsx
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { buildPageTree } from '../../context/pageHelpers.js'
import MegaMenuPanel from './MegaMenuPanel.jsx'

function isInSubtree(node, pageId) {
  return node.pageId === pageId || node.children.some(child => isInSubtree(child, pageId))
}

export default function CanvasTopNav() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { template } = useTheme()
  const [closedRootId, setClosedRootId] = useState(null)
  const tree = buildPageTree(state.pages)
  const activeRoot = tree.find(root => isInSubtree(root, state.activePageId))
  if (!activeRoot) return null
  const openRoot = activeRoot && activeRoot.children.length > 0 && activeRoot.pageId !== closedRootId
    ? activeRoot
    : null

  function select(pageId) {
    dispatch({ type: ACTIONS.SELECT_PAGE, payload: { pageId } })
  }

  function handleRootClick(root) {
    if (root.pageId !== activeRoot.pageId) {
      select(root.pageId)
      if (closedRootId === root.pageId) setClosedRootId(null)
    } else if (state.activePageId !== root.pageId) {
      select(root.pageId)
    } else {
      setClosedRootId(prev => (prev === root.pageId ? null : root.pageId))
    }
  }

  return (
    <div className={`mb-4 ${template.nav.wrapper}`}>
      <nav className="flex gap-1 overflow-x-auto">
        {tree.map(page => (
          <button
            key={page.pageId}
            onClick={() => handleRootClick(page)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors
              ${activeRoot.pageId === page.pageId ? template.nav.tabActive : template.nav.tabInactive}`}
          >
            {page.title}
            {page.children.length > 0 && (
              openRoot?.pageId === page.pageId ? <ChevronUp size={12} /> : <ChevronDown size={12} />
            )}
          </button>
        ))}
      </nav>
      {openRoot && (
        <MegaMenuPanel node={openRoot} activePageId={state.activePageId} onSelect={select} template={template} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update `MegaMenuPanel.jsx`**

Replace the full content of `client/src/components/canvas/MegaMenuPanel.jsx` with:

```jsx
export default function MegaMenuPanel({ node, activePageId, onSelect, template }) {
  return (
    <div className={`px-3 py-3 ${template.nav.megaMenu}`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {node.children.map(child => (
          <MegaMenuColumn key={child.pageId} node={child} activePageId={activePageId} onSelect={onSelect} template={template} />
        ))}
      </div>
    </div>
  )
}

function MegaMenuColumn({ node, activePageId, onSelect, template }) {
  const isActive = node.pageId === activePageId
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => onSelect(node.pageId)}
        title={node.title}
        className={`block w-full truncate text-left text-xs font-semibold transition-colors
          ${isActive ? template.nav.megaMenuActive : template.nav.megaMenuInactive}`}
      >
        {node.title}
      </button>
      {node.children.length > 0 && (
        <ul className={`mt-1.5 space-y-1 border-l pl-2 ${template.nav.megaMenuBorder}`}>
          {node.children.map(grandchild => (
            <MegaMenuItem key={grandchild.pageId} node={grandchild} activePageId={activePageId} onSelect={onSelect} template={template} />
          ))}
        </ul>
      )}
    </div>
  )
}

function MegaMenuItem({ node, activePageId, onSelect, template }) {
  const isActive = node.pageId === activePageId
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={() => onSelect(node.pageId)}
        title={node.title}
        className={`block w-full truncate text-left text-xs transition-colors
          ${isActive ? `${template.nav.megaMenuActive} font-semibold` : template.nav.megaMenuInactive}`}
      >
        {node.title}
      </button>
      {node.children.length > 0 && (
        <ul className={`mt-1.5 space-y-1 border-l pl-2 ${template.nav.megaMenuBorder}`}>
          {node.children.map(greatGrandchild => (
            <MegaMenuItem key={greatGrandchild.pageId} node={greatGrandchild} activePageId={activePageId} onSelect={onSelect} template={template} />
          ))}
        </ul>
      )}
    </li>
  )
}
```

- [ ] **Step 3: Run the existing smoke tests**

Run: `npm run test:e2e`
Expected: `9 passed`. In particular, the "mega-menu shows a nested page and toggles open/closed" test must still pass — it relies only on text/role queries, not on the specific color classes.

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/CanvasTopNav.jsx src/components/canvas/MegaMenuPanel.jsx
git commit -m "Make CanvasTopNav and MegaMenuPanel theme-aware"
```

---

### Task 6: Theme-aware widget card wrapper

**Files:**
- Modify: `client/src/components/canvas/CanvasBlock.jsx`

- [ ] **Step 1: Add `useTheme` and update the card wrapper classes**

Open `client/src/components/canvas/CanvasBlock.jsx`. Add the import alongside the other hook imports (near the top):

```jsx
import { useTheme } from '../../hooks/useTheme.js'
```

Inside `CanvasBlock`, add the hook call next to the existing `useConfigurator()` call:

```jsx
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { template } = useTheme()
```

Find the card wrapper `className` (currently):

```jsx
      className={`
        group relative bg-white rounded-lg p-4 mb-3 border cursor-pointer transition-all shadow-sm
        ${isSelected ? 'border-blue ring-1 ring-blue/20 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}
      `}
```

Replace it with:

```jsx
      className={`
        group relative p-4 mb-3 cursor-pointer transition-all
        ${template.card.wrapper}
        ${isSelected ? 'ring-2 ring-blue' : 'hover:ring-1 hover:ring-[var(--theme-accent)]/30'}
      `}
```

`template.card.wrapper` supplies the background, border, shadow, and corner radius for every
template (including the default Corporate Classic, whose `bg-white border border-gray-200
shadow-sm rounded-lg` is equivalent to the previous hardcoded unselected styling). The selection
ring stays blue across all templates — it's an editor affordance, not part of the published site.

- [ ] **Step 2: Run the existing smoke tests**

Run: `npm run test:e2e`
Expected: `9 passed`. In particular "removing a block clears the canvas and properties panel"
selects the card via `div.group.bg-white` — this still matches because Corporate Classic
(the default template) keeps `bg-white` in `card.wrapper`.

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/CanvasBlock.jsx
git commit -m "Make CanvasBlock card wrapper theme-aware"
```

---

### Task 7: Theme-aware widget preview content

**Files:**
- Modify: `client/src/components/canvas/CanvasBlockPreview.jsx`

- [ ] **Step 1: Replace the full file content**

Replace the full content of `client/src/components/canvas/CanvasBlockPreview.jsx` with:

```jsx
import * as icons from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.js'

const EVENT_IDS = new Set([
  'eventi-corporate', 'eventi-country', 'eventi-sede', 'eventi-funzione',
])

const MEDIA_IDS = new Set([
  'sezione-fiere', 'sezione-mostre', 'multimedia-gallery',
])

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

const GRID_COLS_BY_WIDTH = { full: 'grid-cols-3', twoThirds: 'grid-cols-2', half: 'grid-cols-2', third: 'grid-cols-1' }
const ITEM_COUNT_BY_WIDTH = { full: 3, twoThirds: 2, half: 2, third: 1 }

function SkeletonLine({ template, w = 'w-full', h = 'h-2', light = false }) {
  return <div className={`${w} ${h} rounded ${light ? template.card.skeletonLight : template.card.skeleton}`} />
}

function Header({ template, block, Icon, showSeeAll = true }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={16} className={`${template.card.accentText} flex-shrink-0`} />
        <span className={`text-sm font-semibold truncate ${template.card.text}`}>{block.label}</span>
      </div>
      {showSeeAll && (
        <span className={`text-xs font-medium flex-shrink-0 ${template.card.accentText}`}>See all</span>
      )}
    </div>
  )
}

export default function CanvasBlockPreview({ block, width = 'full' }) {
  const { template } = useTheme()
  const Icon = icons[block.icon] ?? icons.Box
  const gridColsClass = GRID_COLS_BY_WIDTH[width] ?? GRID_COLS_BY_WIDTH.full
  const itemCount = ITEM_COUNT_BY_WIDTH[width] ?? ITEM_COUNT_BY_WIDTH.full

  if (block.id.startsWith('news')) {
    return (
      <div>
        <Header template={template} block={block} Icon={Icon} />
        <div className={`grid ${gridColsClass} gap-3`}>
          {Array.from({ length: itemCount }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className={`aspect-[16/10] rounded-md ${template.card.skeletonLight}`} />
              <SkeletonLine template={template} h="h-2.5" />
              <SkeletonLine template={template} w="w-2/3" light />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (EVENT_IDS.has(block.id)) {
    const today = new Date()
    return (
      <div>
        <Header template={template} block={block} Icon={Icon} />
        <div className="space-y-3">
          {[3, 9].map((offset, i) => {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`flex flex-col items-center justify-center w-11 h-11 rounded-md flex-shrink-0 ${template.card.chip}`}>
                  <span className={`text-[10px] font-semibold uppercase leading-none ${template.card.accentText}`}>
                    {MONTHS[d.getMonth()]}
                  </span>
                  <span className={`text-sm font-bold leading-none mt-0.5 ${template.card.text}`}>{d.getDate()}</span>
                </div>
                <div className="flex-1 space-y-1.5">
                  <SkeletonLine template={template} w="w-3/4" h="h-2.5" />
                  <SkeletonLine template={template} w="w-1/2" light />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (MEDIA_IDS.has(block.id)) {
    return (
      <div>
        <Header template={template} block={block} Icon={Icon} />
        <div className={`grid ${gridColsClass} gap-2`}>
          {Array.from({ length: itemCount }).map((_, i) => (
            <div key={i} className={`aspect-square rounded-md ${template.card.skeletonLight}`} />
          ))}
        </div>
      </div>
    )
  }

  if (block.id === 'countdown-lancio') {
    return (
      <div>
        <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
        <div className="flex justify-center gap-2">
          {['12', '08', '45', '30'].map((n, i) => (
            <div key={i} className={`flex items-center justify-center w-12 h-12 rounded-md ${template.card.iconBg}`}>
              <span className="text-base font-bold text-white">{n}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <icons.ChevronRight size={12} className={`${template.card.textMuted} flex-shrink-0`} />
          <SkeletonLine template={template} w="w-5/6" />
        </div>
        <div className="flex items-center gap-2">
          <icons.ChevronRight size={12} className={`${template.card.textMuted} flex-shrink-0`} />
          <SkeletonLine template={template} w="w-2/3" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run the existing smoke tests**

Run: `npm run test:e2e`
Expected: `9 passed`.

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/CanvasBlockPreview.jsx
git commit -m "Make CanvasBlockPreview theme-aware"
```

---

### Task 8: "Aspetto" appearance panel

**Files:**
- Create: `client/src/components/sidebar-left/AppearancePanel.jsx`
- Modify: `client/src/components/sidebar-left/LeftSidebar.jsx`

- [ ] **Step 1: Create `AppearancePanel.jsx`**

Create `client/src/components/sidebar-left/AppearancePanel.jsx`:

```jsx
import { Check } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { THEME_TEMPLATES } from '../../data/themeTemplates.js'

export default function AppearancePanel() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { template, accentColor } = useTheme()
  const theme = state.tenantConfiguration.theme

  function selectTemplate(templateId) {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, templateId } } })
  }

  function setAccentColor(value) {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, accentColor: value } } })
  }

  function resetAccentColor() {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, accentColor: null } } })
  }

  return (
    <div className="p-3 space-y-4 overflow-y-auto h-full">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">Template</h3>
        <div className="space-y-2">
          {THEME_TEMPLATES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTemplate(t.id)}
              className={`w-full text-left rounded-lg border p-2 transition-colors
                ${t.id === template.id ? 'border-blue-electric ring-1 ring-blue-electric/30' : 'border-slate-mid hover:border-slate-light'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white">{t.name}</span>
                {t.id === template.id && <Check size={14} className="text-blue-electric" />}
              </div>
              <div className="flex gap-1">
                <span className="block w-5 h-5 rounded" style={{ background: t.swatch.nav }} />
                <span className="block w-5 h-5 rounded" style={{ background: t.swatch.hero }} />
                <span className="block w-5 h-5 rounded" style={{ background: t.accentColor }} />
                <span className="block w-5 h-5 rounded border border-slate-mid" style={{ background: t.swatch.card }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">Colore brand</h3>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={accentColor}
            onChange={e => setAccentColor(e.target.value)}
            className="w-8 h-8 rounded border border-slate-mid bg-transparent cursor-pointer"
          />
          <span className="text-xs text-slate-light flex-1">{accentColor}</span>
          {theme.accentColor && (
            <button type="button" onClick={resetAccentColor} className="text-xs text-blue-electric hover:underline">
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add the "Aspetto" tab to `LeftSidebar.jsx`**

Open `client/src/components/sidebar-left/LeftSidebar.jsx`. Current content:

```jsx
import { useState } from 'react'
import BlockLibrary from './BlockLibrary.jsx'
import PagesPanel from './PagesPanel.jsx'

const TABS = [
  { id: 'blocks', label: 'Blocchi' },
  { id: 'pages', label: 'Pagine' },
]

export default function LeftSidebar() {
  const [tab, setTab] = useState('blocks')

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-mid flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2
              ${tab === t.id ? 'text-blue-electric border-blue-electric' : 'text-slate-light border-transparent hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'blocks' ? <BlockLibrary /> : <PagesPanel />}
      </div>
    </div>
  )
}
```

Replace it with:

```jsx
import { useState } from 'react'
import BlockLibrary from './BlockLibrary.jsx'
import PagesPanel from './PagesPanel.jsx'
import AppearancePanel from './AppearancePanel.jsx'

const TABS = [
  { id: 'blocks', label: 'Blocchi' },
  { id: 'pages', label: 'Pagine' },
  { id: 'appearance', label: 'Aspetto' },
]

export default function LeftSidebar() {
  const [tab, setTab] = useState('blocks')

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-mid flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2
              ${tab === t.id ? 'text-blue-electric border-blue-electric' : 'text-slate-light border-transparent hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'blocks' && <BlockLibrary />}
        {tab === 'pages' && <PagesPanel />}
        {tab === 'appearance' && <AppearancePanel />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run the existing smoke tests**

Run: `npm run test:e2e`
Expected: `9 passed`.

- [ ] **Step 4: Commit**

```bash
git add src/components/sidebar-left/AppearancePanel.jsx src/components/sidebar-left/LeftSidebar.jsx
git commit -m "Add Aspetto tab with template gallery and accent color picker"
```

---

### Task 9: Smoke tests for the theme gallery

**Files:**
- Modify: `client/tests/smoke.spec.js`

- [ ] **Step 1: Add a test for the template gallery**

Open `client/tests/smoke.spec.js`. Add the following test inside the `test.describe(...)` block,
after the "mega-menu shows a nested page and toggles open/closed" test (after line 101, before
the "deploy flow" test):

```js
  test('Aspetto tab shows the template gallery', async ({ page }) => {
    await page.getByRole('button', { name: 'Aspetto' }).click()
    await expect(page.getByRole('button', { name: /Corporate Classic/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Modern Light/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Dark Glass/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Vibrant Color/ })).toBeVisible()
  })

  test('selecting a template re-skins the hero banner and nav', async ({ page }) => {
    await expect(page.locator('main').getByText('My Corporate Intranet', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Aspetto' }).click()
    await page.getByRole('button', { name: /Modern Light/ }).click()

    await expect(page.locator('main nav').locator('..')).toHaveClass(/bg-white/)
    await expect(page.locator('main').getByText('My Corporate Intranet', { exact: true })).toBeVisible()
  })

  test('accent color picker updates --theme-accent on the canvas', async ({ page }) => {
    await page.getByRole('button', { name: 'Aspetto' }).click()
    await page.locator('input[type="color"]').fill('#ff0000')

    await expect(page.locator('[style*="--theme-accent"]')).toHaveAttribute('style', /--theme-accent:\s*#ff0000/)
  })
```

- [ ] **Step 2: Extend the deploy flow test with the theme field**

In the same file, find the "deploy flow completes end-to-end" test (around line 103-118):

```js
    const { tenantConfiguration } = request.postDataJSON()
    expect(tenantConfiguration.navigation).toEqual([
      { pageId: 'page-home', title: 'Home', slug: 'home', children: [] },
    ])
```

Add a line right after the `navigation` assertion:

```js
    const { tenantConfiguration } = request.postDataJSON()
    expect(tenantConfiguration.navigation).toEqual([
      { pageId: 'page-home', title: 'Home', slug: 'home', children: [] },
    ])
    expect(tenantConfiguration.theme).toEqual({ templateId: 'corporate-classic', accentColor: null })
```

- [ ] **Step 3: Run the full smoke suite**

Run: `npm run test:e2e`
Expected: `12 passed` (9 existing + 3 new tests; the deploy test still counts as 1).

- [ ] **Step 4: Commit**

```bash
git add tests/smoke.spec.js
git commit -m "Add smoke tests for the theme template gallery"
```

---

## Self-Review Notes

- **Spec coverage:** Architecture/boundary (Tasks 4-7), theme mechanism/`--theme-accent` (Task 4),
  template catalog with all 4 templates and full token sets (Task 2), all new/modified components
  from the spec (Tasks 3-8), state/export via existing `SET_TENANT_META` (Task 1, confirmed no
  `buildTenantExport` change needed), and the full test plan (Task 9) are all covered.
- **Placeholder scan:** No TBD/TODO markers; every step has complete code.
- **Type/shape consistency:** `resolveTheme` returns `{ template, accentColor }` (Task 2),
  consumed identically by `useTheme()` (Task 3), `HeroBanner` (Task 4), `CanvasTopNav`/
  `MegaMenuPanel` (Task 5, via `template` prop), `CanvasBlock`/`CanvasBlockPreview` (Tasks 6-7),
  and `AppearancePanel` (Task 8). The `theme` shape `{ templateId, accentColor }` is consistent
  between `initialState` (Task 1), `resolveTheme` (Task 2), and the `SET_TENANT_META` payloads in
  `AppearancePanel` (Task 8).
