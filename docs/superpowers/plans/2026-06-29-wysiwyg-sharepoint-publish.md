# WYSIWYG SharePoint Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Map Shareflow canvas look & feel (logo, brand colors, background image, section rhythm) to a published SharePoint Communication Site during deploy.

**Architecture:** A new `spBranding.js` server module encapsulates all SP branding API calls (logo PUT via Graph, theme via ThemeManager REST, header via SetChromeOptions REST). A new pipeline step 3 "Applying Site Branding" calls it after site creation. `pageBuilder.js` gains automatic section emphasis from `ctx.pageColor`. `AppearancePanel` gains a logo file-upload field; `CanvasTopNav` shows the logo immediately in canvas.

**Tech Stack:** Node.js ≥21.2, native `fetch`, Node `--test` runner (server), Vite + Vitest (client), React 19, `@microsoft/microsoft-graph-client`, SharePoint REST API

## Global Constraints

- Server test runner: `node --test src/**/*.test.js` (run from `server/` directory)
- Server test format: `import { describe, it } from 'node:test'` + `import assert from 'node:assert/strict'`
- Client test runner: `npm run test:unit` (run from `client/` directory), Vitest
- No new npm dependencies — use native Node `fetch` and existing packages only
- All branding API calls are non-blocking: individual failures log a warning and do not fail the deploy
- Logo file size limit enforced client-side: 200 KB maximum
- Logo stored as base64 data URI in `tenantConfiguration.theme.logoBase64`
- `schemas.js` Zod validation uses `.passthrough()` on `theme` — no schema changes needed

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `server/src/spBranding.js` | All SP branding API calls + pure palette generator |
| Create | `server/src/spBranding.test.js` | Tests for spBranding functions |
| Modify | `server/src/pageBuilder.js` | Add section emphasis from `ctx.pageColor` |
| Modify | `server/src/pageBuilder.test.js` | Tests for new emphasis behaviour |
| Modify | `server/src/provisioningJobs.js` | Add step 3 "Applying Site Branding", STEP_COUNT 7→8 |
| Modify | `server/src/provisioningJobs.test.js` | Update `totalSteps` assertion 7→8 |
| Modify | `client/src/components/deploy/DeployModal.jsx` | Add STEPS entry for branding, renumber to step8 |
| Modify | `client/src/locales/it.json` | Add `step4` branding label, renumber step4→step5 … step7→step8 |
| Modify | `client/src/locales/en.json` | Same renumbering |
| Modify | `client/src/locales/de.json` | Same renumbering |
| Modify | `client/src/locales/fr.json` | Same renumbering |
| Modify | `client/src/components/sidebar-left/AppearancePanel.jsx` | Logo upload field |
| Modify | `client/src/components/canvas/CanvasTopNav.jsx` | Logo preview in canvas nav |

---

### Task 1: `spBranding.js` — pure palette generator

**Files:**
- Create: `server/src/spBranding.js`
- Create: `server/src/spBranding.test.js`

**Interfaces:**
- Produces: `generateSpPalette(accentHex: string|null, pageHex: string|null): { palette: object, isInverted: boolean } | null`

- [ ] **Step 1: Write the failing tests**

Create `server/src/spBranding.test.js`:

```js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateSpPalette } from './spBranding.js'

describe('generateSpPalette', () => {
  it('returns null when accentHex is falsy', () => {
    assert.equal(generateSpPalette(null, null), null)
    assert.equal(generateSpPalette('', null), null)
  })

  it('includes all required SP palette keys', () => {
    const { palette } = generateSpPalette('#0078d4', '#ffffff')
    const required = [
      'themePrimary', 'themeSecondary', 'themeTertiary', 'themeLight',
      'themeLighter', 'themeLighterAlt', 'themeDarkAlt', 'themeDark', 'themeDarker',
      'neutralPrimary', 'black', 'white', 'bodyBackground',
    ]
    for (const key of required) assert.ok(key in palette, `missing key: ${key}`)
  })

  it('sets themePrimary to the accent color', () => {
    const { palette } = generateSpPalette('#0078d4', null)
    assert.equal(palette.themePrimary, '#0078d4')
  })

  it('isInverted true for dark pageColor (luminance < 0.35)', () => {
    const { isInverted } = generateSpPalette('#0078d4', '#15140f')
    assert.ok(isInverted)
  })

  it('isInverted false for light pageColor (luminance >= 0.35)', () => {
    const { isInverted } = generateSpPalette('#0078d4', '#ffffff')
    assert.ok(!isInverted)
  })

  it('isInverted false when pageHex is null', () => {
    const { isInverted } = generateSpPalette('#0078d4', null)
    assert.ok(!isInverted)
  })

  it('themeDark differs from themePrimary', () => {
    const { palette } = generateSpPalette('#0078d4', null)
    assert.notEqual(palette.themeDark, palette.themePrimary)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```
cd server
node --test src/spBranding.test.js
```

Expected: `Error: Cannot find module './spBranding.js'`

- [ ] **Step 3: Create `server/src/spBranding.js` with pure functions only**

```js
// hex '#rrggbb' → [r, g, b] each 0–1
function hexToRgb(hex) {
  const h = (hex || '#ffffff').replace('#', '').padEnd(6, '0')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

// WCAG 2.1 relative luminance, 0 (black) – 1 (white)
function hexLuminance(hex) {
  if (!hex || hex.length < 4) return 1
  const [r, g, b] = hexToRgb(hex).map(c =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex)
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    default: h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100
  if (s === 0) {
    const v = Math.round(l * 255).toString(16).padStart(2, '0')
    return `#${v}${v}${v}`
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue2rgb = (t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return '#' + [h + 1 / 3, h, h - 1 / 3]
    .map(t => Math.round(hue2rgb(t) * 255).toString(16).padStart(2, '0'))
    .join('')
}

function shift(hex, deltaL) {
  const [h, s, l] = hexToHsl(hex)
  return hslToHex(h, s, Math.max(0, Math.min(100, l + deltaL)))
}

/**
 * Generates a SharePoint modern theme palette from a primary accent color.
 * Returns null if accentHex is falsy.
 *
 * @param {string|null} accentHex  e.g. '#0078d4'
 * @param {string|null} pageHex    e.g. '#15140f' (dark) or '#ffffff' (light)
 * @returns {{ palette: object, isInverted: boolean } | null}
 */
export function generateSpPalette(accentHex, pageHex) {
  if (!accentHex) return null
  const isInverted = pageHex ? hexLuminance(pageHex) < 0.35 : false

  const palette = {
    themePrimary:         accentHex,
    themeSecondary:       shift(accentHex, 10),
    themeTertiary:        shift(accentHex, 30),
    themeLight:           shift(accentHex, 50),
    themeLighter:         shift(accentHex, 65),
    themeLighterAlt:      shift(accentHex, 80),
    themeDarkAlt:         shift(accentHex, -10),
    themeDark:            shift(accentHex, -25),
    themeDarker:          shift(accentHex, -40),
    neutralLighterAlt:    '#faf9f8',
    neutralLighter:       '#f3f2f1',
    neutralLight:         '#edebe9',
    neutralQuaternaryAlt: '#e1dfdd',
    neutralQuaternary:    '#d0d0d0',
    neutralTertiaryAlt:   '#c8c6c4',
    neutralTertiary:      '#a19f9d',
    neutralSecondary:     '#605e5c',
    neutralPrimaryAlt:    '#3b3a39',
    neutralPrimary:       '#323130',
    neutralDark:          '#201f1e',
    black:                '#000000',
    white:                '#ffffff',
    bodyBackground:       pageHex ?? '#ffffff',
    bodyText:             isInverted ? '#ffffff' : '#323130',
  }

  return { palette, isInverted }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```
cd server
node --test src/spBranding.test.js
```

Expected: `▶ generateSpPalette` with 7 passing subtests, exit 0

- [ ] **Step 5: Commit**

```bash
git add server/src/spBranding.js server/src/spBranding.test.js
git commit -m "feat: add spBranding — generateSpPalette pure function"
```

---

### Task 2: `spBranding.js` — API call functions

**Files:**
- Modify: `server/src/spBranding.js`
- Modify: `server/src/spBranding.test.js`

**Interfaces:**
- Produces:
  - `uploadSiteLogo(siteId: string, logoBase64: string|null, accessToken: string): Promise<void>`
  - `applySiteTheme(siteUrl: string, spToken: string, accentColor: string|null, pageColor: string|null): Promise<void>`
  - `applyHeaderBackground(siteUrl: string, spToken: string, backgroundImageUrl: string|null): Promise<void>`

- [ ] **Step 1: Write failing tests for API functions**

Append to `server/src/spBranding.test.js` (after the existing `generateSpPalette` describe block):

```js
import { uploadSiteLogo, applySiteTheme, applyHeaderBackground } from './spBranding.js'

describe('uploadSiteLogo', () => {
  it('returns without fetching when logoBase64 is null', async () => {
    let called = false
    globalThis.fetch = async () => { called = true; return { ok: true } }
    await uploadSiteLogo('site123', null, 'token')
    assert.ok(!called)
  })

  it('PUTs to Graph logo endpoint with correct headers', async () => {
    let capturedUrl, capturedMethod, capturedContentType
    globalThis.fetch = async (url, opts) => {
      capturedUrl = url
      capturedMethod = opts.method
      capturedContentType = opts.headers['Content-Type']
      return { ok: true }
    }
    await uploadSiteLogo('site123', 'data:image/png;base64,iVBORw0KGgo=', 'mytoken')
    assert.ok(capturedUrl.includes('/sites/site123/logo'), `unexpected url: ${capturedUrl}`)
    assert.equal(capturedMethod, 'PUT')
    assert.equal(capturedContentType, 'image/png')
  })

  it('throws on non-ok response', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 403, text: async () => 'Forbidden' })
    await assert.rejects(
      () => uploadSiteLogo('site123', 'data:image/png;base64,iVBORw0KGgo=', 'tok'),
      /403/
    )
  })
})

describe('applySiteTheme', () => {
  it('returns without fetching when accentColor is null', async () => {
    let called = false
    globalThis.fetch = async () => { called = true; return { ok: true } }
    await applySiteTheme('https://t.sharepoint.com/sites/x', 'tok', null, null)
    assert.ok(!called)
  })

  it('POSTs to ThemeManager/ApplyTheme with palette object', async () => {
    let capturedUrl, capturedBody
    globalThis.fetch = async (url, opts) => {
      capturedUrl = url
      capturedBody = JSON.parse(opts.body)
      return { ok: true }
    }
    await applySiteTheme('https://t.sharepoint.com/sites/x', 'tok', '#0078d4', '#ffffff')
    assert.ok(capturedUrl.endsWith('/_api/ThemeManager/ApplyTheme'), `url: ${capturedUrl}`)
    assert.equal(capturedBody.palette.themePrimary, '#0078d4')
    assert.ok('isInverted' in capturedBody)
  })
})

describe('applyHeaderBackground', () => {
  it('returns without fetching when backgroundImageUrl is empty', async () => {
    let called = false
    globalThis.fetch = async () => { called = true; return { ok: true } }
    await applyHeaderBackground('https://t.sharepoint.com/sites/x', 'tok', '')
    assert.ok(!called)
  })

  it('POSTs to SetChromeOptions with headerLayout 4 and image url', async () => {
    let capturedUrl, capturedBody
    globalThis.fetch = async (url, opts) => {
      capturedUrl = url
      capturedBody = JSON.parse(opts.body)
      return { ok: true }
    }
    await applyHeaderBackground('https://t.sharepoint.com/sites/x', 'tok', 'https://img.example.com/bg.jpg')
    assert.ok(capturedUrl.endsWith('/_api/web/SetChromeOptions'), `url: ${capturedUrl}`)
    assert.equal(capturedBody.options.headerLayout, 4)
    assert.equal(capturedBody.options.backgroundImageUrl, 'https://img.example.com/bg.jpg')
  })
})
```

- [ ] **Step 2: Run — verify new tests fail**

```
cd server
node --test src/spBranding.test.js
```

Expected: `SyntaxError` or `uploadSiteLogo is not a function` — the new imports don't exist yet

- [ ] **Step 3: Add API functions to `server/src/spBranding.js`**

Append after the `generateSpPalette` export:

```js
/**
 * Uploads a base64-encoded logo to the SharePoint site via Graph API.
 * No-op if logoBase64 or accessToken is falsy.
 */
export async function uploadSiteLogo(siteId, logoBase64, accessToken) {
  if (!logoBase64 || !accessToken) return
  const match = logoBase64.match(/^data:(image\/[^;]+);base64,(.+)$/)
  if (!match) return
  const [, mimeType, b64] = match
  const buffer = Buffer.from(b64, 'base64')
  const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/logo`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': mimeType },
    body: buffer,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`logo PUT ${res.status}: ${text}`)
  }
}

/**
 * Applies a custom color theme to a SharePoint site via ThemeManager REST API.
 * No-op if accentColor or spToken is falsy.
 */
export async function applySiteTheme(siteUrl, spToken, accentColor, pageColor) {
  if (!accentColor || !spToken) return
  const result = generateSpPalette(accentColor, pageColor)
  if (!result) return
  const baseUrl = siteUrl.replace(/\/$/, '')
  const res = await fetch(`${baseUrl}/_api/ThemeManager/ApplyTheme`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${spToken}`,
      'Content-Type': 'application/json;odata=verbose',
      Accept: 'application/json;odata=verbose',
    },
    body: JSON.stringify({ name: 'Shareflow Theme', palette: result.palette, isInverted: result.isInverted }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ThemeManager/ApplyTheme ${res.status}: ${text}`)
  }
}

/**
 * Sets the SharePoint site header background image via web chrome options.
 * No-op if backgroundImageUrl or spToken is falsy.
 */
export async function applyHeaderBackground(siteUrl, spToken, backgroundImageUrl) {
  if (!backgroundImageUrl || !spToken) return
  const baseUrl = siteUrl.replace(/\/$/, '')
  const res = await fetch(`${baseUrl}/_api/web/SetChromeOptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${spToken}`,
      'Content-Type': 'application/json;odata=verbose',
      Accept: 'application/json;odata=verbose',
    },
    body: JSON.stringify({ options: { headerLayout: 4, backgroundImageUrl } }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`SetChromeOptions ${res.status}: ${text}`)
  }
}
```

- [ ] **Step 4: Run — verify all tests pass**

```
cd server
node --test src/spBranding.test.js
```

Expected: all 13 tests passing, exit 0

- [ ] **Step 5: Commit**

```bash
git add server/src/spBranding.js server/src/spBranding.test.js
git commit -m "feat: add spBranding API functions — logo, theme, header background"
```

---

### Task 3: `pageBuilder.js` — automatic section emphasis

**Files:**
- Modify: `server/src/pageBuilder.js`
- Modify: `server/src/pageBuilder.test.js`

**Interfaces:**
- Consumes: `ctx.pageColor: string | null` (optional, already part of `ctx` object passed to `buildCanvasLayout`)
- Produces: `horizontalSections[n].emphasis` is now `'none' | 'soft' | 'neutral'` (was always `'none'`)

- [ ] **Step 1: Write failing tests**

Append to `server/src/pageBuilder.test.js` after the existing `describe('buildCanvasLayout', ...)` block:

```js
describe('buildCanvasLayout section emphasis', () => {
  const twoSections = {
    sections: [
      { sectionId: 's1', layout: 'oneColumn', columns: [{ columnId: 'c1', widgets: [] }] },
      { sectionId: 's2', layout: 'oneColumn', columns: [{ columnId: 'c2', widgets: [] }] },
    ],
  }

  it('all none when no pageColor in ctx', () => {
    const { canvasLayout } = buildCanvasLayout(twoSections)
    for (const s of canvasLayout.horizontalSections) assert.equal(s.emphasis, 'none')
  })

  it('all none when ctx.pageColor is null', () => {
    const { canvasLayout } = buildCanvasLayout(twoSections, { pageColor: null })
    for (const s of canvasLayout.horizontalSections) assert.equal(s.emphasis, 'none')
  })

  it('dark pageColor (#15140f): even sections none, odd sections soft', () => {
    const { canvasLayout } = buildCanvasLayout(twoSections, { pageColor: '#15140f' })
    assert.equal(canvasLayout.horizontalSections[0].emphasis, 'none')
    assert.equal(canvasLayout.horizontalSections[1].emphasis, 'soft')
  })

  it('mid-tone pageColor (#b0b0b0): even sections none, odd sections neutral', () => {
    const { canvasLayout } = buildCanvasLayout(twoSections, { pageColor: '#b0b0b0' })
    assert.equal(canvasLayout.horizontalSections[0].emphasis, 'none')
    assert.equal(canvasLayout.horizontalSections[1].emphasis, 'neutral')
  })

  it('light pageColor (#ffffff): all sections none', () => {
    const { canvasLayout } = buildCanvasLayout(twoSections, { pageColor: '#ffffff' })
    for (const s of canvasLayout.horizontalSections) assert.equal(s.emphasis, 'none')
  })
})
```

- [ ] **Step 2: Run — verify new tests fail**

```
cd server
node --test src/pageBuilder.test.js
```

Expected: `assert.equal` failure on emphasis — currently `'none'` where `'soft'` or `'neutral'` expected

- [ ] **Step 3: Modify `server/src/pageBuilder.js`**

After the existing `LAYOUT_MAP` constant and before `placeholderTextNode`, insert the three helpers:

```js
function hexToRgb(hex) {
  const h = (hex || '#ffffff').replace('#', '').padEnd(6, '0')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

function hexLuminance(hex) {
  if (!hex || hex.length < 4) return 1
  const [r, g, b] = hexToRgb(hex).map(c =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function sectionEmphasis(pageColor, idx) {
  if (!pageColor) return 'none'
  if (idx % 2 === 0) return 'none'
  const lum = hexLuminance(pageColor)
  if (lum < 0.35) return 'soft'
  if (lum < 0.65) return 'neutral'
  return 'none'
}
```

Then in `buildCanvasLayout`, replace the line:

```js
      emphasis: 'none',
```

with:

```js
      emphasis: sectionEmphasis(ctx?.pageColor ?? null, sIdx),
```

- [ ] **Step 4: Run — verify all tests pass**

```
cd server
node --test src/pageBuilder.test.js
```

Expected: all tests including existing ones pass (existing tests don't pass `ctx.pageColor` so they receive `emphasis: 'none'` — unchanged)

- [ ] **Step 5: Commit**

```bash
git add server/src/pageBuilder.js server/src/pageBuilder.test.js
git commit -m "feat: auto section emphasis in pageBuilder from ctx.pageColor"
```

---

### Task 4: `provisioningJobs.js` — integrate branding step

**Files:**
- Modify: `server/src/provisioningJobs.js`
- Modify: `server/src/provisioningJobs.test.js`

**Interfaces:**
- Consumes:
  - `uploadSiteLogo(siteId, logoBase64, accessToken)` from `./spBranding.js`
  - `applySiteTheme(siteUrl, spToken, accentColor, pageColor)` from `./spBranding.js`
  - `applyHeaderBackground(siteUrl, spToken, backgroundImageUrl)` from `./spBranding.js`
  - `getGraphAccessToken()` already imported from `./msalClient.js`
  - `getSharePointAccessToken(hostname)` already imported from `./msalClient.js`

- [ ] **Step 1: Update the failing assertion in `server/src/provisioningJobs.test.js`**

On line 36, change:

```js
  assert.equal(job.totalSteps, 7)
```

to:

```js
  assert.equal(job.totalSteps, 8)
```

- [ ] **Step 2: Run — verify the test now fails**

```
cd server
node --test src/provisioningJobs.test.js
```

Expected: `AssertionError: 7 !== 8`

- [ ] **Step 3: Update `server/src/provisioningJobs.js`**

**3a.** Add import at the top (after existing imports):

```js
import { uploadSiteLogo, applySiteTheme, applyHeaderBackground } from './spBranding.js'
```

**3b.** Change `STEP_COUNT`:

```js
const STEP_COUNT = 8
```

**3c.** In the `runStep` switch, insert new `case 3` and shift all subsequent cases by 1:

Replace the entire switch body with:

```js
      case 0:
        // Authenticating via MSAL
        if (isGraphConfigured()) {
          await getGraphAccessToken()
        }
        break
      case 1:
        // Connecting to Microsoft Graph API
        if (isGraphConfigured()) {
          job.graphClient = await getGraphClient()
        }
        break
      case 2:
        // Creating SharePoint Communication Site
        if (isGraphConfigured()) {
          await createSharePointSite(job)
        }
        break
      case 3:
        // Applying Site Branding
        if (isGraphConfigured()) {
          await applyBranding(job)
        }
        break
      case 4:
        // Provisioning Lists & Content Types
        if (isGraphConfigured()) {
          await provisionLists(job)
          await provisionManualContent(job)
        }
        break
      case 5:
        // Configuring Pages & Webparts
        if (isGraphConfigured()) {
          await configurePages(job)
        }
        break
      case 6:
        // Publishing page
        if (isGraphConfigured()) {
          await publishPage(job)
        }
        break
      case 7:
        // Building site navigation
        if (isGraphConfigured()) {
          await buildNavigation(job)
        }
        break
```

**3d.** Add the `applyBranding` function (insert before `createSharePointSite`):

```js
async function applyBranding(job) {
  const theme = job.tenantConfiguration?.theme ?? {}
  const hostname = new URL(job.siteUrl).hostname

  let graphToken
  try { graphToken = await getGraphAccessToken() }
  catch (e) { logger.warn({ err: e.message }, 'branding: graph token unavailable') }

  let spToken
  try { spToken = await getSharePointAccessToken(hostname) }
  catch (e) { logger.warn({ err: e.message }, 'branding: SP token unavailable') }

  if (graphToken) {
    try { await uploadSiteLogo(job.siteId, theme.logoBase64, graphToken) }
    catch (e) { logger.warn({ err: e.message }, 'logo upload skipped') }
  }

  if (spToken) {
    try { await applySiteTheme(job.siteUrl, spToken, theme.accentColor, theme.pageColor) }
    catch (e) { logger.warn({ err: e.message }, 'theme apply skipped') }

    try { await applyHeaderBackground(job.siteUrl, spToken, theme.backgroundImageUrl) }
    catch (e) { logger.warn({ err: e.message }, 'header background skipped') }
  }
}
```

**3e.** In `buildCanvasLayout` call inside `configurePages`, pass `pageColor`:

```js
    const { canvasLayout, unmappedBlocks } = buildCanvasLayout(page, {
      siteUrl: job.siteUrl,
      groupId: job.groupId ?? null,
      groupName: siteName,
      pageColor: job.tenantConfiguration?.theme?.pageColor ?? null,
    })
```

- [ ] **Step 4: Run — verify tests pass**

```
cd server
node --test src/provisioningJobs.test.js
```

Expected: 5 passing tests, `totalSteps === 8`, exit 0

- [ ] **Step 5: Run full server test suite**

```
cd server
node --test src/**/*.test.js
```

Expected: all tests pass, exit 0

- [ ] **Step 6: Commit**

```bash
git add server/src/provisioningJobs.js server/src/provisioningJobs.test.js
git commit -m "feat: add 'Applying Site Branding' as step 3 in provisioning pipeline (STEP_COUNT 8)"
```

---

### Task 5: `DeployModal.jsx` + i18n locales — add step 4 label, renumber

**Files:**
- Modify: `client/src/components/deploy/DeployModal.jsx`
- Modify: `client/src/locales/it.json`
- Modify: `client/src/locales/en.json`
- Modify: `client/src/locales/de.json`
- Modify: `client/src/locales/fr.json`

*No automated tests — verify manually in browser.*

- [ ] **Step 1: Update `client/src/locales/it.json`**

In the `"deploy"` section, replace the existing step strings:

```json
"step4": "Provisioning di liste e tipi di contenuto…",
"step5": "Configurazione di pagine e webpart…",
"step6": "Pubblicazione della pagina…",
"step7": "Configurazione della navigazione del sito…",
```

with:

```json
"step4": "Applicazione del branding aziendale…",
"step5": "Provisioning di liste e tipi di contenuto…",
"step6": "Configurazione di pagine e webpart…",
"step7": "Pubblicazione della pagina…",
"step8": "Configurazione della navigazione del sito…",
```

- [ ] **Step 2: Update `client/src/locales/en.json`**

Replace:

```json
"step4": "Provisioning Lists & Content Types…",
"step5": "Configuring Pages & Webparts…",
"step6": "Publishing page…",
"step7": "Building site navigation…",
```

with:

```json
"step4": "Applying site branding…",
"step5": "Provisioning Lists & Content Types…",
"step6": "Configuring Pages & Webparts…",
"step7": "Publishing page…",
"step8": "Building site navigation…",
```

- [ ] **Step 3: Update `client/src/locales/de.json`**

Replace:

```json
"step4": "Listen und Inhaltstypen bereitstellen…",
"step5": "Seiten und Webparts konfigurieren…",
"step6": "Seite veröffentlichen…",
"step7": "Sitenavigation aufbauen…",
```

with:

```json
"step4": "Website-Branding anwenden…",
"step5": "Listen und Inhaltstypen bereitstellen…",
"step6": "Seiten und Webparts konfigurieren…",
"step7": "Seite veröffentlichen…",
"step8": "Sitenavigation aufbauen…",
```

- [ ] **Step 4: Update `client/src/locales/fr.json`**

Replace:

```json
"step4": "Provisionnement des listes…",
"step5": "Configuration des pages…",
"step6": "Publication de la page…",
"step7": "Configuration de la navigation du site…",
```

with:

```json
"step4": "Application du branding du site…",
"step5": "Provisionnement des listes…",
"step6": "Configuration des pages…",
"step7": "Publication de la page…",
"step8": "Configuration de la navigation du site…",
```

- [ ] **Step 5: Update `client/src/components/deploy/DeployModal.jsx`**

Replace the `STEPS` array:

```js
  const STEPS = [
    { id: 1, label: t('deploy.step1') },
    { id: 2, label: t('deploy.step2') },
    { id: 3, label: t('deploy.step3') },
    { id: 4, label: t('deploy.step4') },
    { id: 5, label: t('deploy.step5') },
    { id: 6, label: t('deploy.step6') },
    { id: 7, label: t('deploy.step7') },
  ]
```

with:

```js
  const STEPS = [
    { id: 1, label: t('deploy.step1') },
    { id: 2, label: t('deploy.step2') },
    { id: 3, label: t('deploy.step3') },
    { id: 4, label: t('deploy.step4') },
    { id: 5, label: t('deploy.step5') },
    { id: 6, label: t('deploy.step6') },
    { id: 7, label: t('deploy.step7') },
    { id: 8, label: t('deploy.step8') },
  ]
```

- [ ] **Step 6: Manual verify**

Start the dev server (`cd client && npm run dev`), open the canvas, click "Pubblica su SharePoint". Verify the deploy modal shows 8 steps including "Applicazione del branding aziendale…" as step 4.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/deploy/DeployModal.jsx client/src/locales/it.json client/src/locales/en.json client/src/locales/de.json client/src/locales/fr.json
git commit -m "feat: add step 4 branding label to DeployModal and all locales"
```

---

### Task 6: `AppearancePanel.jsx` — company logo upload field

**Files:**
- Modify: `client/src/components/sidebar-left/AppearancePanel.jsx`

*No automated unit tests — verify manually in browser.*

- [ ] **Step 1: Modify `client/src/components/sidebar-left/AppearancePanel.jsx`**

**1a.** Add React imports at the top of the file (new line before the existing imports):

```js
import { useRef, useState } from 'react'
```

**1b.** Update the lucide-react import to include `X`:

```js
import { Check, X } from 'lucide-react'
```

**1c.** Inside the `AppearancePanel` component, after the existing handler functions and before `return`, add:

```js
  const logoBase64 = theme?.logoBase64 ?? null
  const logoInputRef = useRef(null)
  const [logoError, setLogoError] = useState('')

  function handleLogoFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 200_000) {
      setLogoError('File troppo grande (max 200 KB)')
      e.target.value = ''
      return
    }
    setLogoError('')
    const reader = new FileReader()
    reader.onload = ev => {
      dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, logoBase64: ev.target.result } } })
    }
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, logoBase64: null } } })
    setLogoError('')
  }
```

**1d.** In the JSX `return`, add a new section at the very top of `<div className="p-3 space-y-4 overflow-y-auto h-full">` — before the existing "Site Name" `<div>`:

```jsx
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
          {t('appearance.logoLabel')}
        </h3>
        <div className="flex items-center gap-2">
          {logoBase64 && (
            <img
              src={logoBase64}
              alt="logo"
              className="w-10 h-10 object-contain rounded border border-ink-700 bg-ink-800 flex-shrink-0"
            />
          )}
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="text-xs px-2 py-1.5 rounded bg-ink-700 text-white hover:bg-ink-600 transition-colors"
          >
            {logoBase64 ? t('appearance.logoChange') : t('appearance.logoUpload')}
          </button>
          {logoBase64 && (
            <button type="button" onClick={removeLogo} className="text-ink-400 hover:text-white transition-colors">
              <X size={14} />
            </button>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={handleLogoFile}
          />
        </div>
        {logoError && <p className="text-xs text-red-400 mt-1">{logoError}</p>}
        <p className="text-xs text-ink-400 mt-1">PNG · JPG · SVG · max 200 KB</p>
      </div>
```

- [ ] **Step 2: Add i18n keys to all locale files**

In `client/src/locales/it.json`, in the `"appearance"` section, add:

```json
"logoLabel": "Logo aziendale",
"logoUpload": "Carica logo",
"logoChange": "Cambia"
```

In `client/src/locales/en.json`:

```json
"logoLabel": "Company logo",
"logoUpload": "Upload logo",
"logoChange": "Change"
```

In `client/src/locales/de.json`:

```json
"logoLabel": "Unternehmenslogo",
"logoUpload": "Logo hochladen",
"logoChange": "Ändern"
```

In `client/src/locales/fr.json`:

```json
"logoLabel": "Logo de l'entreprise",
"logoUpload": "Téléverser le logo",
"logoChange": "Changer"
```

- [ ] **Step 3: Manual verify in browser**

Open the Appearance panel in the left sidebar:
- Upload a PNG file under 200 KB → thumbnail appears, logo stored in state
- Upload a file over 200 KB → error message appears, no logo stored
- Click × → logo removed
- Check that the logo persists across canvas navigation (state is correct)

- [ ] **Step 4: Commit**

```bash
git add client/src/components/sidebar-left/AppearancePanel.jsx client/src/locales/it.json client/src/locales/en.json client/src/locales/de.json client/src/locales/fr.json
git commit -m "feat: add logo upload field to AppearancePanel"
```

---

### Task 7: `CanvasTopNav.jsx` — logo preview in canvas nav

**Files:**
- Modify: `client/src/components/canvas/CanvasTopNav.jsx`

*No automated unit tests — verify manually in browser.*

- [ ] **Step 1: Modify `client/src/components/canvas/CanvasTopNav.jsx`**

**1a.** In the component body, after the existing `const tree = ...` line, add:

```js
  const logo = state.tenantConfiguration?.theme?.logoBase64 ?? null
```

**1b.** In the JSX, wrap the existing `<nav>` in a flex container and prepend the logo. Replace:

```jsx
    <div className={`mb-4 ${template.nav.wrapper}`} style={navStyle}>
      <nav className="flex gap-1 overflow-x-auto">
```

with:

```jsx
    <div className={`mb-4 ${template.nav.wrapper}`} style={navStyle}>
      <div className="flex items-center">
        {logo && (
          <img
            src={logo}
            alt=""
            className="w-8 h-8 object-contain mx-2 flex-shrink-0"
          />
        )}
        <nav className="flex gap-1 overflow-x-auto flex-1">
```

And close the new `</div>` before `{openRoot && ...}`:

Replace:

```jsx
      </nav>
      {openRoot && (
```

with:

```jsx
        </nav>
      </div>
      {openRoot && (
```

- [ ] **Step 2: Manual verify in browser**

1. Open Appearance panel → upload a logo PNG
2. Switch back to the canvas view
3. Verify the logo appears at the left of the top navigation bar
4. Remove the logo → verify the nav bar returns to normal
5. Check that the logo is correctly sized (32×32, `object-contain`) and does not overflow

- [ ] **Step 3: Commit**

```bash
git add client/src/components/canvas/CanvasTopNav.jsx
git commit -m "feat: show company logo in CanvasTopNav when logoBase64 is set"
```

---

## Self-Review

**Spec coverage:**
- Logo upload (file → base64 → deploy) → Tasks 1, 2, 4, 6 ✓
- SP site theme from accentColor → Tasks 1, 2, 4 (`applySiteTheme`) ✓
- Header background image → Tasks 2, 4 (`applyHeaderBackground`) ✓
- Section emphasis from pageColor → Tasks 3, 4 (`buildCanvasLayout` ctx update) ✓
- Logo preview in canvas → Task 7 ✓
- Deploy modal step label → Task 5 ✓
- Non-blocking branding failures → Task 4 (`applyBranding` try/catch isolation) ✓
- Client 200KB limit → Task 6 ✓

**Type consistency:** All function signatures defined in Tasks 1–2 are consumed identically in Task 4 (`provisioningJobs.js`). `ctx.pageColor` added in Task 4 matches what `pageBuilder.js` reads via `ctx?.pageColor` in Task 3. ✓

**No placeholders:** All steps contain complete code. ✓
