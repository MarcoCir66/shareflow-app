import crypto from 'node:crypto'
import { isGraphConfigured, getGraphAccessToken } from './msalClient.js'
import { getGraphClient } from './graphClient.js'
import { persistJob, loadJob } from './jobStore.js'
import logger from './logger.js'

const STEP_COUNT = 6
const STEP_DELAY_MS = Number(process.env.PROVISIONING_STEP_DELAY_MS ?? 900)

const jobs = new Map()

export function resolveSiteName(siteName) {
  const value = siteName && typeof siteName === 'object'
    ? (siteName.en ?? siteName.it ?? Object.values(siteName)[0] ?? 'site')
    : (siteName ?? 'site')
  return String(value)
}

function slugify(text) {
  const str = resolveSiteName(text)
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'site'
}

async function runStep(jobId, step) {
  const job = jobs.get(jobId)
  if (!job) return

  try {
    switch (step) {
      case 0:
        // Authenticating via MSAL
        if (isGraphConfigured()) {
          await getGraphAccessToken()
        }
        break
      case 1:
        // Connecting to Microsoft Graph API
        if (isGraphConfigured()) {
          job.graphClient = await getGraphClient()
        }
        break
      case 2:
        // Creating SharePoint Communication Site
        if (isGraphConfigured()) {
          await createSharePointSite(job)
        }
        break
      case 3:
        // Provisioning Lists & Content Types
        if (isGraphConfigured()) {
          await provisionLists(job)
        }
        break
      case 4:
        // Configuring Pages & Webparts
        if (isGraphConfigured()) {
          await configurePages(job)
        }
        break
    }
  } catch (err) {
    logger.error({ jobId, step, err: err.message }, 'provisioning step failed')
    job.status = 'error'
    job.error = err.message
    persistJob(job)
    return
  }

  job.currentStep = step + 1

  if (job.currentStep >= STEP_COUNT) {
    job.status = 'done'
    job.result = {
      siteUrl: job.siteUrl ?? `https://contoso.sharepoint.com/sites/${slugify(job.tenantConfiguration?.siteName)}`,
    }
    logger.info({ jobId, siteUrl: job.result.siteUrl }, 'provisioning completed')
    persistJob(job)
    return
  }

  persistJob(job)
  job.timer = setTimeout(() => runStep(jobId, job.currentStep), STEP_DELAY_MS)
}

async function createSharePointSite(job) {
  const siteNameStr = resolveSiteName(job.tenantConfiguration?.siteName)
  const mailNickname = `${slugify(siteNameStr)}-${Date.now().toString(36)}`
  const group = await job.graphClient.api('/groups').post({
    displayName: siteNameStr,
    mailNickname,
    groupTypes: ['Unified'],
    mailEnabled: true,
    securityEnabled: false,
  })
  // SharePoint site provisioning is async — poll until available (up to 60s)
  let site = null
  for (let attempt = 0; attempt < 12; attempt++) {
    await new Promise(r => setTimeout(r, 5000))
    try {
      site = await job.graphClient.api(`/groups/${group.id}/sites/root`).get()
      break
    } catch {
      logger.info({ groupId: group.id, attempt }, 'site not yet provisioned, retrying...')
    }
  }
  if (!site) throw new Error('SharePoint site provisioning timed out after 60s')
  job.siteId = site.id
  job.siteUrl = site.webUrl
}

async function provisionLists(job) {
  const widgets = job.tenantConfiguration?.widgets ?? []
  for (const widget of widgets) {
    await job.graphClient.api(`/sites/${job.siteId}/lists`).post({
      displayName: widget.blockId,
      list: { template: 'genericList' },
    })
  }
}

async function configurePages(job) {
  const siteNameStr = resolveSiteName(job.tenantConfiguration?.siteName)
  let pages
  try {
    pages = await job.graphClient.api(`/sites/${job.siteId}/pages`).get()
  } catch {
    pages = { value: [] }
  }
  const existing = pages.value?.find(p => p.name === 'Home.aspx')
  if (existing) {
    await job.graphClient.api(`/sites/${job.siteId}/pages/${existing.id}/microsoft.graph.sitePage`).patch({
      title: siteNameStr,
    })
  } else {
    await job.graphClient.api(`/sites/${job.siteId}/pages`).post({
      '@odata.type': '#microsoft.graph.sitePage',
      name: 'Home.aspx',
      title: siteNameStr,
      pageLayout: 'article',
    })
  }
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
    error: null,
    siteId: null,
    siteUrl: null,
    graphClient: null,
    timer: null,
    createdAt: new Date().toISOString(),
  }
  jobs.set(id, job)
  persistJob(job)
  job.timer = setTimeout(() => runStep(id, 0), STEP_DELAY_MS)
  return job
}

export function getJob(id) {
  return jobs.get(id) ?? loadJob(id)
}
