# Hero Background Image + Auto Accent Design

## Context

ShareFlow's "Aspetto" (Appearance) panel today offers 4 fixed visual templates (`THEME_TEMPLATES` in `client/src/data/themeTemplates.js`), each with a hard-coded gradient background for the Hero Banner and top navigation, plus a manual accent-color picker. There is no way to use a custom photo/graphic as a background, and no automatic color suggestion derived from one.

Inspired by Origami Connect's intranet templates (e.g. `sharepoint-ai-intranet-homepage-template`), which use a decorative graphic background behind the header/nav with a coordinated accent color, this feature adds: an optional background image (via external URL) applied to the Hero Banner and top navigation, plus an automatically suggested accent color and a dynamically computed text color, both derived from the image via the Canvas API — no new libraries, no new server infrastructure.

## Goal

Let a tenant set an image URL in "Aspetto" that becomes the background of the Hero Banner and top nav bar, with the UI automatically picking a readable text color and a suggested accent color from that image, while leaving every other surface (cards, mega-menu, page background) untouched.

## Scope

**In scope:**
- New `backgroundImageUrl` field on `tenantConfiguration.theme`, editable via a URL text input in `AppearancePanel.jsx`.
- Client-side image analysis (Canvas API, no external library) producing: a suggested accent color (average RGB) and a binary text-color scheme (light-on-dark vs dark-on-light) based on average luminance.
- Background image applied to `HeroBanner.jsx` and `CanvasTopNav.jsx` only, as an inline-style override of the template's gradient — never as a replacement of the template's other classes (rounded corners, padding, card styling, etc).
- Graceful, silent fallback when the image cannot be analyzed (CORS/`tainted canvas`/load failure): dark scrim overlay + light text scheme, no suggested accent, no error UI.
- Manual accent-color override (existing picker) always takes precedence over the auto-suggested one, exactly like it already takes precedence over the template default.

**Out of scope:**
- File upload / local storage of images (URL-only; no new server route).
- Applying the image to any surface other than Hero Banner + top nav (no card backgrounds, no mega-menu, no full-page background).
- Sophisticated palette extraction (k-means/vibrant-style clustering, multiple swatches). A single averaged RGB value is sufficient for v1.
- Per-pixel/region-aware text contrast (e.g. different text color depending on exactly what's behind each letter). The binary whole-image average is sufficient for v1.
- A 5th entry in `THEME_TEMPLATES` — the image is an independent overlay on top of any of the 4 existing templates, not a new template.
- Loading-state UI while analysis runs (no spinner/status text — the brief async window is acceptable).

## Architecture

### Data model

`tenantConfiguration.theme` gains one field, set via the existing `SET_TENANT_META` reducer action (no new action type):

```js
theme: {
  templateId: 'corporate-classic',
  accentColor: null,           // existing: manual override sentinel, null = "use default"
  backgroundImageUrl: '',      // NEW: '' = no image, otherwise an external URL
}
```

### `AppearancePanel.jsx` changes

A new section between the template gallery and the brand-color picker:
- Text input bound to `theme.backgroundImageUrl`, dispatching `SET_TENANT_META` with `theme: {...theme, backgroundImageUrl: value}`.
- "Remove image" button, shown only when `theme.backgroundImageUrl` is truthy, dispatching the same action with `backgroundImageUrl: ''`.
- No loading indicator, no error message for failed analysis (silent fallback per the Estrazione section below).
- The existing brand-color picker is unchanged in code; its displayed value will naturally reflect the auto-suggested accent (see "Accent color precedence" below) since it already reads `accentColor` from `useTheme()`.

New i18n keys (all 4 locales — `it`, `en`, `fr`, `de`), under `appearance`:
- `backgroundImageLabel` — "Immagine di sfondo" / "Background image" / "Image de fond" / "Hintergrundbild"
- `backgroundImageHint` — short placeholder/help text explaining it's applied to the Hero Banner and nav
- `backgroundImageRemove` — "Rimuovi immagine" / "Remove image" / "Supprimer l'image" / "Bild entfernen"

### Image analysis: `useBackgroundImageAnalysis.js`

New file `client/src/hooks/useBackgroundImageAnalysis.js`. Pure client-side, no dependency added.

```js
import { useEffect, useState } from 'react'

const LIGHT_TEXT_SCHEME = { strong: '#FFFFFF', muted: 'rgba(255,255,255,0.72)' }
const DARK_TEXT_SCHEME = { strong: '#0F1C2E', muted: 'rgba(15,28,46,0.65)' }
const LUMINANCE_THRESHOLD = 140 // 0-255 scale

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

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
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b
        resolve({
          accentColor: rgbToHex(r, g, b),
          textScheme: luminance < LUMINANCE_THRESHOLD ? LIGHT_TEXT_SCHEME : DARK_TEXT_SCHEME,
          usedFallback: false,
        })
      } catch {
        resolve({ accentColor: null, textScheme: LIGHT_TEXT_SCHEME, usedFallback: true })
      }
    }
    img.onerror = () => resolve({ accentColor: null, textScheme: LIGHT_TEXT_SCHEME, usedFallback: true })
    img.src = url
  })
}

/** Analyzes a background image URL for a suggested accent color and a readable text scheme. */
export function useBackgroundImageAnalysis(url) {
  const [result, setResult] = useState({ accentColor: null, textScheme: LIGHT_TEXT_SCHEME, usedFallback: true })

  useEffect(() => {
    if (!url) {
      setResult({ accentColor: null, textScheme: LIGHT_TEXT_SCHEME, usedFallback: true })
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

Behavior:
- **Success case** (image loads, canvas readable): `accentColor` = hex of the average RGB across a 32×32 downscaled sample; `textScheme` = light-on-dark scheme if average luminance < 140, dark-on-light scheme otherwise. No forced overlay — readability comes from the computed text color, not from darkening the photo.
- **Failure case** (CORS/tainted canvas, network error, invalid URL): `accentColor: null` (no suggestion — manual/template accent applies), `textScheme: LIGHT_TEXT_SCHEME` (assume the worst, default to light text), and the consuming components additionally render a dark semi-transparent scrim over the image (this is the one case that does get a forced overlay, since nothing about the image could be analyzed). No error is surfaced to the user.

### `useTheme.js` changes

Centralizes everything so `HeroBanner`, `CanvasTopNav`, and `AppearancePanel` all read the same derived values without duplicating analysis:

```js
import { useConfigurator } from './useConfigurator.js'
import { resolveTheme } from '../data/themeTemplates.js'
import { useBackgroundImageAnalysis } from './useBackgroundImageAnalysis.js'

/** Returns the active { template, accentColor, backgroundImageUrl, textScheme } based on tenantConfiguration.theme. */
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

`resolveTheme()` in `themeTemplates.js` is unchanged — it stays pure and synchronous, handling only template + manual accent resolution as it does today. All new async/canvas logic lives in the new hook, composed here.

**Accent color precedence** (unchanged mechanism, one more fallback layer added): manual `theme.accentColor` (if set) > image-extracted accent (if image set and analysis succeeded) > template default. This mirrors the existing `theme.accentColor: null` sentinel pattern used by `resetAccentColor()` today — no new sentinel values needed.

### Rendering changes

**`HeroBanner.jsx`:** when `backgroundImageUrl` is present, an inline `style` is applied on top of the existing `template.hero.wrapper` className — inline styles win over class-based backgrounds, so rounded corners/padding/etc from the template's classes are preserved untouched:

```js
backgroundImage: showFallbackScrim
  ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${backgroundImageUrl})`
  : `url(${backgroundImageUrl})`,
backgroundSize: 'cover',
backgroundPosition: 'center',
```

This is a single `background-image` value (gradient stacked with the photo via comma-separated layers) — no extra DOM node needed for the scrim. Eyebrow and title text use `style={{ color: textScheme.muted }}` / `style={{ color: textScheme.strong }}` instead of `template.hero.eyebrow`/`template.hero.title` Tailwind classes, only when `textScheme` is non-null (i.e. only when an image is active); with no image, both components render exactly as they do today.

**`CanvasTopNav.jsx`:** same inline-style background-image override on the `template.nav.wrapper` div. Tab text: `tabActive` uses `textScheme.strong` (color) + the existing accent-colored bottom border (unaffected, since it already reads the CSS var driven by `accentColor`); `tabInactive` uses `textScheme.muted`. Both only override color via inline `style` when `textScheme` is non-null; otherwise `template.nav.tabActive`/`tabInactive` classes apply as today.

**Out of scope for rendering:** `MegaMenuPanel.jsx` (the dropdown under the top nav) keeps its solid template-driven background — it is a secondary overlay, not the main nav bar, and is excluded from the image treatment.

## Testing

- **Unit (Vitest), `useBackgroundImageAnalysis.test.js`:** mock `Image`/canvas to cover 3 cases — dark image (low average luminance) → light text scheme + non-null accent; light image (high average luminance) → dark text scheme + non-null accent; load/analysis failure → fallback scheme, `accentColor: null`, `usedFallback: true`.
- **Unit (Vitest), reducer:** `SET_TENANT_META` with a `backgroundImageUrl` payload updates `tenantConfiguration.theme.backgroundImageUrl` correctly (same pattern as existing `templateId`/`accentColor` coverage in `configuratorReducer.test.js`).
- **E2E (Playwright):** set a background image URL in "Aspetto" and assert the Hero Banner in the canvas receives a `background-image` inline style. Does not assert exact extracted colors (network-dependent, unstable in CI) — only that the URL-to-rendered-background mechanism works end-to-end.
- All pixel-analysis unit tests use locally generated `data:image/...;base64,...` URLs (e.g. a 1x1 or simple gradient PNG built in the test itself) — no real network requests in CI, no flakiness from external image hosts.

## Known limitations (accepted for v1)

- The suggested accent color is a simple average RGB, not a perceptually-tuned dominant color — it may occasionally be a dull/grey tone on busy photos. The user can always override it manually.
- The binary text-color decision is based on whole-image average luminance, not the specific region behind the text — a photo with mixed bright/dark areas could still produce locally low contrast in the success case (the CORS-failure case is the only one that gets a safety-net dark scrim).
- Each component calling `useTheme()` (`HeroBanner`, `CanvasTopNav`, `AppearancePanel`) independently runs the analysis hook when a background image is set; the browser's HTTP cache avoids redundant network fetches of the same image, and the duplicated canvas computation is cheap (32×32 sample) — no shared/global caching layer is introduced for this v1.
