# Phase 2 — Native Web Parts Design Spec

**Date:** 2026-06-30
**Status:** Approved
**Scope:** 8 blocks + 1 semantic mapping, zero PnP dependencies

---

## Context

Phase 1 mapped 26 ShareFlow blocks to native SP web parts. Phase 2 was originally designed to require PnP Modern Web Parts (community `.sppkg`). After verifying the actual tenant toolbox (`shareflowit.sharepoint.com`), all required web parts are available natively — no PnP installation needed.

Two Phase 3 (SPFx) blocks (`meteo`, `fusi-orari`) were also found to have native equivalents and are reclassified here.

---

## Verified Native Web Part GUIDs

Extracted from React fiber of the SP page editor toolbox on `shareflowit.sharepoint.com`:

| WP Name (IT) | GUID | Block |
|---|---|---|
| Organigramma | `e84a8ca2-f63c-4fb9-bc0b-d8eef5ccb22b` | `organigramma` |
| Timer conto alla rovescia | `62cac389-787f-495d-beca-e11786162ef4` | `countdown-lancio` |
| Elenco | `f92bf067-bc19-489e-a556-7fe95f508720` | `procedure` |
| Meteo | `868ac3c3-cad7-4bd6-9a1c-14dc5cc8e823` | `meteo` |
| Orologio mondiale | `81b57906-cbed-4bb1-9823-2e3314f46f28` | `fusi-orari` |
| Contenuto evidenziato | `daf0b71c-6de8-4ef7-b511-faae7c388708` | `sezione-fiere`, `sezione-mostre` (already in WP dict) |

---

## Block Mapping

### New native mappers (5 blocks)

| Block | WP | Tier | Delta |
|---|---|---|---|
| `organigramma` | Organigramma | B | Shows AAD org hierarchy; no support for custom org chart data |
| `countdown-lancio` | Timer conto alla rovescia | B | `props.targetDate` → WP date field; `props.label` → message |
| `procedure` | Elenco | B | Requires `dataSource.url` pointing to an existing SP List |
| `meteo` | Meteo | B | `props.city` → city; unit defaults to metric |
| `fusi-orari` | Orologio mondiale | B | `props.timezones[]` → clock list; defaults to empty array |

### Existing mapper reused (2 blocks)

| Block | WP | Mapper |
|---|---|---|
| `sezione-fiere` | Contenuto evidenziato | `highlightedContentMapper` (already exists) |
| `sezione-mostre` | Contenuto evidenziato | `highlightedContentMapper` (already exists) |

These two blocks only need to be added to the `MAPPINGS` table in `blockToWebpart.js` — no new code.

### Semantic mapping (1 block)

| Block | Semantic action |
|---|---|
| `multilingua` | Activate SP Multilingual Pages (MLP) on the site during provisioning |

`multilingua` is added to `SEMANTIC_PAGE_FLAGS` (no WP node produced). Its presence in `page.blocks` sets `pageFlags.mlpEnabled = true`.

---

## Reclassifications

| Block | Old tier/phase | New tier/phase |
|---|---|---|
| `organigramma` | C — Phase 2 PnP | B — Phase 2 Native |
| `countdown-lancio` | C — Phase 2 PnP | B — Phase 2 Native |
| `procedure` | C — Phase 2 PnP | B — Phase 2 Native |
| `meteo` | D — Phase 3 SPFx | B — Phase 2 Native |
| `fusi-orari` | D — Phase 3 SPFx | B — Phase 2 Native |
| `sezione-fiere` | C — Phase 2 PnP | B — Phase 1 Native |
| `sezione-mostre` | C — Phase 2 PnP | B — Phase 1 Native |

Phase 3 scope reduces from 11 to 9 blocks (`meteo` and `fusi-orari` removed).

---

## Implementation

### `server/src/blockToWebpart.js`

Add to `WP` dict:

```js
ORG_CHART:   'e84a8ca2-f63c-4fb9-bc0b-d8eef5ccb22b',
COUNTDOWN:   '62cac389-787f-495d-beca-e11786162ef4',
LIST:        'f92bf067-bc19-489e-a556-7fe95f508720',
WEATHER:     '868ac3c3-cad7-4bd6-9a1c-14dc5cc8e823',
WORLD_CLOCK: '81b57906-cbed-4bb1-9823-2e3314f46f28',
```

Add mapper functions:

```js
function orgChartMapper(_block) {
  return node(WP.ORG_CHART, 'Organigramma', {
    datasource: 'graph',
    viewType: 'people',
  })
}

function countdownMapper(block) {
  return node(WP.COUNTDOWN, 'Timer conto alla rovescia', {
    date: block.props?.targetDate ?? '',
    message: block.props?.label ?? '',
  })
}

function listMapper(block) {
  const url = block.dataSource?.url ?? ''
  return node(WP.LIST, 'Elenco', {
    webUrl: url,
    listId: '',
    showDefaultList: !url,
  })
}

function weatherMapper(block) {
  return node(WP.WEATHER, 'Meteo', {
    city: block.props?.city ?? '',
    unit: 'celsius',
  })
}

function worldClockMapper(block) {
  return node(WP.WORLD_CLOCK, 'Orologio mondiale', {
    clocks: block.props?.timezones ?? [],
  })
}
```

Add to `MAPPINGS`:

```js
'organigramma':    orgChartMapper,
'countdown-lancio':countdownMapper,
'procedure':       listMapper,
'meteo':           weatherMapper,
'fusi-orari':      worldClockMapper,
'sezione-fiere':   highlightedContentMapper,
'sezione-mostre':  highlightedContentMapper,
```

Add `'multilingua'` to `SEMANTIC_PAGE_FLAGS`:

```js
export const SEMANTIC_PAGE_FLAGS = ['commenti-contenuto', 'like-contenuto', 'multilingua']
```

### `server/src/pageBuilder.js`

Add `mlpEnabled` to `pageFlags`:

```js
const pageFlags = {
  commentsEnabled:  allWidgetIds.includes('commenti-contenuto'),
  reactionsEnabled: allWidgetIds.includes('like-contenuto'),
  mlpEnabled:       allWidgetIds.includes('multilingua'),
}
```

Update JSDoc `@returns` to include `mlpEnabled: boolean`.

### `server/src/provisioningJobs.js`

After the `commentsDisabled` PATCH block, add MLP activation:

```js
if (pageFlags.mlpEnabled) {
  try {
    await job.graphClient
      .api(`/sites/${job.siteId}/sharepoint.site/features`)
      .version('beta')
      .post({ featureId: '24611c05-ee19-45da-955f-6602264abaf8', scope: 'site' })
  } catch (e) {
    logger.warn({ err: e.message }, 'MLP feature activation skipped')
  }
}
```

> **Note:** The Graph beta endpoint for SP feature activation needs to be verified during implementation. If Graph doesn't support it, fall back to SP REST: `POST /_api/site/features/add('24611c05-ee19-45da-955f-6602264abaf8', 0, 'Site')` via a direct `fetch` with the provisioning access token.

---

## Tests

Each new mapper gets a unit test in `blockToWebpart.test.js`:

- `organigramma` → `result.webPartType === 'e84a8ca2-...'` + `result.data.properties.datasource === 'graph'`
- `countdown-lancio` → correct GUID + `result.data.properties.date === '2026-12-31'` (from props)
- `procedure` → correct GUID + `result.data.properties.webUrl === 'https://...'`
- `meteo` → correct GUID + `result.data.properties.city === 'Milano'`
- `fusi-orari` → correct GUID + `result.data.properties.clocks` is array
- `sezione-fiere` → same GUID as `carosello-contenuti` (both use `HIGHLIGHTED_CONTENT`)
- `sezione-mostre` → same as above

`pageBuilder.test.js`: add test that a page with `multilingua` block returns `pageFlags.mlpEnabled === true`.

---

## Phase 3 Residual (unchanged)

Blocks still requiring custom SPFx development:

`rubrica-colleghi`, `timeline-aziendale`, `faq`, `come-fare-per`, `rassegna-stampa`, `avvisi-homepage`, `bacheca-sindacale`, `bacheca-scambio`, `new-entry`, `oggi-presentiamo`, `sezione-welfare`, `kudos`, `anniversari`, `sezione-progetti`

**Total Phase 3: 14 blocks** — 9 original SPFx blocks (minus `meteo` and `fusi-orari`, now native) + 5 formerly-Phase-2-PnP blocks without native equivalent (`rubrica-colleghi`, `timeline-aziendale`, `faq`, `come-fare-per`, `rassegna-stampa`).

---

## Success Criteria

1. All 7 new MAPPINGS entries produce a valid web part node with the verified GUID
2. `sezione-fiere` and `sezione-mostre` map to the same `highlightedContentMapper` as `carosello-contenuti`
3. Pages with `multilingua` block have `pageFlags.mlpEnabled === true`
4. MLP activation is attempted during provisioning when `mlpEnabled` is true; failure is logged as warning (non-blocking)
5. All new tests pass in `node --test src/**/*.test.js`
6. `meteo` and `fusi-orari` no longer appear in `unmappedBlocks[]` after deploy
