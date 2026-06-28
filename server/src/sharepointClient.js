import logger from './logger.js'

/**
 * Clears the top navigation bar of a SharePoint site and replaces it with
 * the provided nav nodes (2-level max: root + children).
 *
 * @param {string} siteUrl - full SP site URL, e.g. https://contoso.sharepoint.com/sites/mysite
 * @param {string} token   - SharePoint-scoped bearer token
 * @param {Array}  navNodes - [{ title, slug, children: [{ title, slug }] }]
 * @param {string} preferLang - language key for localized titles
 */
export async function setTopNavigation(siteUrl, token, navNodes, preferLang = 'it') {
  function resolveTitle(title) {
    if (!title || typeof title === 'string') return title ?? 'Page'
    return title[preferLang] ?? title.en ?? title.it ?? Object.values(title)[0] ?? 'Page'
  }

  const baseUrl = siteUrl.replace(/\/$/, '')
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json;odata=verbose',
    Accept: 'application/json;odata=verbose',
  }

  // Clear existing top nav nodes
  const listRes = await fetch(`${baseUrl}/_api/web/navigation/topnavigationbar`, { headers })
  if (listRes.ok) {
    const listData = await listRes.json()
    const existing = listData?.d?.results ?? []
    for (const n of existing) {
      const delRes = await fetch(
        `${baseUrl}/_api/web/navigation/topnavigationbar/GetById(${n.Id})`,
        { method: 'DELETE', headers }
      )
      if (!delRes.ok) logger.warn({ nodeId: n.Id }, 'failed to delete existing nav node')
    }
  }

  // Add new nav nodes
  for (const navNode of navNodes) {
    const title = resolveTitle(navNode.title)
    const url = `${baseUrl}/SitePages/${navNode.slug}.aspx`

    const addRes = await fetch(`${baseUrl}/_api/web/navigation/topnavigationbar`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        __metadata: { type: 'SP.NavigationNode' },
        IsExternal: false,
        Title: title,
        Url: url,
      }),
    })

    if (!addRes.ok) {
      const errText = await addRes.text().catch(() => '')
      logger.warn({ title, url, status: addRes.status, err: errText }, 'failed to add top nav node')
      continue
    }

    if (navNode.children?.length > 0) {
      const nodeData = await addRes.json()
      const nodeId = nodeData?.d?.Id
      if (nodeId) {
        for (const child of navNode.children) {
          const childTitle = resolveTitle(child.title)
          const childUrl = `${baseUrl}/SitePages/${child.slug}.aspx`
          const childRes = await fetch(
            `${baseUrl}/_api/web/navigation/topnavigationbar/GetById(${nodeId})/Children`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                __metadata: { type: 'SP.NavigationNode' },
                IsExternal: false,
                Title: childTitle,
                Url: childUrl,
              }),
            }
          )
          if (!childRes.ok) logger.warn({ childTitle, childUrl }, 'failed to add child nav node')
        }
      }
    }
  }

  logger.info({ siteUrl, count: navNodes.length }, 'top navigation set')
}

export async function createCommunicationSite({
  hostname,
  token,
  title,
  slug,
  owner,
  lcid = 1033,
  pollIntervalMs = 5000,
}) {
  const adminHostname = hostname.replace('.sharepoint.com', '-admin.sharepoint.com')
  const apiUrl = `https://${adminHostname}/_api/SPSiteManager/create`
  const siteUrl = `https://${hostname}/sites/${slug}`

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json;odata=verbose',
    Accept: 'application/json;odata=verbose',
  }

  const body = JSON.stringify({
    request: {
      Title: title,
      Url: siteUrl,
      Lcid: lcid,
      ShareByEmailEnabled: false,
      WebTemplate: 'SITEPAGEPUBLISHING#0',
      Owner: owner,
    },
  })

  const res = await fetch(apiUrl, { method: 'POST', headers, body })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`SPSiteManager/create failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  let siteStatus = data?.d?.Create?.SiteStatus ?? data?.SiteStatus
  let resultUrl = data?.d?.Create?.SiteUrl ?? data?.SiteUrl ?? siteUrl

  // Poll until provisioning complete (SiteStatus 2 = Ready)
  const statusUrl = `https://${adminHostname}/_api/SPSiteManager/GetSiteStatus?url='${encodeURIComponent(siteUrl)}'`
  const statusHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json;odata=verbose',
  }

  let attempts = 0
  while (siteStatus !== 2 && attempts < 24) {
    await new Promise(r => setTimeout(r, pollIntervalMs))
    attempts++
    logger.info({ siteUrl, attempts }, 'waiting for Communication Site provisioning...')

    // Use GET status endpoint; fall back to POST create if endpoint unavailable
    let pollData
    const getRes = await fetch(statusUrl, { method: 'GET', headers: statusHeaders })
    if (getRes.ok) {
      pollData = await getRes.json()
    } else {
      const pollRes = await fetch(apiUrl, { method: 'POST', headers, body })
      if (!pollRes.ok) {
        const errText = await pollRes.text().catch(() => '')
        throw new Error(`SPSiteManager poll failed (${pollRes.status}): ${errText}`)
      }
      pollData = await pollRes.json()
    }

    siteStatus = pollData?.d?.Create?.SiteStatus ?? pollData?.SiteStatus
    resultUrl = pollData?.d?.Create?.SiteUrl ?? pollData?.SiteUrl ?? resultUrl
  }

  if (siteStatus !== 2) {
    throw new Error(`Communication Site provisioning timed out (status ${siteStatus})`)
  }

  // siteId is resolved in provisioningJobs via Graph after siteUrl is known
  return { siteUrl: resultUrl }
}
