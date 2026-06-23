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
