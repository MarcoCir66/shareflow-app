import crypto from 'node:crypto'
import { isGraphConfigured, getGraphAccessToken } from './msalClient.js'
import { getGraphClient } from './graphClient.js'

const STEP_COUNT = 6
const STEP_DELAY_MS = 900

const jobs = new Map()

function slugify(text) {
  const str = text && typeof text === 'object' ? (text.en ?? text.it ?? Object.values(text)[0] ?? 'site') : text
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'site'
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
    job.status = 'error'
    job.error = err.message
    return
  }

  job.currentStep = step + 1

  if (job.currentStep >= STEP_COUNT) {
    job.status = 'done'
    job.result = {
      siteUrl: job.siteUrl ?? `https://contoso.sharepoint.com/sites/${slugify(job.tenantConfiguration?.siteName ?? 'site')}`,
    }
    return
  }

  job.timer = setTimeout(() => runStep(jobId, job.currentStep), STEP_DELAY_MS)
}

async function createSharePointSite(job) {
  const rawSiteName = job.tenantConfiguration?.siteName
  const siteNameStr = rawSiteName && typeof rawSiteName === 'object' ? (rawSiteName.en ?? rawSiteName.it ?? Object.values(rawSiteName)[0] ?? 'site') : (rawSiteName ?? 'site')
  const mailNickname = slugify(siteNameStr)
  const group = await job.graphClient.api('/groups').post({
    displayName: siteNameStr,
    mailNickname,
    groupTypes: ['Unified'],
    mailEnabled: true,
    securityEnabled: false,
  })
  const site = await job.graphClient.api(`/groups/${group.id}/sites/root`).get()
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
  const rawSiteName = job.tenantConfiguration?.siteName
  const siteNameStr = rawSiteName && typeof rawSiteName === 'object' ? (rawSiteName.en ?? rawSiteName.it ?? Object.values(rawSiteName)[0] ?? 'site') : (rawSiteName ?? 'site')
  await job.graphClient.api(`/sites/${job.siteId}/pages`).version('beta').post({
    '@odata.type': '#microsoft.graph.sitePage',
    name: 'Home.aspx',
    title: siteNameStr,
    pageLayout: 'article',
  })
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
  }
  jobs.set(id, job)
  job.timer = setTimeout(() => runStep(id, 0), STEP_DELAY_MS)
  return job
}

export function getJob(id) {
  return jobs.get(id)
}
