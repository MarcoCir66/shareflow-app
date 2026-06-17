import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createJobSchema } from './schemas.js'

test('valid tenantConfiguration with string siteName passes', () => {
  const result = createJobSchema.safeParse({ tenantConfiguration: { siteName: 'My Site' } })
  assert.equal(result.success, true)
})

test('valid tenantConfiguration with localized siteName object passes', () => {
  const result = createJobSchema.safeParse({
    tenantConfiguration: { siteName: { it: 'Sito', en: 'Site' } },
  })
  assert.equal(result.success, true)
})

test('missing siteName fails', () => {
  const result = createJobSchema.safeParse({ tenantConfiguration: { widgets: [] } })
  assert.equal(result.success, false)
})

test('passthrough fields such as theme are preserved', () => {
  const input = { tenantConfiguration: { siteName: 'Site', theme: { accentColor: '#fff' } } }
  const result = createJobSchema.safeParse(input)
  assert.equal(result.success, true)
  assert.deepEqual(result.data.tenantConfiguration.theme, { accentColor: '#fff' })
})

test('widgets default to an empty array when omitted', () => {
  const result = createJobSchema.safeParse({ tenantConfiguration: { siteName: 'Site' } })
  assert.deepEqual(result.data.tenantConfiguration.widgets, [])
})

test('missing tenantConfiguration entirely fails', () => {
  const result = createJobSchema.safeParse({})
  assert.equal(result.success, false)
})
