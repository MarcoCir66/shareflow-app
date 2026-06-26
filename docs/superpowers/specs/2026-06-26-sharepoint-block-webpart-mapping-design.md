# SharePoint Block → Web Part Mapping — Design Spec

**Date:** 2026-06-26  
**Status:** Approved  
**Scope:** Phase 1 implementation (Communication Site + native web parts)

---

## Problem

The current ShareFlow deploy pipeline creates a Microsoft 365 Group (Team Site) and publishes an empty page. No ShareFlow blocks are translated to SharePoint web parts. The result is a generic SharePoint site with no relation to the intranet designed in ShareFlow.

## Goal

Full 1:1 correspondence between what the user designs in ShareFlow and what appears on the published SharePoint page. Configuration defined in ShareFlow (data source URLs, content, settings) transfers automatically into each web part's properties — the user opens SharePoint and finds everything already configured.

## Users

- **Communicators / agencies**: no SharePoint admin rights, deploy to tenants via app-only credentials
- **IT admins**: full tenant rights, can install PnP packages and SPFx solutions (Phase 2/3)

---

## Roadmap Overview

| Phase | Scope | Prerequisite |
|---|---|---|
| **1 — Native** | 22 blocks via native SharePoint web parts + Communication Site | None |
| **2 — PnP** | ~12 blocks via PnP community web parts | IT admin installs PnP package in tenant |
| **3 — SPFx** | 15 blocks via custom SPFx web parts | IT admin deploys `.sppkg` to tenant |

**Total coverage: 49/49 blocks across all phases. Phase 1 alone covers 45% with zero external dependencies.**

---

## Phase 1 — Technical Design

### Architecture

```
ShareFlow Canvas
       │
       ▼
[ blockToWebpart.js ]   mapping table: blockId → webPartType + propsMapper(block)
       │
       ▼
[ pageBuilder.js ]      assembles Graph API canvasLayout from ShareFlow sections
       │
       ▼
[ provisioningJobs.js ] PATCH /beta/sites/{id}/pages/{pageId} with full canvasLayout
       │
       ▼
SharePoint Communication Site — page published with all web parts configured
```

### New Files

#### `server/src/blockToWebpart.js`

Single responsibility: maps a ShareFlow block to a SharePoint web part node.

```js
export function mapBlock(block) {
  const mapper = MAPPINGS[block.blockId]
  if (!mapper) return null
  return mapper(block)
}
```

Entry structure per block:
```js
'news-corporate': (block) => ({
  webPartType: '8c88f208-6c77-4bdb-86a0-0c47b4316588',
  data: {
    dataVersion: '1.0',
    title: 'News',
    properties: {
      layoutId: 'FeaturedNews',
      dataProviderId: 'news',
      newsDataSourceProp: 1,
      // source URL from block.dataSource.url if present
    }
  }
})
```

#### `server/src/pageBuilder.js`

Single responsibility: converts ShareFlow page structure to Graph API `canvasLayout`.

```js
export function buildCanvasLayout(page) {
  // returns { canvasLayout, unmappedBlocks[] }
}
```

- Each ShareFlow `section` → `horizontalSection`
- Section layout mapping: `1col → oneColumn`, `2col → twoColumns`, `3col → threeColumns`, `1/3+2/3 → oneThirdRightColumn`
- Each block → web part node via `mapBlock()`
- Blocks returning `null` → collected in `unmappedBlocks[]`, skipped in layout

### Modified Files

#### `server/src/msalClient.js`

Add SharePoint-scoped token for Communication Site creation:

```js
export async function getSharePointAccessToken(hostname) {
  // scope: `https://${hostname}/.default`
  // used only for /_api/SPSiteManager/create
}
```

#### `server/src/provisioningJobs.js` — updated steps

| Step | Label | Implementation |
|---|---|---|
| 0 | Authenticating via MSAL | Acquire Graph token (existing) |
| 1 | Connecting to Microsoft Graph API | Init Graph client (existing) |
| 2 | Creating SharePoint Communication Site | POST `/_api/SPSiteManager/create` via SharePoint REST (replaces Group creation) |
| 3 | Provisioning Lists & Content Types | Create lists with correct schema for blocks with `sharepoint-list` datasource |
| 4 | Configuring Pages & Webparts | PATCH page with full `canvasLayout` from `buildCanvasLayout()` |
| 5 | Publishing | POST `.../microsoft.graph.sitePage/publish` |

**Communication Site creation payload:**
```json
{
  "request": {
    "Title": "Site Name",
    "Url": "https://tenant.sharepoint.com/sites/site-slug",
    "Lcid": 1040,
    "WebTemplate": "SITEPAGEPUBLISHING#0",
    "Owner": "admin@tenant.onmicrosoft.com"
  }
}
```

`SITEPAGEPUBLISHING#0` is the SharePoint Communication Site template.

`Owner` must be a valid UPN in the tenant. Since the deploy runs app-only (no user session), the value comes from a new env var: `SHAREPOINT_SITE_OWNER`. This must be added to `server/.env` alongside the existing Azure credentials. If not set, provisioning step 2 fails immediately with a clear error message rather than silently passing an empty owner.

#### `client/src/components/deploy/DeployModal.jsx`

Add pre-deploy validation step (step 0, before job creation):

1. Call `POST /api/provisioning/validate` with canvas config
2. Server returns `{ unmappedBlocks: [{ blockId, label }] }`
3. If `unmappedBlocks.length > 0` → show warning modal with block list
4. User chooses: **Proceed anyway** / **Cancel**
5. If proceed → start provisioning job as normal

#### `server/src/provisioningRoutes.js`

Add `POST /api/provisioning/validate` endpoint:
- Accepts same `tenantConfiguration` payload as job creation
- Runs `buildCanvasLayout()` without executing anything
- Returns `{ unmappedBlocks[] }` synchronously (no job created)

---

## Block → Web Part Mapping Table (Phase 1)

| ShareFlow Block | SharePoint Web Part | Web Part GUID | Key Properties Mapped |
|---|---|---|---|
| `news-corporate` | News | `8c88f208-...` | layout, audience filter, source URL |
| `news-country` | News | `8c88f208-...` | layout, country filter, source URL |
| `news-sede` | News | `8c88f208-...` | layout, location filter, source URL |
| `news-funzione` | News | `8c88f208-...` | layout, function filter, source URL |
| `eventi-corporate` | Events | `20745d7d-...` | date range, source URL |
| `eventi-country` | Events | `20745d7d-...` | date range, source URL |
| `eventi-sede` | Events | `20745d7d-...` | date range, source URL |
| `eventi-funzione` | Events | `20745d7d-...` | date range, source URL |
| `calendario-eventi` | Events | `20745d7d-...` | layout: calendar |
| `collegamenti-rapidi` | Quick Links | `c70391ea-...` | links array, layout |
| `pulsante-cta` | Button | `0f087d7f-...` | label, URL, style |
| `titolo-libero` | Text | `1ef5ed11-...` | heading text, level |
| `chi-siamo` | Text | `1ef5ed11-...` | body content |
| `desc-country` | Text | `1ef5ed11-...` | body content |
| `desc-sede` | Text | `1ef5ed11-...` | body content |
| `desc-funzione` | Text | `1ef5ed11-...` | body content |
| `documenti` | Document Library | `c9335c66-...` | list URL, view |
| `embed-custom` | Embed | `490d7c76-...` | embed URL/code |
| `motore-ricerca` | Search Box | `8f94f9ea-...` | placeholder, scope |
| `carosello-contenuti` | Highlighted Content | `e377ea37-...` | source, layout |
| `polls-survey` | Microsoft Forms | `b19b3b9e-...` | form URL |
| `multimedia-gallery` | Stream | `275c0095-...` | channel/playlist URL |

---

## Phase 2 — PnP Web Parts (outline)

Requires IT admin to install PnP Modern Web Parts package (`.sppkg`) in tenant app catalog.

| ShareFlow Block | PnP Web Part |
|---|---|
| `organigramma` | PnP Org Chart |
| `rubrica-colleghi` | PnP People Directory |
| `timeline-aziendale` | PnP Timeline |
| `countdown-lancio` | PnP Countdown Timer |
| `faq` / `come-fare-per` | PnP Accordion |
| `rassegna-stampa` | PnP RSS Reader |
| `procedure` | PnP List with custom view |
| `sezione-fiere` / `sezione-mostre` | PnP Highlighted Content |
| `motore-ricerca` (enhanced) | PnP Modern Search |

ShareFlow generates a deployment guide (Markdown + PowerShell) for the IT admin when PnP blocks are present in the canvas.

---

## Phase 3 — Custom SPFx Web Parts (outline)

Developed in-house or contracted. ShareFlow generates the `.sppkg` manifest.

Blocks: `kudos` · `linkedin-feed` · `bacheca-sindacale` · `bacheca-scambio` · `anniversari` · `new-entry` · `oggi-presentiamo` · `feedback-utenti` · `sezione-welfare` · `sezione-progetti` · `meteo` · `fusi-orari` · `contatti-chiave` · `avvisi-homepage` · `like-contenuto` · `commenti-contenuto`

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Block has no mapping | Collected in `unmappedBlocks[]`, skipped in layout, shown in pre-deploy warning |
| Communication Site URL already taken | Append `-{timestamp-base36}` suffix (same pattern as current mailNickname fix) |
| Page publish fails | Step 5 retries once; on second failure marks job as error with message |
| SharePoint token acquisition fails | Step 2 errors immediately with clear message |

---

## Success Criteria (Phase 1)

1. Deploy produces a **Communication Site** (`SITEPAGEPUBLISHING#0`), not a Team Site
2. All 22 mapped blocks appear on the page with configuration already set
3. Unmapped blocks trigger a pre-deploy warning listing each block by name
4. Page is **published** (not draft) when the SharePoint link opens
5. Existing end-to-end test suite continues to pass (provisioning mock path unchanged)
