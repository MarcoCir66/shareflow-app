import crypto from 'node:crypto'

const STEP_COUNT = 6
const STEP_DELAY_MS = 900

const jobs = new Map()

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'site'
}

function runStep(jobId, step) {
  const job = jobs.get(jobId)
  if (!job) return

  switch (step) {
    case 0:
      // TODO: MSAL — const token = await msalInstance.acquireTokenSilent({ scopes: ['Sites.FullControl.All'] })
      break
    case 1:
      // TODO: GRAPH — const graphClient = Client.initWithMiddleware({ authProvider })
      break
    case 2:
      // TODO: SP_SITE — await graphClient.api('/sites').post({ displayName: job.tenantConfiguration.siteName, ... })
      break
    case 3:
      // TODO: SP_LISTS — for (const widget of job.tenantConfiguration.widgets) { await provisionList(widget) }
      break
    case 4:
      // TODO: SP_PAGES — await graphClient.api(`/sites/${siteId}/pages`).post(pageLayout)
      break
  }

  job.currentStep = step + 1

  if (job.currentStep >= STEP_COUNT) {
    job.status = 'done'
    job.result = {
      siteUrl: `https://contoso.sharepoint.com/sites/${slugify(job.tenantConfiguration?.siteName ?? 'site')}`,
    }
    return
  }

  job.timer = setTimeout(() => runStep(jobId, job.currentStep), STEP_DELAY_MS)
}

export function createJob(tenantConfiguration) {
  const id = crypto.randomUUID()
  const job = {
    id,
    status: 'running',
    currentStep: 0,
    totalSteps: STEP_COUNT,
    tenantConfiguration,
    result: null,
    timer: null,
  }
  jobs.set(id, job)
  job.timer = setTimeout(() => runStep(id, 0), STEP_DELAY_MS)
  return job
}

export function getJob(id) {
  return jobs.get(id)
}
