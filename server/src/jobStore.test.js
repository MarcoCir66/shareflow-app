import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobstore-test-'))
process.env.JOBS_DB_PATH = path.join(tmpDir, 'jobs.db')

const { persistJob, loadJob } = await import('./jobStore.js')

test('persistJob then loadJob round-trips all fields', () => {
  const job = {
    id: 'abc-123',
    status: 'running',
    currentStep: 2,
    totalSteps: 6,
    tenantConfiguration: { siteName: 'Test Site', widgets: [] },
    result: null,
    error: null,
    siteId: null,
    siteUrl: null,
    createdAt: new Date().toISOString(),
  }
  persistJob(job)
  const loaded = loadJob('abc-123')
  assert.equal(loaded.id, 'abc-123')
  assert.equal(loaded.status, 'running')
  assert.equal(loaded.currentStep, 2)
  assert.equal(loaded.totalSteps, 6)
  assert.deepEqual(loaded.tenantConfiguration, { siteName: 'Test Site', widgets: [] })
  assert.equal(loaded.result, null)
  assert.equal(loaded.siteUrl, null)
})

test('persistJob upserts — calling it twice updates the same row', () => {
  const job = {
    id: 'abc-456',
    status: 'running',
    currentStep: 0,
    totalSteps: 6,
    tenantConfiguration: { siteName: 'Site Two' },
    result: null,
    error: null,
    siteId: null,
    siteUrl: null,
    createdAt: new Date().toISOString(),
  }
  persistJob(job)
  persistJob({ ...job, status: 'done', currentStep: 6, result: { siteUrl: 'https://example.com' } })
  const loaded = loadJob('abc-456')
  assert.equal(loaded.status, 'done')
  assert.equal(loaded.currentStep, 6)
  assert.deepEqual(loaded.result, { siteUrl: 'https://example.com' })
})

test('loadJob returns null for an unknown id', () => {
  assert.equal(loadJob('does-not-exist'), null)
})
