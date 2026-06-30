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

  it('white equals pageColor for light themes (SP uses white as page background)', () => {
    const { palette } = generateSpPalette('#0078d4', '#e3e0ce')
    assert.equal(palette.white, '#e3e0ce')
  })

  it('white equals pageColor for dark themes', () => {
    const { palette } = generateSpPalette('#0078d4', '#15140f')
    assert.equal(palette.white, '#15140f')
  })
})

describe('uploadSiteLogo', () => {
  it('returns without fetching when logoBase64 is null', async () => {
    let called = false
    globalThis.fetch = async () => { called = true; return { ok: true } }
    await uploadSiteLogo('https://contoso.sharepoint.com/sites/test', 'token', null)
    assert.ok(!called)
  })

  it('POSTs to SiteAssets then PATCHes web SiteLogoUrl', async () => {
    const calls = []
    globalThis.fetch = async (url, opts) => {
      calls.push({ url, method: opts.method })
      if (url.includes('SiteAssets')) {
        return { ok: true, json: async () => ({ d: { ServerRelativeUrl: '/sites/test/SiteAssets/shareflow-logo.png' } }) }
      }
      return { ok: true, status: 204 }
    }
    await uploadSiteLogo('https://contoso.sharepoint.com/sites/test', 'mytoken', 'data:image/png;base64,iVBORw0KGgo=')
    assert.equal(calls.length, 2)
    assert.ok(calls[0].url.includes('/sites/test/SiteAssets'), `first call should upload to SiteAssets with full path: ${calls[0].url}`)
    assert.equal(calls[0].method, 'POST')
    assert.ok(calls[1].url.includes('/_api/web'), `second call should PATCH web: ${calls[1].url}`)
  })

  it('throws on SiteAssets upload failure', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 403, text: async () => 'Forbidden' })
    await assert.rejects(
      () => uploadSiteLogo('https://contoso.sharepoint.com/sites/test', 'tok', 'data:image/png;base64,iVBORw0KGgo=', 1),
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
    const themeJson = JSON.parse(capturedBody.themeJson)
    assert.equal(themeJson.palette.themePrimary, '#0078d4')
    assert.ok('isInverted' in themeJson)
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
