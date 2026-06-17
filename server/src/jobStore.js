import Database from 'better-sqlite3'
import path from 'node:path'
import logger from './logger.js'

const dbPath = process.env.JOBS_DB_PATH ?? path.join(import.meta.dirname, '..', 'data', 'jobs.db')
const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    current_step INTEGER NOT NULL,
    total_steps INTEGER NOT NULL,
    tenant_configuration TEXT NOT NULL,
    result TEXT,
    error TEXT,
    site_id TEXT,
    site_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

const upsertStmt = db.prepare(`
  INSERT INTO jobs (id, status, current_step, total_steps, tenant_configuration, result, error, site_id, site_url, created_at, updated_at)
  VALUES (@id, @status, @currentStep, @totalSteps, @tenantConfiguration, @result, @error, @siteId, @siteUrl, @createdAt, @updatedAt)
  ON CONFLICT(id) DO UPDATE SET
    status = @status, current_step = @currentStep, total_steps = @totalSteps,
    tenant_configuration = @tenantConfiguration, result = @result, error = @error,
    site_id = @siteId, site_url = @siteUrl, updated_at = @updatedAt
`)

const selectStmt = db.prepare('SELECT * FROM jobs WHERE id = ?')

export function persistJob(job) {
  const now = new Date().toISOString()
  upsertStmt.run({
    id: job.id,
    status: job.status,
    currentStep: job.currentStep,
    totalSteps: job.totalSteps,
    tenantConfiguration: JSON.stringify(job.tenantConfiguration),
    result: job.result ? JSON.stringify(job.result) : null,
    error: job.error,
    siteId: job.siteId,
    siteUrl: job.siteUrl,
    createdAt: job.createdAt ?? now,
    updatedAt: now,
  })
}

export function loadJob(id) {
  const row = selectStmt.get(id)
  if (!row) return null
  try {
    return {
      id: row.id,
      status: row.status,
      currentStep: row.current_step,
      totalSteps: row.total_steps,
      tenantConfiguration: JSON.parse(row.tenant_configuration),
      result: row.result ? JSON.parse(row.result) : null,
      error: row.error,
      siteId: row.site_id,
      siteUrl: row.site_url,
    }
  } catch (err) {
    logger.error({ id, err: err.message }, 'failed to parse persisted job row')
    return null
  }
}
