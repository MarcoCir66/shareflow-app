# WYSIWYG SharePoint Publishing — Design Spec

**Date:** 2026-06-29
**Status:** Approved
**Scope:** Full look & feel fidelity between Shareflow canvas and deployed SharePoint site

---

## Problem

The current deploy pipeline creates a Communication Site and publishes pages with correct web part layout (Phase 1). However, the site's visual identity is completely generic: no company logo, no brand colors, no hero background image, and all page sections render with the same flat `emphasis: 'none'` regardless of the design in Shareflow.

## Goal

Maximum WYSIWYG correspondence between what the user designs in Shareflow and what appears on the published SharePoint site:

| Shareflow canvas | SharePoint result |
|---|---|
| Company logo (uploaded file) | Site logo (favicon + header) |
| `accentColor` | Site theme primary color (nav, links, buttons) |
| `pageColor` | Site theme background + isInverted flag |
| `backgroundImageUrl` | Site header background image |
| Section layout (dark/light theme) | Section `emphasis` (visual rhythm) |

---

## Architecture

```
Shareflow Canvas (client)
  theme.logoBase64          → PUT /sites/{id}/logo          (Graph API)
  theme.accentColor         → ThemeManager/ApplyTheme       (SP REST)
  theme.pageColor           → palette isInverted            (SP REST)
  theme.backgroundImageUrl  → web/SetChromeOptions          (SP REST)
  sections[n]               → canvasLayout emphasis         (auto, pageBuilder)
```

---

## Pipeline Changes

### Step count: 7 → 8

| Step | Before | After |
|------|--------|-------|
| 0 | Auth MSAL | Auth MSAL |
| 1 | Connect Graph | Connect Graph |
| 2 | Create SP Communication Site | Create SP Communication Site |
| 3 | Provision Lists | **Applying Site Branding** ← NEW |
| 4 | Configure Pages & Webparts | Provision Lists |
| 5 | Publish Page | Configure Pages & Webparts |
| 6 | Build Navigation | Publish Page |
| 7 | — | Build Navigation |

`STEP_COUNT` changes from `7` to `8`. `STEP_LABELS` (if present in DeployModal) updated accordingly.

---

## New File: `server/src/spBranding.js`

Single responsibility: all SharePoint branding API calls.

### Exports

#### `uploadSiteLogo(graphClient, siteId, logoBase64)`

- Strips `data:image/...;base64,` prefix from the data URI
- Detects MIME type from the prefix (`image/png`, `image/jpeg`, `image/svg+xml`)
- Decodes base64 → `Buffer`
- `PUT https://graph.microsoft.com/v1.0/sites/{siteId}/logo` with binary body
- If `logoBase64` is null/empty → silent skip

#### `applySiteTheme(siteUrl, spToken, accentColor, pageColor)`

- Calls `generateSpPalette(accentColor, pageColor)` → `{ palette, isInverted }`
- `POST {siteUrl}/_api/ThemeManager/ApplyTheme`
  ```json
  {
    "name": "Shareflow Theme",
    "palette": { ... },
    "isInverted": false
  }
  ```
- Authorization: `Bearer <spToken>`
- Content-Type: `application/json;odata=verbose`
- If `accentColor` is null/empty → silent skip

#### `applyHeaderBackground(siteUrl, spToken, backgroundImageUrl)`

- `POST {siteUrl}/_api/web/SetChromeOptions`
  ```json
  {
    "options": {
      "headerLayout": 4,
      "backgroundImageUrl": "https://..."
    }
  }
  ```
- `headerLayout: 4` = Extended (supports background image in SP modern header)
- If `backgroundImageUrl` is null/empty → silent skip

#### `generateSpPalette(accentHex, pageHex)` — pure function

Converts `accentHex` to HSL, generates the 9 SharePoint theme shade slots, fills neutral grays with standard fixed values.

| Palette key | Value |
|---|---|
| `themePrimary` | accent as-is |
| `themeSecondary` | accent + 10% lightness |
| `themeTertiary` | accent + 30% |
| `themeLight` | accent + 50% |
| `themeLighter` | accent + 65% |
| `themeLighterAlt` | accent + 80% |
| `themeDarkAlt` | accent − 10% |
| `themeDark` | accent − 25% |
| `themeDarker` | accent − 40% |
| `bodyBackground` | `pageColor` (if set) |
| `neutralPrimary`, grays | standard fixed values |

`isInverted: true` when `hexLuminance(pageColor) < 0.35`.

No npm dependencies. ~80 lines total.

### Error isolation in `provisioningJobs.js`

```js
async function applyBranding(job) {
  const theme = job.tenantConfiguration?.theme ?? {}
  const spToken = await getSharePointAccessToken(hostname)

  try { await uploadSiteLogo(job.graphClient, job.siteId, theme.logoBase64) }
  catch (e) { logger.warn({ err: e.message }, 'logo upload skipped') }

  try { await applySiteTheme(job.siteUrl, spToken, theme.accentColor, theme.pageColor) }
  catch (e) { logger.warn({ err: e.message }, 'theme apply skipped') }

  try { await applyHeaderBackground(job.siteUrl, spToken, theme.backgroundImageUrl) }
  catch (e) { logger.warn({ err: e.message }, 'header background skipped') }
}
```

Each call is independent. Any failure logs a warning and does not block the remaining branding calls or the overall deploy.

---

## Client Changes

### `AppearancePanel.jsx` — Logo field

New section added at the top of the panel (above Site Name):

```
┌─────────────────────────────────────┐
│  LOGO AZIENDALE                     │
│  [img 40×40]  [Carica logo]   [×]  │
│  PNG · JPG · SVG · max 200 KB       │
└─────────────────────────────────────┘
```

- Hidden `<input type="file" accept="image/png,image/jpeg,image/svg+xml">`
- On change: `FileReader.readAsDataURL()` → `dispatch SET_TENANT_META { theme: { ...theme, logoBase64 } }`
- Inline size check: `file.size > 200_000` → show error string, abort
- Preview `<img>` rendered from `theme.logoBase64` when present
- Remove button (×): `dispatch SET_TENANT_META { theme: { ...theme, logoBase64: null } }`

### `CanvasTopNav.jsx` — Logo in canvas preview

When `theme.logoBase64` is set, render a 32×32 `<img>` to the left of the site name in the top nav bar. Provides immediate WYSIWYG feedback in the canvas.

### Data model extension

`tenantConfiguration.theme` gains one optional field:

```js
{
  templateId: 'corporate-classic',
  accentColor: '#0078D4',
  pageColor: '#15140F',
  backgroundImageUrl: 'https://...',
  logoBase64: 'data:image/png;base64,...'   // NEW — null when not set
}
```

`server/src/schemas.js` uses `.passthrough()` on `theme` — no change required. The field is stored in the project DB as part of `canvasState`.

---

## `pageBuilder.js` — Section Emphasis

### Helper added (inline, no imports)

```js
function hexLuminance(hex) {
  // WCAG relative luminance from hex string → [0, 1]
}

function sectionEmphasis(pageColor, sectionIndex) {
  if (!pageColor) return 'none'
  const lum = hexLuminance(pageColor)
  if (lum < 0.35) return sectionIndex % 2 === 1 ? 'soft' : 'none'     // dark theme
  if (lum < 0.65) return sectionIndex % 2 === 1 ? 'neutral' : 'none'  // mid theme
  return 'none'                                                          // light theme
}
```

### `buildCanvasLayout` update

```js
// ctx gains: pageColor (string | null)
const horizontalSections = (page.sections ?? []).map((section, sIdx) => ({
  id: String(sIdx + 1),
  layout: layoutInfo.spLayout,
  emphasis: sectionEmphasis(ctx?.pageColor ?? null, sIdx),   // WAS: 'none'
  columns,
}))
```

### `provisioningJobs.js` — ctx update

```js
buildCanvasLayout(page, {
  siteUrl: job.siteUrl,
  groupId: job.groupId ?? null,
  groupName: siteName,
  pageColor: job.tenantConfiguration?.theme?.pageColor ?? null,  // NEW
})
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Logo > 200KB | Client blocks upload, inline error message |
| Logo upload to Graph fails | Warning logged, provisioning continues |
| ThemeManager API unavailable | Warning logged, provisioning continues |
| Header SetChromeOptions fails | Warning logged, provisioning continues |
| `accentColor`/`pageColor` not set | Branding calls skipped silently |
| `backgroundImageUrl` not set | Header call skipped silently |

---

## Success Criteria

1. After deploy: SP site logo matches the uploaded file in AppearancePanel
2. After deploy: SP site nav/links/buttons use the `accentColor` from the canvas
3. After deploy: SP site header shows the `backgroundImageUrl` from the canvas
4. After deploy: Page sections alternate visual rhythm (`emphasis`) matching the canvas theme darkness
5. Branding step failure does not fail the overall deploy — site is still provisioned
6. Logo preview is visible in the Shareflow canvas top nav bar immediately after upload
7. Existing unit tests for `pageBuilder.js` and `blockToWebpart.js` continue to pass (emphasis change needs test update)
