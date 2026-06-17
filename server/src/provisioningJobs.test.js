import os from 'node:os'
import path from 'node:path'
process.env.JOBS_DB_PATH = path.join(os.tmpdir(), `provisioning-jobs-test-${process.pid}.db`)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSiteName } from './provisioningJobs.js'

test('string input is returned as-is', () => {
  assert.equal(resolveSiteName('My Site'), 'My Site')
})

test('object input prefers en', () => {
  assert.equal(resolveSiteName({ it: 'Sito', en: 'Site' }), 'Site')
})

test('object input falls back to it when en is missing', () => {
  assert.equal(resolveSiteName({ it: 'Sito', fr: 'Site FR' }), 'Sito')
})

test('object input falls back to first value when neither en nor it present', () => {
  assert.equal(resolveSiteName({ de: 'Standort' }), 'Standort')
})

test('null or undefined input returns "site"', () => {
  assert.equal(resolveSiteName(null), 'site')
  assert.equal(resolveSiteName(undefined), 'site')
})
