import logger from './logger.js'

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
