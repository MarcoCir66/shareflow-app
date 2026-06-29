import Database from 'better-sqlite3'
import path from 'node:path'

const dbPath = process.env.JOBS_DB_PATH ?? path.join(import.meta.dirname, '..', 'data', 'jobs.db')
const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT,
    client       TEXT,
    status       TEXT NOT NULL DEFAULT 'draft',
    tags         TEXT NOT NULL DEFAULT '[]',
    canvas_state TEXT NOT NULL,
    sp_url       TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  )
`)

const insertStmt = db.prepare(`
  INSERT INTO projects (id, user_id, name, description, client, status, tags, canvas_state, sp_url, created_at, updated_at)
  VALUES (@id, @userId, @name, @description, @client, @status, @tags, @canvasState, @spUrl, @createdAt, @updatedAt)
`)
const selectStmt = db.prepare('SELECT * FROM projects WHERE id = ?')
const listStmt   = db.prepare('SELECT id, user_id, name, description, client, status, tags, sp_url, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC')
const deleteStmt = db.prepare('DELETE FROM projects WHERE id = ?')

function toFull(row) {
  return {
    id: row.id, userId: row.user_id, name: row.name,
    description: row.description, client: row.client, status: row.status,
    tags: JSON.parse(row.tags), canvasState: JSON.parse(row.canvas_state),
    spUrl: row.sp_url, createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

function toMeta(row) {
  return {
    id: row.id, userId: row.user_id, name: row.name, description: row.description,
    client: row.client, status: row.status, tags: JSON.parse(row.tags),
    spUrl: row.sp_url, createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

export function createProject(project) {
  const now = new Date().toISOString()
  insertStmt.run({
    id: project.id, userId: project.userId, name: project.name,
    description: project.description ?? null, client: project.client ?? null,
    status: project.status ?? 'draft', tags: JSON.stringify(project.tags ?? []),
    canvasState: JSON.stringify(project.canvasState), spUrl: project.spUrl ?? null,
    createdAt: now, updatedAt: now,
  })
  return getProject(project.id)
}

export function getProject(id) {
  const row = selectStmt.get(id)
  return row ? toFull(row) : null
}

export function listProjectsByUser(userId) {
  return listStmt.all(userId).map(toMeta)
}

export function updateProject(id, fields) {
  const row = selectStmt.get(id)
  if (!row) return null
  const now = new Date().toISOString()
  const sets = ['updated_at = @updatedAt']
  const params = { id, updatedAt: now }
  if (fields.name !== undefined)        { sets.push('name = @name');               params.name = fields.name }
  if (fields.description !== undefined) { sets.push('description = @description'); params.description = fields.description }
  if (fields.client !== undefined)      { sets.push('client = @client');           params.client = fields.client }
  if (fields.status !== undefined)      { sets.push('status = @status');           params.status = fields.status }
  if (fields.tags !== undefined)        { sets.push('tags = @tags');               params.tags = JSON.stringify(fields.tags) }
  if (fields.canvasState !== undefined)  { sets.push('canvas_state = @canvasState'); params.canvasState = JSON.stringify(fields.canvasState) }
  if (fields.spUrl !== undefined)       { sets.push('sp_url = @spUrl');            params.spUrl = fields.spUrl }
  db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = @id`).run(params)
  return getProject(id)
}

export function deleteProject(id) {
  deleteStmt.run(id)
}
