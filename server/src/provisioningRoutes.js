import { Router } from 'express'
import { createJob, getJob } from './provisioningJobs.js'

const router = Router()

router.post('/jobs', (req, res) => {
  const { tenantConfiguration } = req.body ?? {}
  if (!tenantConfiguration?.siteName) {
    return res.status(400).json({ error: 'tenantConfiguration.siteName is required' })
  }

  const job = createJob(tenantConfiguration)
  res.status(201).json({ jobId: job.id, totalSteps: job.totalSteps })
})

router.get('/jobs/:jobId', (req, res) => {
  const job = getJob(req.params.jobId)
  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }

  res.json({
    jobId: job.id,
    status: job.status,
    currentStep: job.currentStep,
    totalSteps: job.totalSteps,
    result: job.result,
  })
})

export default router
