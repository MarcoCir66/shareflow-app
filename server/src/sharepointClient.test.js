import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('createCommunicationSite', () => {
  it('posts to /_api/SPSiteManager/create with correct payload', async () => {
    const calls = []
    // Mock global fetch
    globalThis.fetch = async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body) })
      return {
        ok: true,
        json: async () => ({ d: { Create: { SiteStatus: 2, SiteUrl: 'https://tenant.sharepoint.com/sites/test-site' } } }),
      }
    }

    const { createCommunicationSite } = await import('./sharepointClient.js')
    const result = await createCommunicationSite({
      hostname: 'tenant.sharepoint.com',
      token: 'fake-token',
      title: 'Test Site',
      slug: 'test-site',
      owner: 'admin@tenant.onmicrosoft.com',
    })

    assert.equal(calls.length, 1)
    assert.ok(calls[0].url.includes('/_api/SPSiteManager/create'))
    assert.equal(calls[0].body.request.WebTemplate, 'SITEPAGEPUBLISHING#0')
    assert.equal(calls[0].body.request.Title, 'Test Site')
    assert.equal(result.siteUrl, 'https://tenant.sharepoint.com/sites/test-site')
  })

  it('polls until SiteStatus is 2 when initially 0', async () => {
    let callCount = 0
    // Replace globalThis.fetch — module reads it at call time, no re-import needed
    globalThis.fetch = async () => {
      callCount++
      const status = callCount < 3 ? 0 : 2
      return {
        ok: true,
        json: async () => ({ d: { Create: { SiteStatus: status, SiteUrl: 'https://tenant.sharepoint.com/sites/test' } } }),
      }
    }

    const { createCommunicationSite } = await import('./sharepointClient.js')
    const result = await createCommunicationSite({
      hostname: 'tenant.sharepoint.com',
      token: 'fake-token',
      title: 'Test',
      slug: 'test',
      owner: 'admin@tenant.onmicrosoft.com',
      pollIntervalMs: 10, // fast for tests
    })

    assert.ok(callCount >= 3)
    assert.equal(result.siteUrl, 'https://tenant.sharepoint.com/sites/test')
  })
})
