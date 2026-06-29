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
