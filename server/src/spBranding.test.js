import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateSpPalette, uploadSiteLogo, applySiteTheme, applyHeaderBackground } from './spBranding.js'

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
