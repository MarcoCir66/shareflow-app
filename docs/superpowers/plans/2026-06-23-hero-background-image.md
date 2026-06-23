# Hero Background Image + Auto Accent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a tenant set an image URL in "Aspetto" that becomes the background of the Hero Banner and top nav bar, with the UI automatically picking a readable text color and a suggested accent color from that image via the Canvas API, while leaving every other surface untouched.

**Architecture:** A new optional `backgroundImageUrl` field on `tenantConfiguration.theme`, set through the existing `SET_TENANT_META` action. A pure, DOM-free color-math module (`imagePalette.js`) computes the accent color and text scheme from an average RGB; a new hook (`useBackgroundImageAnalysis.js`) does the DOM/Canvas work (loading the image, sampling pixels) and calls into the pure module. `useTheme.js` composes this hook with the existing `resolveTheme()` so `HeroBanner`, `CanvasTopNav`, and `AppearancePanel` all read one consistent set of derived values. Rendering changes are additive inline `style` overrides layered on top of existing template classes — never a replacement of them.

**Tech Stack:** React 19, Vite, Tailwind CSS, Vitest (unit), Playwright (e2e). No new dependencies.

## Global Constraints

- No new npm dependencies (no color-extraction library, no jsdom/testing-library). Image analysis uses only the built-in `Image`/`Canvas` browser APIs.
- The background image applies ONLY to `HeroBanner.jsx` and `CanvasTopNav.jsx`. Never to cards, `MegaMenuPanel.jsx`, or the page background.
- URL-only — no file upload, no new server route, no new server-side storage.
- No new entry in `THEME_TEMPLATES` (`client/src/data/themeTemplates.js`) — the image is an overlay on top of whichever of the 4 existing templates is active, not a 5th template.
- No loading spinner, no error UI for failed image analysis. Failure is silent: dark scrim overlay + light text scheme (`LIGHT_TEXT_SCHEME`), `accentColor: null`.
- Accent color precedence: manual `theme.accentColor` (if set) > image-extracted accent (if image set and analysis succeeded) > template default. Exactly mirrors the existing `accentColor: null` sentinel mechanism — no new sentinel values.
- Rendering changes are additive `style` props layered on top of existing Tailwind classes — the existing `template.hero.*` / `template.nav.*` className strings are never conditionally removed or replaced. Inline `style` wins over a class-based CSS property automatically, so this is sufficient to override the background/text color only when an image is active, with zero behavior change when it isn't.
- Do **not** add `backgroundImageUrl` to any default/initial state object (`client/src/context/configuratorReducer.js:88` defines `theme: { templateId: 'corporate-classic', accentColor: null }` — leave this line untouched). The field must stay absent until a tenant explicitly sets a value via `AppearancePanel`, otherwise the existing exact-equality assertion on `tenantConfiguration.theme` in the `'deploy flow completes end-to-end...'` Playwright test (`client/tests/smoke.spec.js:179`) breaks.
- New i18n keys go in all 4 locale files (`it.json`, `en.json`, `fr.json`, `de.json`) under the existing `appearance` block.

### Testing-approach note (deviation from the literal spec text)

The spec's Testing section calls for a Vitest unit test of `useBackgroundImageAnalysis` that mocks `Image`/canvas. This is not feasible without adding a new dependency: `client/vitest.config.js` has no `test.environment` set (Vitest defaults to `'node'`, which has no `document`, `Image`, or `HTMLCanvasElement`), and `client/package.json` has no `jsdom`, `happy-dom`, or `@testing-library/*` package. There is also no existing precedent in this codebase for unit-testing a React hook — every existing Vitest test is DOM-free pure-logic (reducers, schemas, utils); all rendering/DOM-dependent behavior is covered by Playwright instead.

This plan follows that established split instead of adding a new test dependency:
- The DOM-free pixel math (`computePaletteFromAverage`, `rgbToHex`) is extracted into its own pure module (`client/src/utils/imagePalette.js`) and unit-tested in Vitest's default `node` environment with plain numbers — covers the "dark image" and "light image" cases from the spec.
- `useBackgroundImageAnalysis.js` (the `Image`/canvas/async orchestration) and `useTheme.js` (hook composition) get no dedicated Vitest test. Their verification step is `npm run lint` (syntax/type correctness) — full behavioral coverage, including the error/fallback path's silent-failure behavior, comes from the Playwright e2e test in Task 7, which runs in a real browser with real `Image`/`Canvas`, no mocking required.
- The reducer test in Task 1 only ever loads through the existing generic-merge path — no new mocking infrastructure needed there either.

---

### Task 1: Reducer support for `backgroundImageUrl`

**Files:**
- Modify: `client/src/context/configuratorReducer.test.js` (add one test after the block at lines 195-200)

**Interfaces:**
- Consumes: existing `ACTIONS.SET_TENANT_META`, existing `configuratorReducer`, existing `makeState()` test helper.
- Produces: nothing new — this task only documents/locks in behavior that already works, since `SET_TENANT_META`'s generic merge (`tenantConfiguration: {...state.tenantConfiguration, ...action.payload}`) already supports any new key inside `theme` with zero reducer code changes.

- [ ] **Step 1: Write the test**

In `client/src/context/configuratorReducer.test.js`, immediately after the existing test ending at line 200 (`'SET_TENANT_META merges the payload into tenantConfiguration'`), add:

```js
test('SET_TENANT_META with a backgroundImageUrl payload updates tenantConfiguration.theme', () => {
  const state = makeState()
  const next = configuratorReducer(state, {
    type: ACTIONS.SET_TENANT_META,
    payload: { theme: { ...state.tenantConfiguration.theme, backgroundImageUrl: 'https://example.com/bg.jpg' } },
  })
  expect(next.tenantConfiguration.theme.backgroundImageUrl).toBe('https://example.com/bg.jpg')
  expect(next.tenantConfiguration.theme.templateId).toBe(state.tenantConfiguration.theme.templateId)
})
```

- [ ] **Step 2: Run the test to verify it passes immediately**

Run: `npm run test:unit -- configuratorReducer` (from `client/`)
Expected: PASS immediately — no production code change is needed, since `SET_TENANT_META`'s existing generic merge in `configuratorReducer.js` already supports arbitrary new keys inside `theme`. This test exists to document and lock in that behavior for this new field, not to drive new code.

- [ ] **Step 3: Commit**

```bash
git add client/src/context/configuratorReducer.test.js
git commit -m "test: lock in SET_TENANT_META support for theme.backgroundImageUrl"
```

---

### Task 2: Pure color-math module (`imagePalette.js`)

**Files:**
- Create: `client/src/utils/imagePalette.js`
- Test: `client/src/utils/imagePalette.test.js`

**Interfaces:**
- Produces (consumed by Task 3): `rgbToHex(r, g, b): string`, `computePaletteFromAverage(r, g, b): { accentColor: string, textScheme: { strong: string, muted: string } }`, `LIGHT_TEXT_SCHEME = { strong: '#FFFFFF', muted: 'rgba(255,255,255,0.72)' }`, `DARK_TEXT_SCHEME = { strong: '#0F1C2E', muted: 'rgba(15,28,46,0.65)' }`.

- [ ] **Step 1: Write the failing test**

Create `client/src/utils/imagePalette.test.js`:

```js
import { describe, test, expect } from 'vitest'
import { computePaletteFromAverage, rgbToHex, LIGHT_TEXT_SCHEME, DARK_TEXT_SCHEME } from './imagePalette.js'

describe('rgbToHex', () => {
  test('pads single-digit hex components with a leading zero', () => {
    expect(rgbToHex(0, 5, 255)).toBe('#0005ff')
  })
})

describe('computePaletteFromAverage', () => {
  test('returns the light text scheme and a matching hex accent for a dark average color', () => {
    const result = computePaletteFromAverage(20, 20, 30)
    expect(result.textScheme).toBe(LIGHT_TEXT_SCHEME)
    expect(result.accentColor).toBe('#14141e')
  })

  test('returns the dark text scheme and a matching hex accent for a light average color', () => {
    const result = computePaletteFromAverage(230, 230, 230)
    expect(result.textScheme).toBe(DARK_TEXT_SCHEME)
    expect(result.accentColor).toBe('#e6e6e6')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- imagePalette` (from `client/`)
Expected: FAIL with a module-resolution error (`Failed to resolve import "./imagePalette.js"` or similar) — the file doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `client/src/utils/imagePalette.js`:

```js
export const LIGHT_TEXT_SCHEME = { strong: '#FFFFFF', muted: 'rgba(255,255,255,0.72)' }
export const DARK_TEXT_SCHEME = { strong: '#0F1C2E', muted: 'rgba(15,28,46,0.65)' }
const LUMINANCE_THRESHOLD = 140 // 0-255 scale

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

/** Computes a suggested accent color and readable text scheme from an averaged RGB value. */
export function computePaletteFromAverage(r, g, b) {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return {
    accentColor: rgbToHex(r, g, b),
    textScheme: luminance < LUMINANCE_THRESHOLD ? LIGHT_TEXT_SCHEME : DARK_TEXT_SCHEME,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- imagePalette` (from `client/`)
Expected: PASS (3/3 tests)

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/imagePalette.js client/src/utils/imagePalette.test.js
git commit -m "feat: add pure color-math module for background image analysis"
```

---

### Task 3: `useBackgroundImageAnalysis` hook

**Files:**
- Create: `client/src/hooks/useBackgroundImageAnalysis.js`

**Interfaces:**
- Consumes: `computePaletteFromAverage`, `LIGHT_TEXT_SCHEME` from `../utils/imagePalette.js` (Task 2).
- Produces (consumed by Task 4): `useBackgroundImageAnalysis(url: string | null): { accentColor: string | null, textScheme: { strong: string, muted: string }, usedFallback: boolean }`.

No dedicated Vitest test for this file — see "Testing-approach note" in Global Constraints. Verification is `npm run lint` plus the Playwright e2e test in Task 7.

- [ ] **Step 1: Write the implementation**

Create `client/src/hooks/useBackgroundImageAnalysis.js`:

```js
import { useEffect, useState } from 'react'
import { computePaletteFromAverage, LIGHT_TEXT_SCHEME } from '../utils/imagePalette.js'

const FALLBACK_RESULT = { accentColor: null, textScheme: LIGHT_TEXT_SCHEME, usedFallback: true }

function analyzeImage(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 32
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        let r = 0, g = 0, b = 0
        const pixelCount = data.length / 4
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
        }
        r = Math.round(r / pixelCount)
        g = Math.round(g / pixelCount)
        b = Math.round(b / pixelCount)
        resolve({ ...computePaletteFromAverage(r, g, b), usedFallback: false })
      } catch {
        resolve(FALLBACK_RESULT)
      }
    }
    img.onerror = () => resolve(FALLBACK_RESULT)
    img.src = url
  })
}

/** Analyzes a background image URL for a suggested accent color and a readable text scheme. */
export function useBackgroundImageAnalysis(url) {
  const [result, setResult] = useState(FALLBACK_RESULT)

  useEffect(() => {
    if (!url) {
      setResult(FALLBACK_RESULT)
      return
    }
    let cancelled = false
    analyzeImage(url).then(r => {
      if (!cancelled) setResult(r)
    })
    return () => { cancelled = true }
  }, [url])

  return result
}
```

- [ ] **Step 2: Run lint to verify correctness**

Run: `npm run lint` (from `client/`)
Expected: no errors for the new file.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useBackgroundImageAnalysis.js
git commit -m "feat: add useBackgroundImageAnalysis hook for canvas-based image sampling"
```

---

### Task 4: `useTheme.js` composition

**Files:**
- Modify: `client/src/hooks/useTheme.js` (full rewrite, currently 8 lines)

**Interfaces:**
- Consumes: `useBackgroundImageAnalysis` (Task 3), existing `resolveTheme` from `../data/themeTemplates.js` (unchanged), existing `useConfigurator`.
- Produces (consumed by Tasks 5 and 6): `useTheme(): { template, accentColor, backgroundImageUrl: string | null, textScheme: { strong, muted } | null, showFallbackScrim: boolean }`.

No dedicated Vitest test — see "Testing-approach note" in Global Constraints. Verification is `npm run lint`.

- [ ] **Step 1: Write the implementation**

Replace the full contents of `client/src/hooks/useTheme.js`:

```js
import { useConfigurator } from './useConfigurator.js'
import { resolveTheme } from '../data/themeTemplates.js'
import { useBackgroundImageAnalysis } from './useBackgroundImageAnalysis.js'

/** Returns the active { template, accentColor, backgroundImageUrl, textScheme, showFallbackScrim } based on tenantConfiguration.theme. */
export function useTheme() {
  const { state } = useConfigurator()
  const themeState = state.tenantConfiguration.theme
  const { template, accentColor: baseAccentColor } = resolveTheme(themeState)
  const backgroundImageUrl = themeState?.backgroundImageUrl || null
  const { accentColor: extractedAccentColor, textScheme, usedFallback } = useBackgroundImageAnalysis(backgroundImageUrl)

  const accentColor = themeState?.accentColor || extractedAccentColor || baseAccentColor

  return {
    template,
    accentColor,
    backgroundImageUrl,
    textScheme: backgroundImageUrl ? textScheme : null,
    showFallbackScrim: Boolean(backgroundImageUrl) && usedFallback,
  }
}
```

`resolveTheme()` itself is unchanged — it stays pure and synchronous. All new async/canvas logic lives in `useBackgroundImageAnalysis`, composed here.

- [ ] **Step 2: Run lint to verify correctness**

Run: `npm run lint` (from `client/`)
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useTheme.js
git commit -m "feat: compose useBackgroundImageAnalysis into useTheme"
```

---

### Task 5: `AppearancePanel.jsx` UI + i18n keys

**Files:**
- Modify: `client/src/components/sidebar-left/AppearancePanel.jsx`
- Modify: `client/src/locales/it.json`, `client/src/locales/en.json`, `client/src/locales/fr.json`, `client/src/locales/de.json`

**Interfaces:**
- Consumes: existing `theme` object (`state.tenantConfiguration.theme`), existing `ACTIONS.SET_TENANT_META`, new i18n keys defined in this task.
- Produces: nothing consumed by later tasks (UI leaf).

No dedicated Vitest test — UI-only change, covered by the Playwright e2e test in Task 7. Verification is `npm run lint`.

- [ ] **Step 1: Add the new i18n keys to all 4 locale files**

In `client/src/locales/it.json`, inside the `appearance` block (currently lines 17-22), add 3 keys after `"reset"`:

```json
  "appearance": {
    "siteNameLabel": "Nome sito ({{lang}})",
    "template": "Modello",
    "brandColor": "Colore brand",
    "reset": "Ripristina",
    "backgroundImageLabel": "Immagine di sfondo",
    "backgroundImageHint": "URL di un'immagine da usare come sfondo dell'hero banner e della barra di navigazione",
    "backgroundImageRemove": "Rimuovi immagine"
  },
```

In `client/src/locales/en.json`, same block:

```json
  "appearance": {
    "siteNameLabel": "Site name ({{lang}})",
    "template": "Template",
    "brandColor": "Brand color",
    "reset": "Reset",
    "backgroundImageLabel": "Background image",
    "backgroundImageHint": "URL of an image to use as the background of the hero banner and top navigation",
    "backgroundImageRemove": "Remove image"
  },
```

In `client/src/locales/fr.json`, same block:

```json
  "appearance": {
    "siteNameLabel": "Nom du site ({{lang}})",
    "template": "Modèle",
    "brandColor": "Couleur de marque",
    "reset": "Réinitialiser",
    "backgroundImageLabel": "Image de fond",
    "backgroundImageHint": "URL d'une image à utiliser comme fond de la bannière d'accueil et de la barre de navigation",
    "backgroundImageRemove": "Supprimer l'image"
  },
```

In `client/src/locales/de.json`, same block:

```json
  "appearance": {
    "siteNameLabel": "Websitename ({{lang}})",
    "template": "Vorlage",
    "brandColor": "Markenfarbe",
    "reset": "Zurücksetzen",
    "backgroundImageLabel": "Hintergrundbild",
    "backgroundImageHint": "URL eines Bildes, das als Hintergrund für das Hero-Banner und die Navigationsleiste verwendet wird",
    "backgroundImageRemove": "Bild entfernen"
  },
```

- [ ] **Step 2: Add the handlers and new UI section in `AppearancePanel.jsx`**

In `client/src/components/sidebar-left/AppearancePanel.jsx`, add two new handler functions after the existing `resetAccentColor` function (after line 26):

```js
  function handleBackgroundImageUrlChange(value) {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, backgroundImageUrl: value } } })
  }

  function removeBackgroundImage() {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, backgroundImageUrl: '' } } })
  }
```

Then insert a new section between the template gallery `</div>` (line 76) and the brand-color `<div>` (line 78):

```jsx
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">
          {t('appearance.backgroundImageLabel')}
        </h3>
        <input
          type="text"
          value={theme?.backgroundImageUrl || ''}
          onChange={e => handleBackgroundImageUrlChange(e.target.value)}
          placeholder={t('appearance.backgroundImageHint')}
          className="w-full bg-slate-mid text-white text-xs px-2.5 py-1.5 rounded border border-slate-mid focus:border-blue-electric focus:outline-none"
        />
        {theme?.backgroundImageUrl && (
          <button type="button" onClick={removeBackgroundImage} className="mt-1 text-xs text-blue-electric hover:underline">
            {t('appearance.backgroundImageRemove')}
          </button>
        )}
      </div>

```

- [ ] **Step 3: Run lint to verify correctness**

Run: `npm run lint` (from `client/`)
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/sidebar-left/AppearancePanel.jsx client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json
git commit -m "feat: add background image URL input to AppearancePanel"
```

---

### Task 6: Rendering changes — `HeroBanner.jsx` + `CanvasTopNav.jsx`

**Files:**
- Modify: `client/src/components/canvas/HeroBanner.jsx` (full rewrite, currently 25 lines)
- Modify: `client/src/components/canvas/CanvasTopNav.jsx` (full rewrite, currently 64 lines)

**Interfaces:**
- Consumes: `backgroundImageUrl`, `textScheme`, `showFallbackScrim` from `useTheme()` (Task 4).
- Produces: nothing consumed by later tasks — these are the leaf rendering surfaces exercised by Task 7's e2e test.

No dedicated Vitest test — these are rendering components with no existing unit-test precedent in this codebase. Verification is `npm run lint` here; full behavioral coverage comes from the Playwright e2e test in Task 7.

- [ ] **Step 1: Rewrite `HeroBanner.jsx`**

Replace the full contents of `client/src/components/canvas/HeroBanner.jsx`:

```jsx
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { findPage } from '../../context/pageHelpers.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'

export default function HeroBanner() {
  const { state } = useConfigurator()
  const { template, backgroundImageUrl, textScheme, showFallbackScrim } = useTheme()
  const lang = useLang()
  const activePage = findPage(state.pages, state.activePageId)
  if (!activePage) return null

  const heroStyle = backgroundImageUrl
    ? {
        backgroundImage: showFallbackScrim
          ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${backgroundImageUrl})`
          : `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined

  return (
    <div className={`mb-4 rounded-2xl px-5 py-6 ${template.hero.wrapper}`} style={heroStyle}>
      <div
        className={`text-[10px] font-semibold uppercase tracking-widest ${template.hero.eyebrow}`}
        style={textScheme ? { color: textScheme.muted } : undefined}
      >
        {t2(state.tenantConfiguration.siteName, lang)}
      </div>
      <div
        className={`text-xl font-bold mt-1 ${template.hero.title}`}
        style={textScheme ? { color: textScheme.strong } : undefined}
      >
        {t2(activePage.title, lang)}
      </div>
    </div>
  )
}
```

The existing `template.hero.wrapper`/`eyebrow`/`title` classes stay applied unconditionally — inline `style` (background-image, color) wins over a class-based CSS property automatically, so with no image set this renders byte-for-byte as it did before.

- [ ] **Step 2: Rewrite `CanvasTopNav.jsx`**

Replace the full contents of `client/src/components/canvas/CanvasTopNav.jsx`:

```jsx
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { buildPageTree } from '../../context/pageHelpers.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'
import MegaMenuPanel from './MegaMenuPanel.jsx'

function isInSubtree(node, pageId) {
  return node.pageId === pageId || node.children.some(child => isInSubtree(child, pageId))
}

export default function CanvasTopNav() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { template, backgroundImageUrl, textScheme, showFallbackScrim } = useTheme()
  const lang = useLang()
  const [closedRootId, setClosedRootId] = useState(null)
  const tree = buildPageTree(state.pages)
  const activeRoot = tree.find(root => isInSubtree(root, state.activePageId))
  if (!activeRoot) return null
  const openRoot = activeRoot && activeRoot.children.length > 0 && activeRoot.pageId !== closedRootId
    ? activeRoot
    : null

  const navStyle = backgroundImageUrl
    ? {
        backgroundImage: showFallbackScrim
          ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${backgroundImageUrl})`
          : `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined

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
    <div className={`mb-4 ${template.nav.wrapper}`} style={navStyle}>
      <nav className="flex gap-1 overflow-x-auto">
        {tree.map(page => (
          <button
            key={page.pageId}
            onClick={() => handleRootClick(page)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors
              ${activeRoot.pageId === page.pageId ? template.nav.tabActive : template.nav.tabInactive}`}
            style={textScheme ? { color: activeRoot.pageId === page.pageId ? textScheme.strong : textScheme.muted } : undefined}
          >
            {t2(page.title, lang)}
            {page.children.length > 0 && (
              openRoot?.pageId === page.pageId ? <ChevronUp size={12} /> : <ChevronDown size={12} />
            )}
          </button>
        ))}
      </nav>
      {openRoot && (
        <MegaMenuPanel node={openRoot} activePageId={state.activePageId} onSelect={select} template={template} lang={lang} />
      )}
    </div>
  )
}
```

`template.nav.tabActive`/`tabInactive` (which carry the accent-colored bottom border, not just text color) stay applied unconditionally — the inline `style.color` only overrides the text color, the border classes are untouched. `MegaMenuPanel.jsx` is not modified, per the out-of-scope rendering note in the spec.

- [ ] **Step 3: Run lint to verify correctness**

Run: `npm run lint` (from `client/`)
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/canvas/HeroBanner.jsx client/src/components/canvas/CanvasTopNav.jsx
git commit -m "feat: render background image and computed text colors in Hero Banner and Top Nav"
```

---

### Task 7: Playwright e2e test

**Files:**
- Modify: `client/tests/smoke.spec.js` (add one test after the existing test at lines 161-166, before the `'deploy flow...'` test at line 168)

**Interfaces:**
- Consumes: the full stack built in Tasks 1-6 (no new interfaces produced).

- [ ] **Step 1: Write the test**

In `client/tests/smoke.spec.js`, insert this test immediately after the `'accent color picker updates --theme-accent on the canvas'` test (which ends at line 166) and before the `'deploy flow completes end-to-end...'` test:

```js
  test('setting a background image URL applies it to the Hero Banner and Top Nav', async ({ page }) => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC'

    await page.getByRole('button', { name: 'Aspetto' }).click()
    await page.getByPlaceholder(/sfondo/i).fill(dataUrl)

    const eyebrow = page.locator('main').getByText('My Corporate Intranet', { exact: true })
    const heroWrapper = eyebrow.locator('..')
    const heroTitle = heroWrapper.locator('> div').nth(1)
    const navWrapper = page.locator('main nav').locator('..')

    await expect(heroWrapper).toHaveAttribute('style', /background-image:\s*url\(.*data:image\/png/)
    await expect(navWrapper).toHaveAttribute('style', /background-image:\s*url\(.*data:image\/png/)
    await expect(eyebrow).toHaveCSS('color', 'rgba(255, 255, 255, 0.72)')
    await expect(heroTitle).toHaveCSS('color', 'rgb(255, 255, 255)')
  })

```

The `dataUrl` is a verified, structurally-valid 1×1 truecolor PNG encoding a single solid black pixel (no network request — it's a `data:` URI handled entirely client-side, so this is fast and deterministic in CI). When `drawImage` stretches it to the 32×32 sampling canvas, every sampled pixel is `(0,0,0)`, giving a deterministic average luminance of 0 — well under the 140 threshold — so the test can assert the exact resulting `LIGHT_TEXT_SCHEME` colors rather than just "some color changed". `getByPlaceholder(/sfondo/i)` matches the new background-image input's placeholder (the only input in "Aspetto" with a placeholder — the site-name input has none), so this is robust without needing a test id.

- [ ] **Step 2: Run the test**

Run: `npm run test:e2e -- -g "background image"` (from `client/`)
Expected: PASS

- [ ] **Step 3: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e` (from `client/`)
Expected: all tests pass (aside from any pre-existing, unrelated failures already present before this change — verify by checking `git status`/recent CI history if any failure appears unrelated to this feature).

- [ ] **Step 4: Commit**

```bash
git add client/tests/smoke.spec.js
git commit -m "test: add e2e coverage for background image rendering in Hero Banner and Top Nav"
```
