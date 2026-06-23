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
