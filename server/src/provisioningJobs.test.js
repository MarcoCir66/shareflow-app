import os from 'node:os'
import path from 'node:path'
process.env.JOBS_DB_PATH = path.join(os.tmpdir(), `provisioning-jobs-test-${process.pid}.db`)
process.env.PROVISIONING_STEP_DELAY_MS = '5'

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSiteName, createJob, getJob } from './provisioningJobs.js'
import { loadJob } from './jobStore.js'

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

test('createJob returns a running job at step 0 and persists it immediately', () => {
  const job = createJob({ siteName: 'Acme Corp', widgets: [] })
  assert.equal(job.status, 'running')
  assert.equal(job.currentStep, 0)
  assert.equal(job.totalSteps, 6)
  assert.deepEqual(job.tenantConfiguration, { siteName: 'Acme Corp', widgets: [] })
  const persisted = loadJob(job.id)
  assert.equal(persisted.status, 'running')
})

test('a job created without Graph configured reaches done with a generated siteUrl', { timeout: 15000 }, async () => {
  const job = createJob({ siteName: 'Acme Corp', widgets: [] })
  await new Promise(resolve => {
    const interval = setInterval(() => {
      if (getJob(job.id).status !== 'running') {
        clearInterval(interval)
        resolve()
      }
    }, 5)
  })
  const finished = getJob(job.id)
  assert.equal(finished.status, 'done')
  assert.equal(finished.result.siteUrl, 'https://contoso.sharepoint.com/sites/acme-corp')
})

test('getJob returns the in-memory job while it is still active', () => {
  const job = createJob({ siteName: 'Live Co', widgets: [] })
  assert.equal(getJob(job.id), job)
})

// Appending a unique query string forces Node's ESM loader to evaluate a fresh
// module instance (fresh `jobs` Map), while the unchanged `./jobStore.js` import
// inside it still resolves to the already-loaded singleton (same SQLite
// connection) — this simulates "a different server process" without needing to
// spawn one, exercising getJob's real post-restart fallback to loadJob.
test('getJob falls back to loadJob (SQLite) when the in-memory map does not have the job', { timeout: 2000 }, async () => {
  const job = createJob({ siteName: 'Restart Co', widgets: [] })
  const fresh = await import(`./provisioningJobs.js?fresh=${Date.now()}`)
  const recovered = fresh.getJob(job.id)
  assert.ok(recovered, 'expected the job to be recoverable from SQLite after the in-memory map is reset')
  assert.equal(recovered.tenantConfiguration.siteName, 'Restart Co')
  assert.equal(recovered.status, 'running')
})
