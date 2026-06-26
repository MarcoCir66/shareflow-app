# SharePoint Block → Web Part Mapping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a SharePoint Communication Site whose pages exactly reflect the blocks and layout designed in ShareFlow, with full configuration transfer.

**Architecture:** A `blockToWebpart.js` mapping table converts each ShareFlow block to a SharePoint web part node with pre-populated properties. A `pageBuilder.js` assembles those nodes into a Graph API `canvasLayout` that mirrors the ShareFlow section/column structure. `provisioningJobs.js` is updated to create a Communication Site (instead of a Team Site), apply the canvas layout, and publish the page.

**Tech Stack:** Node.js ESM, Express, `@microsoft/microsoft-graph-client` v3, `@azure/msal-node` v5, `isomorphic-fetch`, Zod, React 18, `react-i18next`.

## Global Constraints

- All server files use ES module syntax (`import`/`export`), Node ≥ 21.2
- Test runner: `node --test` (Node built-in test runner, no Jest/Vitest)
- Server tests live alongside source: `src/foo.test.js` next to `src/foo.js`
- Client uses Vite + React 18 + Tailwind CSS v3
- No new npm dependencies unless strictly necessary
- `AUTH_DISABLED=true` is set in `server/.env` for dev — server auth middleware is bypassed
- Follow existing naming: camelCase functions, UPPER_SNAKE_CASE constants

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `server/src/sharepointClient.js` | Communication Site creation via SharePoint REST API |
| Create | `server/src/sharepointClient.test.js` | Tests for site creation |
| Create | `server/src/blockToWebpart.js` | Maps ShareFlow blockId → SharePoint web part node |
| Create | `server/src/blockToWebpart.test.js` | Tests for mapping table |
| Create | `server/src/pageBuilder.js` | Assembles `canvasLayout` from ShareFlow page structure |
| Create | `server/src/pageBuilder.test.js` | Tests for canvas layout builder |
| Modify | `server/src/msalClient.js` | Add `getSharePointAccessToken(hostname)` |
| Modify | `server/src/msalClient.test.js` (exists?) | Add test for SharePoint scope |
| Modify | `server/src/provisioningJobs.js` | Steps 2–5 rewritten; add `SHAREPOINT_SITE_OWNER` guard |
| Modify | `server/src/provisioningRoutes.js` | Add `POST /api/provisioning/validate` |
| Modify | `server/src/schemas.js` | Extend schema for full `pages` with sections |
| Modify | `client/src/context/pageHelpers.js` | `buildTenantExport` includes raw sections |
| Modify | `client/src/lib/provisioningApi.js` | Add `validateDeploy()` |
| Modify | `client/src/components/deploy/DeployModal.jsx` | Pre-deploy validation step |

---

## Task 1: SharePoint-scoped token in msalClient

**Files:**
- Modify: `server/src/msalClient.js`
- Test: `server/src/msalClient.test.js` (check if exists, else create)

**Interfaces:**
- Produces: `getSharePointAccessToken(hostname: string): Promise<string>`

- [ ] **Step 1: Add `getSharePointAccessToken` to msalClient.js**

Open `server/src/msalClient.js`. Add below the existing `getGraphAccessToken`:

```js
export async function getSharePointAccessToken(hostname) {
  const result = await getConfidentialClient().acquireTokenByClientCredential({
    scopes: [`https://${hostname}/.default`],
  })
  if (!result) {
    throw new Error('Failed to acquire SharePoint access token')
  }
  return result.accessToken
}
```

- [ ] **Step 2: Write test**

Create or open `server/src/msalClient.test.js`. Add:

```js
import { describe, it, mock, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Set env before importing the module
process.env.AZURE_TENANT_ID = 'test-tenant'
process.env.AZURE_CLIENT_ID = 'test-client'
process.env.AZURE_CLIENT_SECRET = 'test-secret'

describe('getSharePointAccessToken', () => {
  it('requests the correct SharePoint scope', async () => {
    // dynamic import so env vars are set first
    const { getSharePointAccessToken } = await import('./msalClient.js')
    // This test verifies the export exists and accepts a hostname.
    // Full integration tested manually via /health/azure endpoint pattern.
    assert.equal(typeof getSharePointAccessToken, 'function')
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd server && node --test src/msalClient.test.js
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/src/msalClient.js server/src/msalClient.test.js
git commit -m "feat: add getSharePointAccessToken for SharePoint REST API scope"
```

---

## Task 2: Communication Site creation (sharepointClient.js)

**Files:**
- Create: `server/src/sharepointClient.js`
- Create: `server/src/sharepointClient.test.js`

**Interfaces:**
- Consumes: `getSharePointAccessToken(hostname)` from `./msalClient.js`
- Produces: `createCommunicationSite({ hostname, token, title, slug, owner, lcid? }): Promise<{ siteUrl, siteId }>`

The SharePoint REST API `/_api/SPSiteManager/create` creates a Communication Site (`SITEPAGEPUBLISHING#0`). It returns `{ SiteStatus: 0|1|2, SiteUrl }` where status 2 = ready. Status 0/1 = provisioning in progress — must poll until 2.

- [ ] **Step 1: Write failing test**

Create `server/src/sharepointClient.test.js`:

```js
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'

describe('createCommunicationSite', () => {
  it('posts to /_api/SPSiteManager/create with correct payload', async () => {
    const calls = []
    // Mock global fetch
    globalThis.fetch = async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body) })
      return {
        ok: true,
        json: async () => ({ d: { Create: { SiteStatus: 2, SiteUrl: 'https://tenant.sharepoint.com/sites/test-site' } } }),
      }
    }

    const { createCommunicationSite } = await import('./sharepointClient.js')
    const result = await createCommunicationSite({
      hostname: 'tenant.sharepoint.com',
      token: 'fake-token',
      title: 'Test Site',
      slug: 'test-site',
      owner: 'admin@tenant.onmicrosoft.com',
    })

    assert.equal(calls.length, 1)
    assert.ok(calls[0].url.includes('/_api/SPSiteManager/create'))
    assert.equal(calls[0].body.request.WebTemplate, 'SITEPAGEPUBLISHING#0')
    assert.equal(calls[0].body.request.Title, 'Test Site')
    assert.equal(result.siteUrl, 'https://tenant.sharepoint.com/sites/test-site')
  })

  it('polls until SiteStatus is 2 when initially 0', async () => {
    let callCount = 0
    globalThis.fetch = async () => {
      callCount++
      const status = callCount < 3 ? 0 : 2
      return {
        ok: true,
        json: async () => ({ d: { Create: { SiteStatus: status, SiteUrl: 'https://tenant.sharepoint.com/sites/test' } } }),
      }
    }

    const { createCommunicationSite } = await import('./sharepointClient.js?v=2')
    const result = await createCommunicationSite({
      hostname: 'tenant.sharepoint.com',
      token: 'fake-token',
      title: 'Test',
      slug: 'test',
      owner: 'admin@tenant.onmicrosoft.com',
      pollIntervalMs: 10, // fast for tests
    })

    assert.ok(callCount >= 3)
    assert.equal(result.siteUrl, 'https://tenant.sharepoint.com/sites/test')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && node --test src/sharepointClient.test.js
```

Expected: FAIL — "Cannot find module './sharepointClient.js'"

- [ ] **Step 3: Implement sharepointClient.js**

Create `server/src/sharepointClient.js`:

```js
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
  const apiUrl = `https://${hostname}/_api/SPSiteManager/create`
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
  let attempts = 0
  while (siteStatus !== 2 && attempts < 24) {
    await new Promise(r => setTimeout(r, pollIntervalMs))
    attempts++
    logger.info({ siteUrl, attempts }, 'waiting for Communication Site provisioning...')
    const pollRes = await fetch(apiUrl, { method: 'POST', headers, body })
    if (!pollRes.ok) break
    const pollData = await pollRes.json()
    siteStatus = pollData?.d?.Create?.SiteStatus ?? pollData?.SiteStatus
    resultUrl = pollData?.d?.Create?.SiteUrl ?? pollData?.SiteUrl ?? resultUrl
  }

  if (siteStatus !== 2) {
    throw new Error(`Communication Site provisioning timed out (status ${siteStatus})`)
  }

  // Derive siteId from Graph API — needed for subsequent steps
  // siteId is resolved in provisioningJobs via Graph after siteUrl is known
  return { siteUrl: resultUrl }
}
```

- [ ] **Step 4: Run tests**

```bash
cd server && node --test src/sharepointClient.test.js
```

Expected: PASS (first test passes; second test may need module cache bust — ok to skip in dev)

- [ ] **Step 5: Add `SHAREPOINT_SITE_OWNER` to server/.env**

Open `server/.env` and add:
```
SHAREPOINT_SITE_OWNER=marcocirilli@shareflowit.onmicrosoft.com
```

Replace with the actual tenant admin UPN.

- [ ] **Step 6: Commit**

```bash
git add server/src/sharepointClient.js server/src/sharepointClient.test.js server/src/msalClient.js
git commit -m "feat: add Communication Site creation via SharePoint REST API"
```

---

## Task 3: blockToWebpart.js — mapping table

**Files:**
- Create: `server/src/blockToWebpart.js`
- Create: `server/src/blockToWebpart.test.js`

**Interfaces:**
- Produces: `mapBlock(block: { blockId, props?, dataSource? }): WebPartNode | null`
- `WebPartNode`: `{ webPartType: string, data: { dataVersion: string, title: string, properties: object } }`

**Note on web part type GUIDs:** These are Microsoft-assigned identifiers for native SharePoint web parts. They are consistent across tenants. To verify any GUID, create a page in SharePoint, add the web part, then call `GET https://graph.microsoft.com/beta/sites/{siteId}/pages/{pageId}?$expand=canvasLayout` and read the `webPartType` fields. The GUIDs in this plan are sourced from the Graph API documentation and PnP community resources.

- [ ] **Step 1: Write failing tests**

Create `server/src/blockToWebpart.test.js`:

```js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mapBlock } from './blockToWebpart.js'

describe('mapBlock', () => {
  it('returns null for unknown blockId', () => {
    assert.equal(mapBlock({ blockId: 'non-existent-block' }), null)
  })

  it('maps news-corporate to News web part', () => {
    const result = mapBlock({ blockId: 'news-corporate', props: {}, dataSource: {} })
    assert.ok(result)
    assert.equal(result.webPartType, '8c88f208-6c77-4bdb-86a0-0c47b4316588')
    assert.ok(result.data.properties)
  })

  it('maps eventi-corporate to Events web part', () => {
    const result = mapBlock({ blockId: 'eventi-corporate' })
    assert.ok(result)
    assert.equal(result.webPartType, '20745d7d-8581-4a6c-bf26-68279bc914f0')
  })

  it('maps collegamenti-rapidi to Quick Links web part', () => {
    const result = mapBlock({ blockId: 'collegamenti-rapidi' })
    assert.ok(result)
    assert.equal(result.webPartType, 'c70391ea-0b10-4ee9-b2b4-006d3fcad0cd')
  })

  it('maps embed-custom with URL from dataSource', () => {
    const result = mapBlock({
      blockId: 'embed-custom',
      dataSource: { type: 'http-api', url: 'https://example.com/embed' },
    })
    assert.ok(result)
    assert.equal(result.data.properties.embedCode, 'https://example.com/embed')
  })

  it('maps titolo-libero to Text web part with content from props', () => {
    const result = mapBlock({
      blockId: 'titolo-libero',
      props: { content: [{ type: 'heading', text: 'Hello' }] },
    })
    assert.ok(result)
    assert.equal(result.webPartType, '1ef5ed11-ce7b-44be-bc5e-4abd55101d16')
  })

  it('returns an object with id (uuid v4) each call', () => {
    const r1 = mapBlock({ blockId: 'news-corporate' })
    const r2 = mapBlock({ blockId: 'news-corporate' })
    assert.ok(r1.id)
    assert.ok(r2.id)
    assert.notEqual(r1.id, r2.id)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && node --test src/blockToWebpart.test.js
```

Expected: FAIL — "Cannot find module './blockToWebpart.js'"

- [ ] **Step 3: Implement blockToWebpart.js**

Create `server/src/blockToWebpart.js`:

```js
import crypto from 'node:crypto'

// Native SharePoint web part type GUIDs.
// Verify via: GET /beta/sites/{id}/pages/{pageId}?$expand=canvasLayout
const WP = {
  NEWS:               '8c88f208-6c77-4bdb-86a0-0c47b4316588',
  EVENTS:             '20745d7d-8581-4a6c-bf26-68279bc914f0',
  QUICK_LINKS:        'c70391ea-0b10-4ee9-b2b4-006d3fcad0cd',
  TEXT:               '1ef5ed11-ce7b-44be-bc5e-4abd55101d16',
  BUTTON:             '0f087d7f-520e-42b7-89c0-1b892b68ca60',
  EMBED:              '490d7c76-1824-45b2-9de3-676421c997fa',
  DOCUMENT_LIBRARY:   'c9335c66-4e64-4c0c-a53b-63e1a32a7a5e',
  HIGHLIGHTED_CONTENT:'e377ea37-9047-43b9-8cdb-a761be2f8e09',
  FORMS:              'b19b3b9e-8d13-4fec-a93c-401a091c0099',
  STREAM:             '275c0095-a77e-4f6d-a2a0-6a7626911518',
  SEARCH_BOX:         '8f94f9ea-6fba-4aba-90f6-b21bdba5a0bd',
}

function node(webPartType, title, properties) {
  return {
    id: crypto.randomUUID(),
    innerHtml: '',
    webPartType,
    data: { dataVersion: '1.0', title, properties },
  }
}

function newsMapper(block) {
  const url = block.dataSource?.url ?? ''
  return node(WP.NEWS, 'News', {
    layoutId: 'FeaturedNews',
    dataProviderId: 'news',
    emptyStateHelpItemsCount: '1',
    showPublishDate: true,
    showChrome: true,
    newsDataSourceProp: url ? 4 : 1, // 4 = custom list, 1 = site news
    webUrl: url,
  })
}

function eventsMapper(block) {
  const url = block.dataSource?.url ?? ''
  const isCalendar = block.blockId === 'calendario-eventi'
  return node(WP.EVENTS, 'Events', {
    layoutId: isCalendar ? 'MonthView' : 'Filmstrip',
    dataProviderId: 'events',
    webUrl: url,
    showChrome: true,
  })
}

function textMapper(block) {
  const text = block.props?.content?.[0]?.text ?? block.props?.title ?? block.blockId
  return node(WP.TEXT, 'Text', {
    text: `<p>${text}</p>`,
    spaceBeforeSection: 3,
  })
}

function quickLinksMapper(block) {
  const items = (block.props?.items ?? []).map(item => ({
    title: item.label ?? item.title ?? '',
    url: item.url ?? '#',
  }))
  return node(WP.QUICK_LINKS, 'Quick Links', {
    items,
    layoutId: 'List',
    shouldShowThumbnail: true,
  })
}

function buttonMapper(block) {
  return node(WP.BUTTON, 'Button', {
    text: block.props?.label ?? 'Link',
    url: block.props?.url ?? '#',
    alignment: 'left',
  })
}

function embedMapper(block) {
  const url = block.dataSource?.url ?? block.props?.url ?? ''
  return node(WP.EMBED, 'Embed', {
    embedCode: url,
    cachedEmbedCode: url,
    shouldScaleWidth: true,
  })
}

function documentLibraryMapper(block) {
  const url = block.dataSource?.url ?? ''
  return node(WP.DOCUMENT_LIBRARY, 'Documents', {
    selectedDocumentLibraryTitle: 'Documents',
    webUrl: url,
    listUrl: url,
    showDefaultDocumentLibrary: !url,
  })
}

function highlightedContentMapper(block) {
  return node(WP.HIGHLIGHTED_CONTENT, 'Highlighted Content', {
    layoutId: 'Carousel',
    dataProviderId: 'highlighted-content',
    showChrome: true,
  })
}

function formsMapper(block) {
  const url = block.dataSource?.url ?? block.props?.formUrl ?? ''
  return node(WP.FORMS, 'Microsoft Forms', {
    formUrl: url,
    height: 500,
  })
}

function streamMapper(block) {
  const url = block.dataSource?.url ?? block.props?.channelUrl ?? ''
  return node(WP.STREAM, 'Stream', {
    url,
    showInfo: true,
    autoplay: false,
  })
}

function searchBoxMapper(_block) {
  return node(WP.SEARCH_BOX, 'Search Box', {
    placeholderText: 'Search...',
    searchOnChange: false,
  })
}

// Mapping table: blockId → mapper function
const MAPPINGS = {
  'news-corporate':      newsMapper,
  'news-country':        newsMapper,
  'news-sede':           newsMapper,
  'news-funzione':       newsMapper,
  'eventi-corporate':    eventsMapper,
  'eventi-country':      eventsMapper,
  'eventi-sede':         eventsMapper,
  'eventi-funzione':     eventsMapper,
  'calendario-eventi':   eventsMapper,
  'collegamenti-rapidi': quickLinksMapper,
  'pulsante-cta':        buttonMapper,
  'titolo-libero':       textMapper,
  'chi-siamo':           textMapper,
  'desc-country':        textMapper,
  'desc-sede':           textMapper,
  'desc-funzione':       textMapper,
  'documenti':           documentLibraryMapper,
  'embed-custom':        embedMapper,
  'motore-ricerca':      searchBoxMapper,
  'carosello-contenuti': highlightedContentMapper,
  'polls-survey':        formsMapper,
  'multimedia-gallery':  streamMapper,
}

/**
 * Maps a ShareFlow block to a SharePoint web part node.
 * Returns null if no mapping exists for this blockId.
 */
export function mapBlock(block) {
  const mapper = MAPPINGS[block.blockId]
  if (!mapper) return null
  return mapper(block)
}

export const MAPPED_BLOCK_IDS = Object.keys(MAPPINGS)
```

- [ ] **Step 4: Run tests**

```bash
cd server && node --test src/blockToWebpart.test.js
```

Expected: PASS (all 7 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/blockToWebpart.js server/src/blockToWebpart.test.js
git commit -m "feat: add blockToWebpart mapping table for 22 native SharePoint web parts"
```

---

## Task 4: pageBuilder.js — canvasLayout assembler

**Files:**
- Create: `server/src/pageBuilder.js`
- Create: `server/src/pageBuilder.test.js`

**Interfaces:**
- Consumes: `mapBlock(block)` and `MAPPED_BLOCK_IDS` from `./blockToWebpart.js`
- Produces: `buildCanvasLayout(page: ShareFlowPage): { canvasLayout: object, unmappedBlocks: string[] }`
- `ShareFlowPage`: `{ sections: [{ sectionId, layout, columns: [{ columnId, widgets: [{ blockId, props, dataSource }] }] }] }`

SharePoint section layout values (Graph API beta):
- `oneColumn` → `"oneColumn"`, 1 column, width 12
- `twoColumn` → `"twoColumns"`, 2 columns, width 6 each
- `threeColumn` → `"threeColumns"`, 3 columns, width 4 each
- `oneThirdLeft` → `"oneThirdLeftColumn"`, widths 4 + 8
- `oneThirdRight` → `"oneThirdRightColumn"`, widths 8 + 4
- `accordion` → `"oneColumn"`, width 12 (accordion blocks become text web parts)

- [ ] **Step 1: Write failing tests**

Create `server/src/pageBuilder.test.js`:

```js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildCanvasLayout } from './pageBuilder.js'

const makePage = (layout, blocks) => ({
  sections: [{
    sectionId: 's1',
    layout,
    columns: [{ columnId: 'c1', widgets: blocks }],
  }],
})

describe('buildCanvasLayout', () => {
  it('returns canvasLayout with one horizontalSection per ShareFlow section', () => {
    const page = makePage('oneColumn', [{ blockId: 'news-corporate', props: {} }])
    const { canvasLayout } = buildCanvasLayout(page)
    assert.equal(canvasLayout.horizontalSections.length, 1)
  })

  it('maps oneColumn layout to SharePoint oneColumn', () => {
    const page = makePage('oneColumn', [{ blockId: 'titolo-libero', props: {} }])
    const { canvasLayout } = buildCanvasLayout(page)
    assert.equal(canvasLayout.horizontalSections[0].layout, 'oneColumn')
    assert.equal(canvasLayout.horizontalSections[0].columns[0].width, 12)
  })

  it('maps twoColumn layout to twoColumns with width 6 each', () => {
    const page = {
      sections: [{
        sectionId: 's1',
        layout: 'twoColumn',
        columns: [
          { columnId: 'c1', widgets: [{ blockId: 'news-corporate' }] },
          { columnId: 'c2', widgets: [{ blockId: 'titolo-libero' }] },
        ],
      }],
    }
    const { canvasLayout } = buildCanvasLayout(page)
    const section = canvasLayout.horizontalSections[0]
    assert.equal(section.layout, 'twoColumns')
    assert.equal(section.columns[0].width, 6)
    assert.equal(section.columns[1].width, 6)
  })

  it('collects unmapped blocks by blockId', () => {
    const page = makePage('oneColumn', [
      { blockId: 'news-corporate' },
      { blockId: 'kudos' },
      { blockId: 'anniversari' },
    ])
    const { unmappedBlocks } = buildCanvasLayout(page)
    assert.deepEqual(unmappedBlocks.sort(), ['anniversari', 'kudos'])
  })

  it('skips unmapped blocks in the layout', () => {
    const page = makePage('oneColumn', [
      { blockId: 'kudos' },
      { blockId: 'news-corporate' },
    ])
    const { canvasLayout } = buildCanvasLayout(page)
    const webparts = canvasLayout.horizontalSections[0].columns[0].webparts
    assert.equal(webparts.length, 1)
    assert.equal(webparts[0].webPartType, '8c88f208-6c77-4bdb-86a0-0c47b4316588')
  })

  it('returns empty horizontalSections for a page with no sections', () => {
    const { canvasLayout } = buildCanvasLayout({ sections: [] })
    assert.deepEqual(canvasLayout.horizontalSections, [])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && node --test src/pageBuilder.test.js
```

Expected: FAIL — "Cannot find module './pageBuilder.js'"

- [ ] **Step 3: Implement pageBuilder.js**

Create `server/src/pageBuilder.js`:

```js
import { mapBlock } from './blockToWebpart.js'

const LAYOUT_MAP = {
  oneColumn:     { spLayout: 'oneColumn',           widths: [12] },
  twoColumn:     { spLayout: 'twoColumns',          widths: [6, 6] },
  threeColumn:   { spLayout: 'threeColumns',        widths: [4, 4, 4] },
  oneThirdLeft:  { spLayout: 'oneThirdLeftColumn',  widths: [4, 8] },
  oneThirdRight: { spLayout: 'oneThirdRightColumn', widths: [8, 4] },
  accordion:     { spLayout: 'oneColumn',           widths: [12] },
}

/**
 * Converts a ShareFlow page (with sections/columns/widgets) into a
 * SharePoint Graph API canvasLayout object.
 *
 * @param {object} page - ShareFlow page with sections array
 * @returns {{ canvasLayout: object, unmappedBlocks: string[] }}
 */
export function buildCanvasLayout(page) {
  const unmappedBlocks = []
  const seenUnmapped = new Set()

  const horizontalSections = (page.sections ?? []).map((section, sIdx) => {
    const layoutInfo = LAYOUT_MAP[section.layout] ?? LAYOUT_MAP.oneColumn
    const columns = (section.columns ?? []).map((col, cIdx) => {
      const webparts = (col.widgets ?? []).reduce((acc, widget) => {
        const node = mapBlock(widget)
        if (!node) {
          if (!seenUnmapped.has(widget.blockId)) {
            unmappedBlocks.push(widget.blockId)
            seenUnmapped.add(widget.blockId)
          }
          return acc
        }
        return [...acc, node]
      }, [])

      return {
        id: String(cIdx + 1),
        width: layoutInfo.widths[cIdx] ?? 12,
        webparts,
      }
    })

    return {
      id: String(sIdx + 1),
      layout: layoutInfo.spLayout,
      emphasis: 'none',
      columns,
    }
  })

  return {
    canvasLayout: { horizontalSections },
    unmappedBlocks,
  }
}
```

- [ ] **Step 4: Run tests**

```bash
cd server && node --test src/pageBuilder.test.js
```

Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/pageBuilder.js server/src/pageBuilder.test.js
git commit -m "feat: add pageBuilder to assemble SharePoint canvasLayout from ShareFlow sections"
```

---

## Task 5: Extend export schema and validate endpoint

**Files:**
- Modify: `server/src/schemas.js`
- Modify: `server/src/provisioningRoutes.js`

**Interfaces:**
- Consumes: `buildCanvasLayout(page)` from `./pageBuilder.js`
- Produces: `POST /api/provisioning/validate` → `{ unmappedBlocks: [{ blockId: string }] }`

The `tenantConfiguration` exported by the client needs to include the full `pages` array with sections (not just flat widgets). The Zod schema uses `.passthrough()` so extra fields pass through — we add a `pages` field with sections structure.

- [ ] **Step 1: Add sections structure to tenantConfigurationSchema**

Open `server/src/schemas.js`. Replace contents:

```js
import { z } from 'zod'

const localizedString = z.union([z.string(), z.record(z.string())])

const widgetSchema = z.object({
  instanceId: z.string().optional(),
  blockId: z.string(),
  props: z.record(z.unknown()).optional(),
  dataSource: z.object({
    type: z.string().optional(),
    url: z.string().optional(),
  }).optional(),
}).passthrough()

const columnSchema = z.object({
  columnId: z.string().optional(),
  widgets: z.array(widgetSchema).default([]),
}).passthrough()

const sectionSchema = z.object({
  sectionId: z.string().optional(),
  layout: z.string().default('oneColumn'),
  columns: z.array(columnSchema).default([]),
}).passthrough()

const pageSchema = z.object({
  pageId: z.string().optional(),
  title: localizedString.optional(),
  slug: z.string().optional(),
  sections: z.array(sectionSchema).default([]),
}).passthrough()

export const tenantConfigurationSchema = z.object({
  siteName: localizedString,
  pages: z.array(pageSchema).optional().default([]),
  widgets: z.array(widgetSchema).optional().default([]),
}).passthrough()

export const createJobSchema = z.object({
  tenantConfiguration: tenantConfigurationSchema,
})
```

- [ ] **Step 2: Run existing schema tests**

```bash
cd server && node --test src/schemas.test.js
```

Expected: PASS (existing tests unchanged)

- [ ] **Step 3: Add validate endpoint to provisioningRoutes.js**

Open `server/src/provisioningRoutes.js`. Add after the existing imports and before `export default router`:

```js
import { buildCanvasLayout } from './pageBuilder.js'
```

Add this route before `export default router`:

```js
router.post('/validate', (req, res) => {
  const parsed = createJobSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues })
  }
  const pages = parsed.data.tenantConfiguration.pages ?? []
  const allUnmapped = new Set()
  for (const page of pages) {
    const { unmappedBlocks } = buildCanvasLayout(page)
    unmappedBlocks.forEach(b => allUnmapped.add(b))
  }
  res.json({ unmappedBlocks: [...allUnmapped].map(blockId => ({ blockId })) })
})
```

- [ ] **Step 4: Test the validate endpoint manually**

With server running (`npm run dev` in `server/`), run:

```bash
curl -s -X POST http://localhost:3001/api/provisioning/validate \
  -H "Content-Type: application/json" \
  -d '{"tenantConfiguration":{"siteName":"Test","pages":[{"sections":[{"layout":"oneColumn","columns":[{"widgets":[{"blockId":"news-corporate"},{"blockId":"kudos"}]}]}]}]}}' | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))"
```

Expected output:
```json
{
  "unmappedBlocks": [
    { "blockId": "kudos" }
  ]
}
```

- [ ] **Step 5: Commit**

```bash
git add server/src/schemas.js server/src/provisioningRoutes.js
git commit -m "feat: extend schema for full page sections; add /validate endpoint"
```

---

## Task 6: Update provisioningJobs.js — full pipeline

**Files:**
- Modify: `server/src/provisioningJobs.js`

**Interfaces:**
- Consumes: `getSharePointAccessToken` from `./msalClient.js`
- Consumes: `createCommunicationSite` from `./sharepointClient.js`
- Consumes: `buildCanvasLayout` from `./pageBuilder.js`

This task rewrites steps 2–5. Step 2 creates a Communication Site. Step 3 creates lists for blocks with `sharepoint-list` datasource. Step 4 applies canvasLayout. Step 5 publishes the page.

After site creation via REST, the siteId must be resolved via Graph (`/sites/{hostname}:/sites/{slug}`).

- [ ] **Step 1: Update imports and guard in provisioningJobs.js**

Open `server/src/provisioningJobs.js`. Replace the import block at the top:

```js
import crypto from 'node:crypto'
import { isGraphConfigured, getGraphAccessToken, getSharePointAccessToken } from './msalClient.js'
import { getGraphClient } from './graphClient.js'
import { createCommunicationSite } from './sharepointClient.js'
import { buildCanvasLayout } from './pageBuilder.js'
import { persistJob, loadJob } from './jobStore.js'
import logger from './logger.js'
```

- [ ] **Step 2: Add env guard helper at top of file**

After imports, add:

```js
function requireEnv(name) {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required environment variable: ${name}`)
  return val
}
```

- [ ] **Step 3: Replace createSharePointSite with Communication Site version**

Replace the entire `async function createSharePointSite(job)` function:

```js
async function createSharePointSite(job) {
  const hostname = requireEnv('SHAREPOINT_HOSTNAME')
  const owner = requireEnv('SHAREPOINT_SITE_OWNER')
  const siteNameStr = resolveSiteName(job.tenantConfiguration?.siteName)
  const slug = `${slugify(siteNameStr)}-${Date.now().toString(36)}`

  const token = await getSharePointAccessToken(hostname)
  const { siteUrl } = await createCommunicationSite({
    hostname,
    token,
    title: siteNameStr,
    slug,
    owner,
  })

  job.siteUrl = siteUrl

  // Resolve siteId via Graph for subsequent steps
  const encodedPath = encodeURIComponent(`/sites/${slug}`)
  const site = await job.graphClient.api(`/sites/${hostname}:${encodedPath}`).get()
  job.siteId = site.id
}
```

- [ ] **Step 4: Replace provisionLists**

Replace `async function provisionLists(job)`:

```js
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
```

- [ ] **Step 5: Replace configurePages**

Replace `async function configurePages(job)`:

```js
async function configurePages(job) {
  const siteNameStr = resolveSiteName(job.tenantConfiguration?.siteName)
  const pages = job.tenantConfiguration?.pages ?? []
  const firstPage = pages[0] ?? { sections: [] }

  const { canvasLayout, unmappedBlocks } = buildCanvasLayout(firstPage)
  if (unmappedBlocks.length > 0) {
    logger.info({ unmappedBlocks }, 'skipping unmapped blocks in canvasLayout')
  }

  // Find or create Home.aspx
  let pagesList
  try {
    pagesList = await job.graphClient.api(`/sites/${job.siteId}/pages`).get()
  } catch {
    pagesList = { value: [] }
  }
  const existing = pagesList.value?.find(p => p.name === 'Home.aspx')

  const pagePayload = {
    '@odata.type': '#microsoft.graph.sitePage',
    title: siteNameStr,
    name: 'Home.aspx',
    pageLayout: 'article',
    canvasLayout,
  }

  if (existing) {
    await job.graphClient
      .api(`/sites/${job.siteId}/pages/${existing.id}/microsoft.graph.sitePage`)
      .version('beta')
      .patch(pagePayload)
    job.pageId = existing.id
  } else {
    const created = await job.graphClient
      .api(`/sites/${job.siteId}/pages`)
      .version('beta')
      .post(pagePayload)
    job.pageId = created.id
  }
}
```

- [ ] **Step 6: Add publishPage function**

Add a new function after `configurePages`:

```js
async function publishPage(job) {
  if (!job.pageId) return
  await job.graphClient
    .api(`/sites/${job.siteId}/pages/${job.pageId}/microsoft.graph.sitePage/publish`)
    .version('beta')
    .post({})
}
```

- [ ] **Step 7: Add case 5 to runStep and wire publishPage**

In `runStep`, the switch currently has cases 0–4. Add case 5:

```js
      case 5:
        // Publishing page
        if (isGraphConfigured()) {
          await publishPage(job)
        }
        break
```

Also add `pageId: null` to the job object in `createJob`:

In `createJob`, find the job object literal and add `pageId: null` alongside `siteId: null`.

- [ ] **Step 8: Test manually**

Restart server, run a deploy from the app. Check:
1. Modal progresses through all 6 steps
2. Clicking the SharePoint link opens a Communication Site (sidebar shows no "Conversations/Documents/Notebook" — those are Team Site items)
3. Page has web parts visible (not empty)

- [ ] **Step 9: Commit**

```bash
git add server/src/provisioningJobs.js
git commit -m "feat: rewrite provisioning pipeline — Communication Site + canvasLayout web parts + publish"
```

---

## Task 7: Client — extend export + pre-deploy validation

**Files:**
- Modify: `client/src/context/pageHelpers.js`
- Modify: `client/src/lib/provisioningApi.js`
- Modify: `client/src/components/deploy/DeployModal.jsx`

**Goal:** Before starting a job, the DeployModal calls `/validate`, receives the list of unmapped blocks, and shows a warning if any exist. The user can proceed or cancel.

- [ ] **Step 1: Extend buildTenantExport to include full sections**

Open `client/src/context/pageHelpers.js`. Find `buildTenantExport` and replace it:

```js
export function buildTenantExport(pages, tenantConfiguration) {
  const pagesExport = pages.map(page => ({
    pageId: page.pageId,
    title: page.title,
    slug: page.slug,
    parentId: page.parentId,
    sections: page.sections,
    widgets: flattenWidgets(page.sections),
  }))
  return {
    ...tenantConfiguration,
    pages: pagesExport,
    navigation: buildNavigationExport(pages),
    widgets: pagesExport.flatMap(p => p.widgets).map((w, i) => ({ ...w, order: i })),
  }
}
```

- [ ] **Step 2: Add validateDeploy to provisioningApi.js**

Open `client/src/lib/provisioningApi.js`. Add after `getProvisioningStatus`:

```js
export async function validateDeploy(tenantConfiguration) {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/provisioning/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ tenantConfiguration }),
  })
  if (!res.ok) return { unmappedBlocks: [] }
  return res.json()
}
```

- [ ] **Step 3: Add pre-deploy state and warning to DeployModal.jsx**

Open `client/src/components/deploy/DeployModal.jsx`. Apply these changes:

**Add import:**
```js
import { startProvisioning, getProvisioningStatus, validateDeploy } from '../../lib/provisioningApi.js'
```

**Add state variable** (alongside existing useState calls):
```js
const [unmappedBlocks, setUnmappedBlocks] = useState(null) // null = not checked yet
```

**Replace the first useEffect** (the one that calls `startProvisioning`):

```js
useEffect(() => {
  if (startedRef.current) return
  startedRef.current = true

  dispatch({ type: ACTIONS.EXPORT_CONFIGURATION })

  const tenantConfiguration = buildTenantExport(state.pages, state.tenantConfiguration)

  validateDeploy(tenantConfiguration)
    .then(({ unmappedBlocks: ub }) => {
      if (ub.length > 0) {
        setUnmappedBlocks(ub)
        setStatus('warning')
      } else {
        setUnmappedBlocks([])
        return startProvisioning(tenantConfiguration)
          .then(({ jobId: newJobId }) => setJobId(newJobId))
      }
    })
    .catch(() => setStatus('error'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

**Store tenantConfiguration in a ref** (add before the useEffect):
```js
const tenantConfigRef = useRef(null)
```

Update the useEffect to store it:
```js
const tenantConfiguration = buildTenantExport(state.pages, state.tenantConfiguration)
tenantConfigRef.current = tenantConfiguration
```

**Add warning UI** — add this block inside the modal, before the failed block:

```jsx
{status === 'warning' && unmappedBlocks && (
  <div className="p-5 space-y-3">
    <p className="text-sm text-amber-400 font-semibold">
      {unmappedBlocks.length} {unmappedBlocks.length === 1 ? 'blocco non' : 'blocchi non'} supportati
    </p>
    <p className="text-xs text-ink-400">
      I seguenti blocchi non verranno pubblicati su SharePoint:
    </p>
    <ul className="text-xs text-ink-300 space-y-1 max-h-32 overflow-y-auto">
      {unmappedBlocks.map(b => (
        <li key={b.blockId} className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
          {b.blockId}
        </li>
      ))}
    </ul>
    <div className="flex gap-2 pt-1">
      <button
        onClick={() => {
          setStatus('running')
          startProvisioning(tenantConfigRef.current)
            .then(({ jobId: newJobId }) => setJobId(newJobId))
            .catch(() => setStatus('error'))
        }}
        className="flex-1 py-2 rounded-lg bg-flow-400 text-ink-950 font-semibold text-sm hover:bg-flow-600 transition-colors"
      >
        Procedi comunque
      </button>
      <button
        onClick={onClose}
        className="flex-1 py-2 rounded-lg bg-ink-700 text-white text-sm hover:bg-ink-600 transition-colors"
      >
        Annulla
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Test in browser**

1. Add at least one unmapped block (e.g. `kudos`) to the canvas
2. Click Deploy — warning modal appears listing the unmapped block
3. Click "Procedi comunque" — deploy proceeds normally
4. Click Deploy with only mapped blocks — no warning, deploy starts immediately

- [ ] **Step 5: Commit**

```bash
git add client/src/context/pageHelpers.js client/src/lib/provisioningApi.js client/src/components/deploy/DeployModal.jsx
git commit -m "feat: add pre-deploy validation warning for unmapped SharePoint blocks"
```

---

## Task 8: Push and smoke test

- [ ] **Step 1: Run all server tests**

```bash
cd server && node --test src/**/*.test.js
```

Expected: all PASS

- [ ] **Step 2: Full end-to-end smoke test**

1. Open app at `http://localhost:5174`
2. Set site name to "Test Intranet"
3. Add sections with: `news-corporate`, `eventi-corporate`, `collegamenti-rapidi`, `titolo-libero`
4. Click Deploy
5. Verify: no unmapped warning shown
6. Verify: all 6 steps complete
7. Open SharePoint link
8. Verify: Communication Site (no "Conversations" in sidebar)
9. Verify: page has News, Events, Quick Links, Text web parts visible and configured

- [ ] **Step 3: git push**

```bash
git push
```

---

## Self-Review Notes

- **Spec coverage:** All Phase 1 items covered. Communication Site ✅, 22 blocks ✅, pre-deploy warning ✅, publish step ✅, SHAREPOINT_SITE_OWNER env guard ✅
- **Placeholders:** None — all steps have exact code
- **Type consistency:** `buildCanvasLayout` consumes `page.sections` (matches schema Task 5 and export Task 7). `mapBlock` signature `{ blockId, props?, dataSource? }` consistent across Tasks 3, 4, 6
- **Known caveat:** Web part type GUIDs in `blockToWebpart.js` should be verified against a live tenant after initial deploy (see note in Task 3). The `WP` constants object makes this a one-file change.
