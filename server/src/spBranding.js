// hex '#rrggbb' → [r, g, b] each 0–1
function hexToRgb(hex) {
  const raw = (hex || '#ffffff').replace('#', '')
  const h = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw
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

/**
 * Uploads a base64-encoded logo to SiteAssets and sets SiteLogoUrl via SharePoint REST API.
 * Uses the SP token (no Graph/additional permissions required).
 * No-op if siteUrl, spToken, or logoBase64 is falsy.
 */
export async function uploadSiteLogo(siteUrl, spToken, logoBase64) {
  if (!siteUrl || !spToken || !logoBase64) return
  const match = logoBase64.match(/^data:(image\/[^;]+);base64,(.+)$/)
  if (!match) return
  const [, mimeType, b64] = match
  const buffer = Buffer.from(b64, 'base64')
  const ext = mimeType === 'image/svg+xml' ? 'svg' : mimeType === 'image/jpeg' ? 'jpg' : 'png'
  const filename = `shareflow-logo.${ext}`
  const baseUrl = siteUrl.replace(/\/$/, '')

  // Upload binary to SiteAssets library
  const uploadRes = await fetch(
    `${baseUrl}/_api/web/getfolderbyserverrelativeurl('SiteAssets')/files/add(url='${filename}',overwrite=true)`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${spToken}`,
        Accept: 'application/json;odata=verbose',
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(buffer.length),
      },
      body: buffer,
    }
  )
  if (!uploadRes.ok) {
    const text = await uploadRes.text().catch(() => '')
    throw new Error(`SiteAssets upload ${uploadRes.status}: ${text}`)
  }
  const uploadJson = await uploadRes.json()
  const logoUrl = uploadJson.d?.ServerRelativeUrl
  if (!logoUrl) throw new Error('SiteAssets upload: no ServerRelativeUrl in response')

  // Set SiteLogoUrl web property
  const patchRes = await fetch(`${baseUrl}/_api/web`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${spToken}`,
      'Content-Type': 'application/json;odata=verbose',
      Accept: 'application/json;odata=verbose',
      'X-HTTP-Method': 'MERGE',
      'If-Match': '*',
    },
    body: JSON.stringify({ '__metadata': { 'type': 'SP.Web' }, SiteLogoUrl: logoUrl }),
  })
  if (!patchRes.ok && patchRes.status !== 204) {
    const text = await patchRes.text().catch(() => '')
    throw new Error(`set SiteLogoUrl ${patchRes.status}: ${text}`)
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
