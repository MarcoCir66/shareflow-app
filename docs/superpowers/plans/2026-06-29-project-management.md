# Project Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere gestione progetti persistenti a ShareFlow — dashboard iniziale, CRUD, salvataggio canvas tra sessioni, link SP dopo deploy.

**Architecture:** Server-side SQLite (tabella `projects` nel DB esistente), REST API con auth MSAL, client React con navigazione dashboard ↔ canvas tramite `useState` in `App.jsx`.

**Tech Stack:** Node.js 21+, better-sqlite3, Express, Zod, React 19, Vitest (client), node:test (server)

## Global Constraints

- Server test runner: `node --test src/**/*.test.js` (da `server/`)
- Client test runner: `npx vitest run` (da `client/`)
- User ID: `req.user.oid` dal token MSAL (già estratto da `authMiddleware.js`)
- DB path: `process.env.JOBS_DB_PATH ?? path.join(import.meta.dirname, '..', 'data', 'jobs.db')`
- Naming: camelCase JS ↔ snake_case DB columns
- Stile CSS: Tailwind con classi `ink-*`, `flow-*` già usate nel progetto

---

### Task 1: projectStore.js

**Files:**
- Create: `server/src/projectStore.js`
- Create: `server/src/projectStore.test.js`

**Interfaces:**
- Produces:
  - `createProject(project) → ProjectFull`
  - `getProject(id) → ProjectFull | null`
  - `listProjectsByUser(userId) → ProjectMeta[]`
  - `updateProject(id, fields) → ProjectFull | null`
  - `deleteProject(id) → void`
  - `ProjectFull`: `{ id, userId, name, description, client, status, tags, canvasState, spUrl, createdAt, updatedAt }`
  - `ProjectMeta`: stessa shape ma senza `canvasState`

- [ ] **Step 1: Scrivi i test che falliscono**

```js
// server/src/projectStore.test.js
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
```

- [ ] **Step 2: Verifica che i test falliscano**

```
cd server && node --test src/projectStore.test.js
```

Expected: `Error: Cannot find module './projectStore.js'`

- [ ] **Step 3: Implementa projectStore.js**

```js
// server/src/projectStore.js
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
    id: row.id, name: row.name, description: row.description,
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
  if (fields.canvasState != null)       { sets.push('canvas_state = @canvasState'); params.canvasState = JSON.stringify(fields.canvasState) }
  if (fields.spUrl !== undefined)       { sets.push('sp_url = @spUrl');            params.spUrl = fields.spUrl }
  db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = @id`).run(params)
  return getProject(id)
}

export function deleteProject(id) {
  deleteStmt.run(id)
}
```

- [ ] **Step 4: Esegui i test e verifica che passino**

```
cd server && node --test src/projectStore.test.js
```

Expected: 5 passing

- [ ] **Step 5: Commit**

```bash
git add server/src/projectStore.js server/src/projectStore.test.js
git commit -m "feat: add projectStore — SQLite CRUD for projects"
```

---

### Task 2: projectRoutes.js + wiring in server/index.js

**Files:**
- Create: `server/src/projectRoutes.js`
- Modify: `server/index.js`

**Interfaces:**
- Consumes: `createProject`, `getProject`, `listProjectsByUser`, `updateProject`, `deleteProject` da `./projectStore.js`; `req.user.oid` da `authMiddleware.js`
- Produces: REST routes montate su `/api/projects`

- [ ] **Step 1: Crea projectRoutes.js**

```js
// server/src/projectRoutes.js
import { Router } from 'express'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { createProject, getProject, listProjectsByUser, updateProject, deleteProject } from './projectStore.js'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  client: z.string().nullish(),
  tags: z.array(z.string()).optional().default([]),
  canvas_state: z.record(z.unknown()),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullish(),
  client: z.string().nullish(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  tags: z.array(z.string()).optional(),
  canvas_state: z.record(z.unknown()).optional(),
  sp_url: z.string().url().nullish(),
})

router.get('/', (req, res) => {
  res.json(listProjectsByUser(req.user.oid))
})

router.post('/', (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues })
  const { name, description, client, tags, canvas_state } = parsed.data
  const project = createProject({
    id: randomUUID(), userId: req.user.oid,
    name, description: description ?? null, client: client ?? null,
    tags, canvasState: canvas_state, spUrl: null,
  })
  res.status(201).json(project)
})

router.get('/:id', (req, res) => {
  const project = getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  if (project.userId !== req.user.oid) return res.status(403).json({ error: 'Forbidden' })
  res.json(project)
})

router.put('/:id', (req, res) => {
  const project = getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  if (project.userId !== req.user.oid) return res.status(403).json({ error: 'Forbidden' })
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues })
  const { name, description, client, status, tags, canvas_state, sp_url } = parsed.data
  const updated = updateProject(req.params.id, {
    name, description, client, status, tags,
    canvasState: canvas_state, spUrl: sp_url,
  })
  res.json(updated)
})

router.delete('/:id', (req, res) => {
  const project = getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  if (project.userId !== req.user.oid) return res.status(403).json({ error: 'Forbidden' })
  deleteProject(req.params.id)
  res.status(204).end()
})

export default router
```

- [ ] **Step 2: Aggiungi il mount in server/index.js**

Apri `server/index.js`. Dopo la riga `import provisioningRoutes from './src/provisioningRoutes.js'` aggiungi:

```js
import projectRoutes from './src/projectRoutes.js'
```

Dopo la riga `app.use('/api/provisioning', limiter, requireAuth, provisioningRoutes)` aggiungi:

```js
app.use('/api/projects', limiter, requireAuth, projectRoutes)
```

- [ ] **Step 3: Verifica manuale — avvia server e chiama GET /api/projects**

```
cd server && node index.js
# In altro terminale (con AUTH_DISABLED=true):
AUTH_DISABLED=true node index.js
curl -s http://localhost:3001/api/projects
```

Expected: `[]` (array vuoto, status 200) — se AUTH_DISABLED=true, altrimenti 401

- [ ] **Step 4: Commit**

```bash
git add server/src/projectRoutes.js server/index.js
git commit -m "feat: add projectRoutes — REST CRUD /api/projects"
```

---

### Task 3: LOAD_PROJECT action nel configuratorReducer

**Files:**
- Modify: `client/src/context/configuratorReducer.js`
- Modify: `client/src/context/configuratorReducer.test.js` (aggiungi test in fondo)

**Interfaces:**
- Consumes: niente di nuovo
- Produces: `ACTIONS.LOAD_PROJECT` — rimpiazza pages, activePageId, tenantConfiguration; azzera selectedWidgetInstanceId e selectedSectionId

- [ ] **Step 1: Aggiungi il test in fondo a configuratorReducer.test.js**

```js
// aggiungere in fondo a client/src/context/configuratorReducer.test.js
import { initialState } from './configuratorReducer.js'

test('LOAD_PROJECT replaces canvas state and clears transient selection', () => {
  const stateWithSelection = makeState({ selectedWidgetInstanceId: 'w1', selectedSectionId: 's1' })
  const canvasState = {
    pages: [{ pageId: 'custom', title: { it: 'X', en: 'X', fr: 'X', de: 'X' }, slug: 'x', parentId: null, sections: [] }],
    activePageId: 'custom',
    tenantConfiguration: { ...initialState.tenantConfiguration, siteName: { it: 'Saved', en: 'Saved', fr: 'Saved', de: 'Saved' } },
  }
  const result = configuratorReducer(stateWithSelection, { type: ACTIONS.LOAD_PROJECT, payload: { canvasState } })
  expect(result.pages).toEqual(canvasState.pages)
  expect(result.activePageId).toBe('custom')
  expect(result.tenantConfiguration.siteName).toEqual(canvasState.tenantConfiguration.siteName)
  expect(result.selectedWidgetInstanceId).toBe(null)
  expect(result.selectedSectionId).toBe(null)
})
```

- [ ] **Step 2: Esegui i test per verificare che il nuovo test fallisca**

```
cd client && npx vitest run src/context/configuratorReducer.test.js
```

Expected: ultimo test FAIL con `LOAD_PROJECT` non definito

- [ ] **Step 3: Aggiungi LOAD_PROJECT all'oggetto ACTIONS e al reducer**

In `client/src/context/configuratorReducer.js`, nell'oggetto `ACTIONS` (riga ~10) aggiungi in fondo:

```js
LOAD_PROJECT: 'LOAD_PROJECT',
```

Nel `switch` del reducer, prima del `default`, aggiungi:

```js
case ACTIONS.LOAD_PROJECT:
  return {
    ...action.payload.canvasState,
    selectedWidgetInstanceId: null,
    selectedSectionId: null,
  }
```

- [ ] **Step 4: Esegui i test**

```
cd client && npx vitest run src/context/configuratorReducer.test.js
```

Expected: tutti i test passano

- [ ] **Step 5: Commit**

```bash
git add client/src/context/configuratorReducer.js client/src/context/configuratorReducer.test.js
git commit -m "feat: add LOAD_PROJECT action to configuratorReducer"
```

---

### Task 4: projectsApi.js + useProjects.js

**Files:**
- Create: `client/src/lib/projectsApi.js`
- Create: `client/src/hooks/useProjects.js`

**Interfaces:**
- Consumes: `VITE_API_BASE_URL`, `msalInstance`, `isMsalConfigured`, `loginRequest`; `initialState` da configuratorReducer
- Produces:
  - `projectsApi`: `listProjects()`, `createProject(data)`, `fetchProject(id)`, `updateProject(id, patch)`, `deleteProject(id)`
  - `useProjects()`: `{ projects, loading, error, createProject, updateProject, deleteProject }`

- [ ] **Step 1: Crea client/src/lib/projectsApi.js**

```js
// client/src/lib/projectsApi.js
import { msalInstance, isMsalConfigured } from '../auth/msalInstance.js'
import { loginRequest } from '../auth/msalConfig.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

async function getAuthHeaders() {
  if (!isMsalConfigured) return {}
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  if (!account) return {}
  const result = await msalInstance.acquireTokenSilent({ ...loginRequest, account })
  return { Authorization: `Bearer ${result.idToken}` }
}

export async function listProjects() {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/projects`, { headers })
  if (!res.ok) throw new Error(`listProjects failed (${res.status})`)
  return res.json()
}

export async function createProject(data) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`createProject failed (${res.status})`)
  return res.json()
}

export async function fetchProject(id) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/projects/${id}`, { headers })
  if (!res.ok) throw new Error(`fetchProject failed (${res.status})`)
  return res.json()
}

export async function updateProject(id, patch) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`updateProject failed (${res.status})`)
  return res.json()
}

export async function deleteProject(id) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/projects/${id}`, { method: 'DELETE', headers })
  if (!res.ok) throw new Error(`deleteProject failed (${res.status})`)
}
```

- [ ] **Step 2: Crea client/src/hooks/useProjects.js**

```js
// client/src/hooks/useProjects.js
import { useState, useEffect, useCallback } from 'react'
import { initialState } from '../context/configuratorReducer.js'
import * as projectsApi from '../lib/projectsApi.js'

const DEFAULT_CANVAS = {
  pages: initialState.pages,
  activePageId: initialState.activePageId,
  tenantConfiguration: initialState.tenantConfiguration,
}

export function useProjects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    projectsApi.listProjects()
      .then(data => { setProjects(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const createProject = useCallback(async (meta) => {
    const project = await projectsApi.createProject({
      name: meta.name,
      description: meta.description ?? null,
      client: meta.client ?? null,
      tags: meta.tags ?? [],
      canvas_state: DEFAULT_CANVAS,
    })
    setProjects(prev => [project, ...prev])
    return project
  }, [])

  const updateProject = useCallback(async (id, patch) => {
    const updated = await projectsApi.updateProject(id, patch)
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
    return updated
  }, [])

  const deleteProject = useCallback(async (id) => {
    await projectsApi.deleteProject(id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }, [])

  return { projects, loading, error, createProject, updateProject, deleteProject }
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/lib/projectsApi.js client/src/hooks/useProjects.js
git commit -m "feat: add projectsApi and useProjects hook"
```

---

### Task 5: ProjectFormModal.jsx + ProjectCard.jsx

**Files:**
- Create: `client/src/components/projects/ProjectFormModal.jsx`
- Create: `client/src/components/projects/ProjectCard.jsx`

**Interfaces:**
- `ProjectFormModal` props: `{ mode: 'create'|'edit', project?: ProjectMeta, onSubmit(meta), onClose }`
- `ProjectCard` props: `{ project: ProjectMeta, onOpen(), onEdit(), onDelete() }`

- [ ] **Step 1: Crea client/src/components/projects/ProjectFormModal.jsx**

```jsx
// client/src/components/projects/ProjectFormModal.jsx
import { useState } from 'react'

export default function ProjectFormModal({ mode, project, onSubmit, onClose }) {
  const [name, setName]               = useState(project?.name ?? '')
  const [client, setClient]           = useState(project?.client ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [tags, setTags]               = useState(project?.tags ?? [])
  const [status, setStatus]           = useState(project?.status ?? 'draft')
  const [tagInput, setTagInput]       = useState('')
  const [submitting, setSubmitting]   = useState(false)

  function addTag(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        client: client.trim() || null,
        description: description.trim() || null,
        tags,
        status,
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-ink-800 rounded-2xl border border-ink-700 w-full max-w-md shadow-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold">
          {mode === 'create' ? 'Nuovo progetto' : 'Modifica progetto'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-ink-400 mb-1 block">Nome *</label>
            <input
              required value={name} onChange={e => setName(e.target.value)}
              placeholder="es. Intranet Acme Srl"
              className="w-full bg-ink-900 text-white rounded-lg px-3 py-2 text-sm border border-ink-700 focus:border-flow-400 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-ink-400 mb-1 block">Cliente</label>
            <input
              value={client} onChange={e => setClient(e.target.value)}
              placeholder="es. Acme Srl"
              className="w-full bg-ink-900 text-white rounded-lg px-3 py-2 text-sm border border-ink-700 focus:border-flow-400 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-ink-400 mb-1 block">Descrizione</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="Note, obiettivi..."
              className="w-full bg-ink-900 text-white rounded-lg px-3 py-2 text-sm border border-ink-700 focus:border-flow-400 outline-none resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-ink-400 mb-1 block">Tag (Invio per aggiungere)</label>
            <input
              value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
              placeholder="es. hr"
              className="w-full bg-ink-900 text-white rounded-lg px-3 py-2 text-sm border border-ink-700 focus:border-flow-400 outline-none"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-ink-700 text-ink-200 text-xs px-2 py-0.5 rounded-full">
                    {tag}
                    <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="text-ink-400 hover:text-white leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {mode === 'edit' && (
            <div>
              <label className="text-xs text-ink-400 mb-1 block">Stato</label>
              <select
                value={status} onChange={e => setStatus(e.target.value)}
                className="w-full bg-ink-900 text-white rounded-lg px-3 py-2 text-sm border border-ink-700 focus:border-flow-400 outline-none"
              >
                <option value="draft">Bozza</option>
                <option value="published">Pubblicata</option>
                <option value="archived">Archiviata</option>
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="submit" disabled={submitting || !name.trim()}
              className="flex-1 py-2 rounded-lg bg-flow-400 text-ink-950 font-semibold text-sm hover:bg-flow-600 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Salvataggio...' : mode === 'create' ? 'Crea' : 'Salva'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-ink-700 text-white text-sm hover:bg-ink-600 transition-colors"
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crea client/src/components/projects/ProjectCard.jsx**

```jsx
// client/src/components/projects/ProjectCard.jsx
import { ExternalLink, Pencil, Trash2 } from 'lucide-react'

const STATUS_STYLES = {
  draft:     'bg-ink-700 text-ink-300',
  published: 'bg-green-900/50 text-green-400',
  archived:  'bg-amber-900/50 text-amber-400',
}
const STATUS_LABELS = { draft: 'Bozza', published: 'Pubblicata', archived: 'Archiviata' }

export default function ProjectCard({ project, onOpen, onEdit, onDelete }) {
  const dateStr = new Date(project.updatedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="bg-ink-800 border border-ink-700 rounded-xl p-5 flex flex-col gap-3 hover:border-ink-600 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">{project.name}</h3>
          {project.client && <p className="text-ink-400 text-xs mt-0.5 truncate">{project.client}</p>}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLES[project.status] ?? STATUS_STYLES.draft}`}>
          {STATUS_LABELS[project.status] ?? project.status}
        </span>
      </div>
      {project.description && (
        <p className="text-ink-400 text-xs line-clamp-2">{project.description}</p>
      )}
      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.tags.map(tag => (
            <span key={tag} className="bg-ink-700 text-ink-300 text-xs px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}
      {project.spUrl && (
        <a href={project.spUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-flow-400 hover:underline truncate"
        >
          <ExternalLink size={11} /> Apri in SharePoint
        </a>
      )}
      <p className="text-ink-500 text-xs">Modificata {dateStr}</p>
      <div className="flex gap-2 pt-1">
        <button onClick={onOpen}
          className="flex-1 py-1.5 rounded-lg bg-flow-400 text-ink-950 font-semibold text-xs hover:bg-flow-600 transition-colors"
        >
          Apri
        </button>
        <button onClick={onEdit}
          className="p-2 rounded-lg bg-ink-700 text-ink-300 hover:text-white hover:bg-ink-600 transition-colors"
          aria-label="Modifica"
        >
          <Pencil size={14} />
        </button>
        <button onClick={onDelete}
          className="p-2 rounded-lg bg-ink-700 text-ink-300 hover:text-red-400 hover:bg-ink-600 transition-colors"
          aria-label="Elimina"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/projects/ProjectFormModal.jsx client/src/components/projects/ProjectCard.jsx
git commit -m "feat: add ProjectFormModal and ProjectCard components"
```

---

### Task 6: ProjectDashboard.jsx

**Files:**
- Create: `client/src/components/projects/ProjectDashboard.jsx`

**Interfaces:**
- Consumes: `useProjects`, `projectsApi.fetchProject`, `ProjectCard`, `ProjectFormModal`
- Props: `{ onOpen(projectFull) }` — chiamato con il progetto completo (incluso `canvasState`)

- [ ] **Step 1: Crea client/src/components/projects/ProjectDashboard.jsx**

```jsx
// client/src/components/projects/ProjectDashboard.jsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects.js'
import { fetchProject } from '../../lib/projectsApi.js'
import ProjectCard from './ProjectCard.jsx'
import ProjectFormModal from './ProjectFormModal.jsx'

export default function ProjectDashboard({ onOpen }) {
  const { projects, loading, error, createProject, updateProject, deleteProject } = useProjects()
  const [createOpen, setCreateOpen]  = useState(false)
  const [editTarget, setEditTarget]  = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  async function handleCreate(meta) {
    const project = await createProject(meta)
    const full = await fetchProject(project.id)
    onOpen(full)
  }

  async function handleOpen(id) {
    const full = await fetchProject(id)
    onOpen(full)
  }

  async function handleEdit(meta) {
    await updateProject(editTarget.id, {
      name: meta.name, description: meta.description ?? null,
      client: meta.client ?? null, tags: meta.tags, status: meta.status,
    })
    setEditTarget(null)
  }

  async function handleDelete(id) {
    await deleteProject(id)
    setDeleteTarget(null)
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-ink-950 flex items-center px-6 border-b border-ink-800 gap-3">
        <img src="/favicon.svg" alt="" className="w-8 h-8" />
        <span className="text-white font-semibold text-sm tracking-wide">ShareFlow</span>
      </header>

      <main className="pt-14 max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-white text-2xl font-semibold">I tuoi progetti</h1>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-flow-400 hover:bg-flow-600 text-ink-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> Nuovo progetto
          </button>
        </div>

        {loading && <p className="text-ink-400 text-sm">Caricamento...</p>}
        {error   && <p className="text-red-400 text-sm">Errore: {error}</p>}

        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-24">
            <p className="text-ink-400 text-sm mb-4">Nessun progetto ancora.</p>
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 bg-flow-400 hover:bg-flow-600 text-ink-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} /> Crea il tuo primo progetto
            </button>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => handleOpen(project.id)}
                onEdit={() => setEditTarget(project)}
                onDelete={() => setDeleteTarget(project)}
              />
            ))}
          </div>
        )}
      </main>

      {createOpen && (
        <ProjectFormModal mode="create" onSubmit={handleCreate} onClose={() => setCreateOpen(false)} />
      )}
      {editTarget && (
        <ProjectFormModal mode="edit" project={editTarget} onSubmit={handleEdit} onClose={() => setEditTarget(null)} />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-ink-800 rounded-2xl border border-ink-700 w-full max-w-sm p-6 space-y-4">
            <h2 className="text-white font-semibold">Eliminare il progetto?</h2>
            <p className="text-ink-400 text-sm">
              "{deleteTarget.name}" verrà eliminato definitivamente.
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteTarget.id)}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
              >
                Elimina
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-lg bg-ink-700 text-white text-sm hover:bg-ink-600 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/projects/ProjectDashboard.jsx
git commit -m "feat: add ProjectDashboard component"
```

---

### Task 7: App.jsx + Navbar.jsx + DeployModal.jsx (wiring finale)

**Files:**
- Modify: `client/src/App.jsx`
- Modify: `client/src/components/layout/Navbar.jsx`
- Modify: `client/src/components/deploy/DeployModal.jsx`

**Interfaces:**
- `AppCanvas` riceve: `{ projectId, projectName, onGoToDashboard }`
- `Navbar` riceve: `{ projectName?, saving?, onSave?, onGoToDashboard?, onDeployClick, onAnalyticsClick }`
- `DeployModal` riceve: `{ onClose, onSuccess?(siteUrl) }`

- [ ] **Step 1: Aggiorna DeployModal.jsx — aggiungi prop onSuccess**

In `client/src/components/deploy/DeployModal.jsx`, cambia la firma:

```jsx
export default function DeployModal({ onClose, onSuccess }) {
```

Nel `useEffect` di polling (riga ~73), nel branch `job.status === 'done'`:

```js
if (job.status === 'done') {
  setStatus('done')
  setResult(job.result)
  if (job.result?.siteUrl && onSuccess) {
    onSuccess(job.result.siteUrl).catch(console.error)
  }
}
```

- [ ] **Step 2: Aggiorna Navbar.jsx**

Sostituisci l'intero contenuto di `client/src/components/layout/Navbar.jsx`:

```jsx
import { Eye, LineChart, Save, LayoutDashboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isMsalConfigured } from '../../auth/msalInstance.js'
import AuthSection from './AuthSection.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'

function openPreview() {
  window.open('/?mode=preview', 'shareflow-preview')
}

export default function Navbar({ projectName, saving, onSave, onGoToDashboard, onDeployClick, onAnalyticsClick }) {
  const { t } = useTranslation()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-ink-950 flex items-center justify-between px-6 border-b border-ink-800">
      <div className="flex items-center gap-3">
        <img src="/favicon.svg" alt="" className="w-8 h-8" />
        <div>
          <span className="text-white font-semibold text-sm tracking-wide">ShareFlow</span>
          {projectName && (
            <span className="text-ink-400 text-xs ml-2 hidden md:inline">{projectName}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {onGoToDashboard && (
          <button onClick={onGoToDashboard}
            className="flex items-center gap-2 text-ink-400 hover:text-white border border-ink-700 hover:border-ink-600 text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <LayoutDashboard size={14} />
            Progetti
          </button>
        )}
        {onSave && (
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-2 text-ink-400 hover:text-white border border-ink-700 hover:border-ink-600 text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        )}
        {isMsalConfigured ? <AuthSection /> : (
          <span className="text-xs text-ink-400 bg-ink-800 px-3 py-1 rounded-full border border-ink-700">
            {t('navbar.tenant')}
          </span>
        )}
        <LanguageSwitcher />
        <button onClick={onAnalyticsClick}
          className="flex items-center gap-2 text-ink-400 hover:text-white border border-ink-700 hover:border-ink-800 text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          <LineChart size={14} />
          {t('navbar.analytics')}
        </button>
        <button onClick={openPreview}
          className="flex items-center gap-2 text-ink-400 hover:text-white border border-ink-700 hover:border-ink-800 text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          <Eye size={14} />
          {t('navbar.preview')}
        </button>
        <button onClick={onDeployClick}
          className="flex items-center gap-2 bg-flow-400 hover:bg-flow-600 text-ink-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {t('navbar.deploy')}
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Sostituisci App.jsx**

```jsx
// client/src/App.jsx
import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useConfigurator } from './hooks/useConfigurator.js'
import { usePreviewSync } from './hooks/usePreviewSync.js'
import PreviewApp from './components/preview/PreviewApp.jsx'
import { blockById } from './data/blockCatalog.js'
import { findWidgetLocation, findColumnById } from './context/sectionHelpers.js'
import { findPage } from './context/pageHelpers.js'
import Navbar from './components/layout/Navbar.jsx'
import WorkspaceShell from './components/layout/WorkspaceShell.jsx'
import LeftSidebar from './components/sidebar-left/LeftSidebar.jsx'
import CanvasDropZone from './components/canvas/CanvasDropZone.jsx'
import PropertiesPanel from './components/sidebar-right/PropertiesPanel.jsx'
import DeployModal from './components/deploy/DeployModal.jsx'
import CanvasBlockPreview from './components/canvas/CanvasBlockPreview.jsx'
import AnalyticsView from './components/analytics/AnalyticsView.jsx'
import ProjectDashboard from './components/projects/ProjectDashboard.jsx'
import { updateProject } from './lib/projectsApi.js'

const COLUMN_PREFIX = 'column-'
const IS_PREVIEW = new URLSearchParams(window.location.search).get('mode') === 'preview'

function resolveColumnTarget(overId, sections) {
  if (typeof overId === 'string' && overId.startsWith(COLUMN_PREFIX)) {
    return findColumnById(sections, overId.slice(COLUMN_PREFIX.length))
  }
  return findWidgetLocation(sections, overId)
}

function collisionDetectionStrategy(args) {
  const itemCollisions = closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(c => c.data.current?.type !== 'column'),
  })
  if (itemCollisions.length > 0) return itemCollisions
  return closestCenter(args)
}

function AppCanvas({ projectId, projectName, onGoToDashboard }) {
  const { state, dispatch, ACTIONS } = useConfigurator()
  usePreviewSync(state)
  const [deployOpen, setDeployOpen]     = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [activeDragData, setActiveDragData] = useState(null)
  const [saving, setSaving]             = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const activePage = findPage(state.pages, state.activePageId)

  function handleDragStart({ active }) { setActiveDragData(active.data.current) }

  function handleDragEnd({ active, over }) {
    setActiveDragData(null)
    if (!over) return
    const type = active.data.current?.type
    if (type === 'catalog-block') {
      const target = resolveColumnTarget(over.id, activePage.sections)
      if (!target) return
      dispatch({ type: ACTIONS.ADD_WIDGET, payload: { blockId: active.data.current.blockId, sectionId: target.sectionId, columnId: target.columnId } })
    } else if (type === 'canvas-block' && active.id !== over.id) {
      const activeLocation = findWidgetLocation(activePage.sections, active.id)
      const target = resolveColumnTarget(over.id, activePage.sections)
      if (!activeLocation || !target) return
      if (activeLocation.sectionId !== target.sectionId || activeLocation.columnId !== target.columnId) {
        dispatch({ type: ACTIONS.MOVE_WIDGET, payload: { instanceId: active.id, toSectionId: target.sectionId, toColumnId: target.columnId } })
      } else {
        dispatch({ type: ACTIONS.REORDER_WIDGETS, payload: { activeId: active.id, overId: over.id, sectionId: activeLocation.sectionId, columnId: activeLocation.columnId } })
      }
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateProject(projectId, {
        canvas_state: { pages: state.pages, activePageId: state.activePageId, tenantConfiguration: state.tenantConfiguration },
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeploySuccess(siteUrl) {
    await updateProject(projectId, { sp_url: siteUrl, status: 'published' })
  }

  const overlayBlock = activeDragData?.type === 'catalog-block' ? blockById[activeDragData.blockId] : null

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetectionStrategy} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Navbar
        projectName={projectName}
        saving={saving}
        onSave={handleSave}
        onGoToDashboard={onGoToDashboard}
        onDeployClick={() => setDeployOpen(true)}
        onAnalyticsClick={() => setAnalyticsOpen(true)}
      />
      {analyticsOpen ? (
        <AnalyticsView onClose={() => setAnalyticsOpen(false)} />
      ) : (
        <WorkspaceShell left={<LeftSidebar />} center={<CanvasDropZone />} right={<PropertiesPanel />} />
      )}
      <DragOverlay>
        {overlayBlock && (
          <div className="bg-white border-2 border-flow-600 rounded-lg p-4 w-64 shadow-xl">
            <CanvasBlockPreview block={overlayBlock} />
          </div>
        )}
      </DragOverlay>
      {deployOpen && <DeployModal onClose={() => setDeployOpen(false)} onSuccess={handleDeploySuccess} />}
    </DndContext>
  )
}

function AppRoot() {
  const { dispatch, ACTIONS } = useConfigurator()
  const [activeProject, setActiveProject] = useState(null)

  function handleOpenProject(project) {
    dispatch({ type: ACTIONS.LOAD_PROJECT, payload: { canvasState: project.canvasState } })
    setActiveProject({ id: project.id, name: project.name })
  }

  if (!activeProject) {
    return <ProjectDashboard onOpen={handleOpenProject} />
  }

  return (
    <AppCanvas
      projectId={activeProject.id}
      projectName={activeProject.name}
      onGoToDashboard={() => setActiveProject(null)}
    />
  )
}

export default function App() {
  return IS_PREVIEW ? <PreviewApp /> : <AppRoot />
}
```

- [ ] **Step 4: Esegui i test client per verificare nessuna regressione**

```
cd client && npx vitest run
```

Expected: tutti i test passano

- [ ] **Step 5: Esegui i test server per verificare nessuna regressione**

```
cd server && node --test src/**/*.test.js
```

Expected: tutti i test passano

- [ ] **Step 6: Avvia l'app e verifica il flusso completo**

```
# Terminal 1
cd server && node index.js

# Terminal 2
cd client && npm run dev
```

Verifica:
1. App apre su `ProjectDashboard` (lista vuota)
2. Click "Nuovo progetto" → modal → inserisci nome → click "Crea" → entra nel canvas
3. Navbar mostra nome progetto + bottoni "Salva" e "Progetti"
4. Click "Salva" → nessun errore (con AUTH_DISABLED=true sul server)
5. Click "Progetti" → torna alla dashboard con il progetto nella lista
6. Click "Apri" → rientra nel canvas con lo stesso stato

- [ ] **Step 7: Commit finale**

```bash
git add client/src/App.jsx client/src/components/layout/Navbar.jsx client/src/components/deploy/DeployModal.jsx
git commit -m "feat: wire project management into App — dashboard, canvas routing, save, deploy integration"
```
