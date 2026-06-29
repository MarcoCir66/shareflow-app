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
  if (!updated) return res.status(404).json({ error: 'Project not found' })
  const { canvasState: _cs, ...meta } = updated
  res.json(meta)
})

router.delete('/:id', (req, res) => {
  const project = getProject(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  if (project.userId !== req.user.oid) return res.status(403).json({ error: 'Forbidden' })
  deleteProject(req.params.id)
  res.status(204).end()
})

export default router
