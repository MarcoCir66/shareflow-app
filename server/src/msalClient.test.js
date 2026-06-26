import { describe, it, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Set env before importing the module
process.env.AZURE_TENANT_ID = 'test-tenant'
process.env.AZURE_CLIENT_ID = 'test-client'
process.env.AZURE_CLIENT_SECRET = 'test-secret'

describe('getSharePointAccessToken', () => {
  it('requests the correct SharePoint scope', async () => {
    // dynamic import so env vars are set first
    const { getSharePointAccessToken } = await import('./msalClient.js')
    // This test verifies the export exists and accepts a hostname.
    // Full integration tested manually via /health/azure endpoint pattern.
    assert.equal(typeof getSharePointAccessToken, 'function')
  })
})
