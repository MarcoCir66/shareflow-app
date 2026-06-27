import crypto from 'node:crypto'
import { isGraphConfigured, getGraphAccessToken } from './msalClient.js'
import { getGraphClient } from './graphClient.js'
import { buildCanvasLayout } from './pageBuilder.js'
import { persistJob, loadJob } from './jobStore.js'
import logger from './logger.js'

const STEP_COUNT = 6
const STEP_DELAY_MS = Number(process.env.PROVISIONING_STEP_DELAY_MS ?? 900)

const jobs = new Map()

function requireEnv(name) {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required environment variable: ${name}`)
  return val
}

export function resolveSiteName(siteName, preferLang = 'it') {
  const value = siteName && typeof siteName === 'object'
    ? (siteName[preferLang] ?? siteName.en ?? siteName.it ?? Object.values(siteName)[0] ?? 'site')
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
        // Creating SharePoint Team Site via Microsoft 365 Group
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
      case 5:
        // Publishing page
        if (isGraphConfigured()) {
          await publishPage(job)
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
      pagesDeployed: 1,
    }
    logger.info({ jobId, siteUrl: job.result.siteUrl }, 'provisioning completed')
    persistJob(job)
    return
  }

  persistJob(job)
  job.timer = setTimeout(() => runStep(jobId, job.currentStep), STEP_DELAY_MS)
}

async function waitForGroupSite(graphClient, groupId, { maxAttempts = 12, intervalMs = 10000 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await graphClient.api(`/groups/${groupId}/sites/root`).get()
    } catch {
      if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, intervalMs))
    }
  }
  throw new Error(`SharePoint site not provisioned after ${maxAttempts} attempts for group ${groupId}`)
}

async function createSharePointSite(job) {
  const owner = requireEnv('SHAREPOINT_SITE_OWNER')
  const siteNameStr = resolveSiteName(job.tenantConfiguration?.siteName)
  const mailNickname = `shareflow-${slugify(siteNameStr)}-${Date.now().toString(36)}`

  const group = await job.graphClient.api('/groups').post({
    displayName: siteNameStr,
    mailNickname,
    mailEnabled: true,
    securityEnabled: false,
    groupTypes: ['Unified'],
    visibility: 'Private',
    'owners@odata.bind': [`https://graph.microsoft.com/v1.0/users/${owner}`],
    'members@odata.bind': [`https://graph.microsoft.com/v1.0/users/${owner}`],
  })

  job.groupId = group.id

  const site = await waitForGroupSite(job.graphClient, group.id)
  job.siteUrl = site.webUrl
  job.siteId = site.id
}

async function provisionLists(job) {
  const pages = job.tenantConfiguration?.pages ?? []
  const allWidgets = pages.flatMap(p =>
    p.sections?.flatMap(s =>
      s.columns?.flatMap(c => c.widgets ?? []) ?? []
    ) ?? []
  )
  const listBlocks = allWidgets.filter(w => w.dataSource?.type === 'sharepoint-list' && w.dataSource?.url)

  for (const widget of listBlocks) {
    try {
      await job.graphClient.api(`/sites/${job.siteId}/lists`).post({
        displayName: widget.blockId,
        list: { template: 'genericList' },
      })
    } catch (err) {
      // List may already exist — log and continue
      logger.warn({ blockId: widget.blockId, err: err.message }, 'list creation skipped')
    }
  }
}

async function configurePages(job) {
  const pages = job.tenantConfiguration?.pages ?? []
  const activePageId = job.tenantConfiguration?.activePageId
  const targetPage = (activePageId && pages.find(p => p.pageId === activePageId)) ?? pages[0] ?? { sections: [], title: {} }

  if (pages.length > 1) {
    logger.warn({ totalPages: pages.length, deployingPageId: targetPage.pageId }, 'Phase 1: only the active page is deployed to SharePoint; additional pages are skipped')
  }

  const pageTitleStr = resolveSiteName(targetPage.title) || resolveSiteName(job.tenantConfiguration?.siteName)
  const { canvasLayout, unmappedBlocks } = buildCanvasLayout(targetPage)
  logger.info({ sections: canvasLayout.horizontalSections?.length, unmappedBlocks }, 'canvasLayout built')

  // Find or create Home.aspx
  let pagesList
  try {
    pagesList = await job.graphClient.api(`/sites/${job.siteId}/pages`).get()
  } catch {
    pagesList = { value: [] }
  }
  const existing = pagesList.value?.find(p => p.name === 'Home.aspx')

  // If a "home" layout page exists, delete it so we can create a clean article page.
  // pageLayout:"home" (Team Site default) does not render canvasLayout sections beyond section 1.
  if (existing) {
    logger.info({ existingPageId: existing.id }, 'deleting existing home-layout page')
    await job.graphClient.api(`/sites/${job.siteId}/pages/${existing.id}`).version('beta').delete()
  }

  const created = await job.graphClient
    .api(`/sites/${job.siteId}/pages`)
    .version('beta')
    .post({
      '@odata.type': '#microsoft.graph.sitePage',
      name: 'Home.aspx',
      title: pageTitleStr,
      pageLayout: 'article',
      canvasLayout,
    })
  logger.info({ createdPageId: created?.id, pageLayout: created?.pageLayout }, 'created article page')
  job.pageId = created.id
}

async function publishPage(job) {
  if (!job.pageId) return
  logger.info({ pageId: job.pageId }, 'publishing page')
  const publishResult = await job.graphClient
    .api(`/sites/${job.siteId}/pages/${job.pageId}/microsoft.graph.sitePage/publish`)
    .version('beta')
    .post({})
  logger.info({ publishResult: JSON.stringify(publishResult) }, 'publish result')
  // Verify published state
  const afterPublish = await job.graphClient
    .api(`/sites/${job.siteId}/pages/${job.pageId}/microsoft.graph.sitePage?$expand=canvasLayout`)
    .version('beta')
    .get()
  logger.info({ publishedSections: afterPublish?.canvasLayout?.horizontalSections?.length, publishingState: afterPublish?.publishingState?.level }, 'page after publish')
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
    groupId: null,
    siteId: null,
    siteUrl: null,
    pageId: null,
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
