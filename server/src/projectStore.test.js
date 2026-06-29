import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projectstore-test-'))
process.env.JOBS_DB_PATH = path.join(tmpDir, 'test.db')

const { createProject, getProject, listProjectsByUser, updateProject, deleteProject } = await import('./projectStore.js')

const CANVAS = { pages: [], activePageId: null, tenantConfiguration: { siteName: { it: 'T' } } }

test('createProject then getProject round-trips all fields', () => {
  const p = createProject({ id: 'p1', userId: 'u1', name: 'Proj', description: 'Desc', client: 'Acme', status: 'draft', tags: ['hr'], canvasState: CANVAS, spUrl: null })
  assert.equal(p.id, 'p1')
  assert.equal(p.userId, 'u1')
  assert.equal(p.name, 'Proj')
  assert.equal(p.client, 'Acme')
  assert.deepEqual(p.tags, ['hr'])
  assert.deepEqual(p.canvasState, CANVAS)
  assert.equal(p.spUrl, null)
  const loaded = getProject('p1')
  assert.deepEqual(loaded, p)
})

test('listProjectsByUser returns only that user projects, without canvasState', () => {
  createProject({ id: 'p2', userId: 'u1', name: 'P2', description: null, client: null, status: 'draft', tags: [], canvasState: CANVAS, spUrl: null })
  createProject({ id: 'p3', userId: 'u2', name: 'P3', description: null, client: null, status: 'draft', tags: [], canvasState: CANVAS, spUrl: null })
  const list = listProjectsByUser('u1')
  assert.ok(list.some(p => p.id === 'p2'))
  assert.ok(list.every(p => p.id !== 'p3'))
  assert.ok(list.every(p => !('canvasState' in p)), 'list must not include canvasState')
})

test('updateProject patches only specified fields', () => {
  createProject({ id: 'pu', userId: 'u1', name: 'Old', description: null, client: null, status: 'draft', tags: [], canvasState: CANVAS, spUrl: null })
  updateProject('pu', { name: 'New', status: 'published', spUrl: 'https://x.sharepoint.com' })
  const loaded = getProject('pu')
  assert.equal(loaded.name, 'New')
  assert.equal(loaded.status, 'published')
  assert.equal(loaded.spUrl, 'https://x.sharepoint.com')
})

test('deleteProject removes row; getProject returns null', () => {
  createProject({ id: 'pd', userId: 'u1', name: 'Del', description: null, client: null, status: 'draft', tags: [], canvasState: CANVAS, spUrl: null })
  deleteProject('pd')
  assert.equal(getProject('pd'), null)
})

test('getProject returns null for unknown id', () => {
  assert.equal(getProject('nope'), null)
})
