import crypto from 'node:crypto'
import { isGraphConfigured, getGraphAccessToken, getSharePointAccessToken } from './msalClient.js'
import { getGraphClient } from './graphClient.js'
import { buildCanvasLayout } from './pageBuilder.js'
import { setTopNavigation, createCommunicationSite } from './sharepointClient.js'
import { persistJob, loadJob } from './jobStore.js'
import logger from './logger.js'

const STEP_COUNT = 7
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
      case 6:
        // Building site navigation
        if (isGraphConfigured()) {
          await buildNavigation(job)
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

async function createSharePointSite(job) {
  const hostname = requireEnv('SHAREPOINT_HOSTNAME')
  const owner = requireEnv('SHAREPOINT_SITE_OWNER')
  const siteNameStr = resolveSiteName(job.tenantConfiguration?.siteName)
  const slug = `shareflow-${slugify(siteNameStr)}-${Date.now().toString(36)}`

  const token = await getSharePointAccessToken(hostname)
  const { siteUrl } = await createCommunicationSite({ hostname, token, title: siteNameStr, slug, owner })
  job.siteUrl = siteUrl

  // Resolve Graph siteId from the Communication Site URL
  const urlPath = new URL(siteUrl).pathname
  const site = await job.graphClient.api(`/sites/${hostname}:${urlPath}`).get()
  job.siteId = site.id
  // Communication Sites have no M365 Group — job.groupId remains null
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

function pageSpFilename(page, activePageId) {
  if (page.pageId === activePageId) return 'Home.aspx'
  const s = page.slug ?? 'pagina'
  return s.charAt(0).toUpperCase() + s.slice(1) + '.aspx'
}

async function configurePages(job) {
  const pages = job.tenantConfiguration?.pages ?? []
  const activePageId = job.tenantConfiguration?.activePageId
  if (pages.length === 0) return

  const siteName = resolveSiteName(job.tenantConfiguration?.siteName)

  let pagesList
  try {
    pagesList = await job.graphClient.api(`/sites/${job.siteId}/pages`).get()
  } catch {
    pagesList = { value: [] }
  }
  const existingByName = new Map(
    (pagesList.value ?? []).map(p => [p.name?.toLowerCase(), p])
  )

  for (const page of pages) {
    const spName = pageSpFilename(page, activePageId)
    const titleStr = resolveSiteName(page.title) || siteName
    const { canvasLayout, unmappedBlocks } = buildCanvasLayout(page, {
      siteUrl: job.siteUrl,
      groupId: job.groupId ?? null,
      groupName: siteName,
    })
    logger.info({ spName, sections: canvasLayout.horizontalSections?.length, unmappedBlocks }, 'canvasLayout built')

    const existing = existingByName.get(spName.toLowerCase())
    if (existing) {
      logger.info({ existingPageId: existing.id, spName }, 'deleting existing page')
      await job.graphClient.api(`/sites/${job.siteId}/pages/${existing.id}`).version('beta').delete()
    }

    const created = await job.graphClient
      .api(`/sites/${job.siteId}/pages`)
      .version('beta')
      .post({
        '@odata.type': '#microsoft.graph.sitePage',
        name: spName,
        title: titleStr,
        pageLayout: 'article',
        canvasLayout,
      })
    logger.info({ createdPageId: created?.id, spName }, 'created page')

    // Publish immediately — unpublished (draft) pages are rejected by SP REST nav write
    await job.graphClient
      .api(`/sites/${job.siteId}/pages/${created.id}/microsoft.graph.sitePage/publish`)
      .version('beta')
      .post({})
    logger.info({ spName }, 'published page')

    if (page.pageId === activePageId) job.pageId = created.id
  }
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

async function buildNavigation(job) {
  if (!job.siteUrl) return
  const navNodes = job.tenantConfiguration?.navigation ?? []
  if (navNodes.length === 0) { logger.info('no navigation nodes to provision, skipping'); return }

  const hostname = new URL(job.siteUrl).hostname
  const token = await getSharePointAccessToken(hostname)
  const activePageId = job.tenantConfiguration?.activePageId

  // Map each nav node to the SP slug that matches its deployed .aspx filename.
  // Active page → 'Home' (Home.aspx); others → their ShareFlow slug.
  // SP Quick Launch supports max 2 levels: children of children are dropped.
  function toSpNode(node, depth = 0) {
    const spSlug = node.pageId === activePageId ? 'Home' : (node.slug ?? node.pageId)
    const children = depth === 0
      ? (node.children ?? []).map(c => toSpNode(c, 1))
      : []
    return { ...node, slug: spSlug, children }
  }

  const spNavNodes = navNodes.map(n => toSpNode(n, 0))

  const result = await setTopNavigation(job.siteUrl, token, spNavNodes)
  if (result?.skipped) {
    logger.warn({ reason: result.reason }, 'site navigation skipped — certificate-based auth required for SP REST navigation writes')
  } else {
    logger.info({ nodeCount: spNavNodes.length }, 'site navigation built')
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
