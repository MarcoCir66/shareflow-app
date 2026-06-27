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
          await provisionManualContent(job)
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

function slugifyTitle(title) {
  return String(title ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'news'
}

function toSpDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

async function getOrCreateEventsList(job) {
  try {
    const list = await job.graphClient
      .api(`/sites/${job.siteId}/lists/Events`)
      .version('beta')
      .get()
    return list.id
  } catch {
    const newList = await job.graphClient
      .api(`/sites/${job.siteId}/lists`)
      .version('beta')
      .post({ displayName: 'Events', list: { template: 'events' } })
    return newList.id
  }
}

function isManualWithItems(w) {
  return (
    w.props?.contentSource?.type === 'manual' &&
    Array.isArray(w.props?.contentItems) &&
    w.props.contentItems.length > 0
  )
}

async function provisionManualContent(job) {
  const pages = job.tenantConfiguration?.pages ?? []
  const activePageId = job.tenantConfiguration?.activePageId
  const targetPage = (activePageId && pages.find(p => p.pageId === activePageId)) ?? pages[0] ?? { sections: [] }

  const allWidgets = (targetPage.sections ?? []).flatMap(s =>
    s.columns?.flatMap(c => c.widgets ?? []) ?? []
  )

  // --- News posts ---
  const newsWidgets = allWidgets.filter(w => w.blockId?.startsWith('news-') && isManualWithItems(w))

  for (const widget of newsWidgets) {
    for (const item of widget.props.contentItems) {
      if (!item.title) continue
      try {
        const name = `${slugifyTitle(item.title)}-${Date.now().toString(36)}.aspx`
        // 'newsPost' layout is only valid on communication sites.
        // Group-connected team sites require 'article'; promotedState cannot be set
        // via Graph API beta — news posts appear as plain article pages.
        const body = {
          '@odata.type': '#microsoft.graph.sitePage',
          name,
          title: item.title,
          pageLayout: 'article',
        }
        if (item.body) body.description = item.body
        if (item.imageUrl) body.thumbnailWebUrl = item.imageUrl

        const page = await job.graphClient
          .api(`/sites/${job.siteId}/pages`)
          .version('beta')
          .post(body)

        await job.graphClient
          .api(`/sites/${job.siteId}/pages/${page.id}/microsoft.graph.sitePage/publish`)
          .version('beta')
          .post({})

        logger.info({ blockId: widget.blockId, title: item.title }, 'manual news post created and published')
      } catch (err) {
        logger.warn({ blockId: widget.blockId, title: item.title, err: err.message }, 'manual news post creation failed, skipping')
      }
    }
  }

  // --- Events ---
  const eventsWidgets = allWidgets.filter(w =>
    (w.blockId?.startsWith('eventi-') || w.blockId === 'calendario-eventi') && isManualWithItems(w)
  )

  if (eventsWidgets.length > 0) {
    let eventsListId = null
    try {
      eventsListId = await getOrCreateEventsList(job)
    } catch (err) {
      logger.warn({ err: err.message }, 'events list setup failed, skipping event items')
    }

    if (eventsListId) {
      for (const widget of eventsWidgets) {
        for (const item of widget.props.contentItems) {
          if (!item.title) continue
          try {
            const startDate = toSpDate(item.date) ?? new Date().toISOString()
            const endDate = toSpDate(item.endDate) ?? startDate
            await job.graphClient
              .api(`/sites/${job.siteId}/lists/${eventsListId}/items`)
              .version('beta')
              .post({
                fields: {
                  Title: item.title,
                  EventDate: startDate,
                  EndDate: endDate,
                  Location: item.location ?? '',
                  Description: item.description ?? '',
                  fAllDayEvent: true,
                },
              })
            logger.info({ blockId: widget.blockId, title: item.title }, 'manual event item created')
          } catch (err) {
            logger.warn({ blockId: widget.blockId, title: item.title, err: err.message }, 'manual event item creation failed, skipping')
          }
        }
      }
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
  const { canvasLayout, unmappedBlocks } = buildCanvasLayout(targetPage, {
    siteUrl: job.siteUrl,
    groupId: job.groupId ?? null,
    groupName: resolveSiteName(job.tenantConfiguration?.siteName),
  })
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
