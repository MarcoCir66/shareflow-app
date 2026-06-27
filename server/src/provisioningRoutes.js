import { Router } from 'express'
import { createJob, getJob } from './provisioningJobs.js'
import { createJobSchema } from './schemas.js'
import { buildCanvasLayout } from './pageBuilder.js'

const router = Router()

router.post('/jobs', (req, res) => {
  const parsed = createJobSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues })
  }
  const job = createJob(parsed.data.tenantConfiguration)
  res.status(201).json({ jobId: job.id, totalSteps: job.totalSteps })
})

router.get('/jobs/:jobId', (req, res) => {
  const job = getJob(req.params.jobId)
  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }
  res.json({
    jobId: job.id, status: job.status, currentStep: job.currentStep,
    totalSteps: job.totalSteps, result: job.result, error: job.error,
  })
})

router.post('/validate', (req, res) => {
  const parsed = createJobSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues })
  }
  const tc = parsed.data.tenantConfiguration
  const pages = tc.pages ?? []
  const activePage = (tc.activePageId && pages.find(p => p.pageId === tc.activePageId)) ?? pages[0] ?? { sections: [] }
  const { unmappedBlocks } = buildCanvasLayout(activePage)
  res.json({ unmappedBlocks: unmappedBlocks.map(blockId => ({ blockId })) })
})

export default router
