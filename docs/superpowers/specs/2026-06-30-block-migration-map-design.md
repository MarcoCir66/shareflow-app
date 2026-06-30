# Block Migration Map — Shareflow → SharePoint Design Spec

**Date:** 2026-06-30
**Status:** Approved
**Scope:** Complete fidelity analysis of all 49 Shareflow blocks, architectural decisions for Tier X blocks, updated phase roadmap

---

## Problem

The existing block mapping spec (2026-06-26) defines a Phase 1/2/3 roadmap but does not address:
- Which blocks have UX/functional delta in the native SP mapping
- What the system does when a block has no SP web part equivalent (Tier X)
- Whether Phase 3 (SPFx) scope can be reduced by reclassifying blocks to native mappings
- How the Shareflow configurator communicates SP constraints to the user

This spec resolves all four questions and serves as the authoritative migration reference.

---

## Fidelity Tiers

| Tier | Definition |
|---|---|
| **A** | Native SP web part — full functional coverage, no delta |
| **B** | Native SP web part — partial coverage, some Shareflow props lost or UX diverges |
| **C** | PnP Modern Web Parts — good coverage, requires IT admin `.sppkg` install |
| **D** | SPFx custom web part — requires in-house or contracted development |
| **X** | No web part produced — semantic mapping to SP feature or skip |

---

## Complete Fidelity Matrix

### COMMUNICATION

| Block ID | Label | Tier | SP Mapping | Delta / Notes |
|---|---|---|---|---|
| `news-corporate` | News - Corporate | **B** | News WP | `commentsEnabled`, `likesEnabled` → badge tooltip (see §Tier B Props); `mandatoryRead` → resolved in separate spec |
| `news-country` | News - Country | **B** | News WP | idem |
| `news-sede` | News - Sede | **B** | News WP | idem |
| `news-funzione` | News - Funzione | **B** | News WP | idem |
| `commenti-contenuto` | Commenti sul contenuto | **X** | page-level | SP comments = page toggle. If block present → `commentsDisabled: false` on page via Graph. Phase 1 extension. |
| `like-contenuto` | Like sul contenuto | **X** | page-level | SP reactions = page toggle. If block present → enable reactions via Graph. Phase 1 extension. |
| `avvisi-homepage` | Avvisi in home page | **D** | SPFx custom | Alert visual (color, warning icon, top-of-page) has no native SP equivalent. Approximation with Highlighted Content loses all urgency semantics. Phase 3. |
| `eventi-corporate` | Eventi - Corporate | **B** | Group Calendar WP | Scope/audience not configurable per-WP; shows M365 Group calendar without filtering |
| `eventi-country` | Eventi - Country | **B** | Group Calendar WP | idem |
| `eventi-sede` | Eventi - Sede | **B** | Group Calendar WP | idem |
| `eventi-funzione` | Eventi - Funzione | **B** | Group Calendar WP | idem |
| `sezione-fiere` | Sezione Fiere | **C** | PnP Highlighted Content | — |
| `sezione-mostre` | Sezione Mostre | **C** | PnP Highlighted Content | — |
| `multimedia-gallery` | Multimedia Gallery | **B** | Stream WP | URL must be a Stream channel/playlist; arbitrary video URLs unsupported |
| `countdown-lancio` | Countdown lancio | **C** | PnP Countdown Timer | — |
| `rassegna-stampa` | Rassegna stampa | **C** | PnP RSS Reader | RSS deprecated in modern SP; PnP RSS Reader is the only viable path |
| `bacheca-sindacale` | Bacheca Sindacale | **D** | SPFx custom | Structured content with publication rules; no native/PnP equivalent |
| `bacheca-scambio` | Bacheca Cerco/Scambio | **D** | SPFx custom | UGC peer-to-peer; no native/PnP equivalent |
| `linkedin-feed` | Feed LinkedIn | **X** | skip + warning | LinkedIn blocks iframe (`X-Frame-Options`). No public API without partnership. Permanent gap — pre-deploy warning only. |
| `calendario-eventi` | Calendario | **B** | Group Calendar WP | Calendar view in SP WP is less rich than Shareflow canvas; same audience limitation as eventi-* |
| `carosello-contenuti` | Carosello | **B** ⚠️ | Highlighted Content WP | **BUG:** GUID `e377ea37` currently commented out in `blockToWebpart.js` (suspected Bing Maps GUID). Verify correct Highlighted Content GUID before enabling. |

### LEARNING

| Block ID | Label | Tier | SP Mapping | Delta / Notes |
|---|---|---|---|---|
| `new-entry` | New entry | **D** | SPFx custom | New employee spotlight with HR data; People WP too generic |
| `oggi-presentiamo` | Oggi presentiamo… | **D** | SPFx custom | Rotating editorial spotlight; Highlighted Content does not replicate interaction |
| `polls-survey` | Polls & Survey | **A** | Forms WP | — |
| `sezione-welfare` | Sezione Welfare | **D** | SPFx custom | HR/welfare aggregator with category access logic; no WP equivalent |
| `kudos` | Kudos | **D** | SPFx / Viva Engage | If tenant has Viva Engage → Praise feature. Otherwise SPFx. License dependency. |
| `anniversari` | Anniversari | **D** | SPFx custom | Viva Insights has anniversaries but not as standalone WP; requires Graph People API |
| `feedback-utenti` | Feedback Utenti | **B** | Forms WP | Same mapping as `polls-survey`. Delta: no aggregation dashboard inside SP (results on Forms.microsoft.com). Reclassified from Phase 3. |

### PRODUCTIVITY

| Block ID | Label | Tier | SP Mapping | Delta / Notes |
|---|---|---|---|---|
| `procedure` | Procedure | **C** | PnP List | — |
| `sezione-progetti` | Sezione Progetti | **D** | SPFx custom | No Planner/Projects WP for modern SP pages |
| `meteo` | Meteo | **D** | SPFx custom | No native weather WP; requires external API (e.g. OpenWeatherMap) |
| `fusi-orari` | Fusi orari | **D** | SPFx custom | No world clock WP in SP or PnP |
| `multilingua` | Multilingua | **X** | MLP activation | SP Multilingual Pages (MLP) is a site/page feature, not a positional widget. If block present → provisioning activates MLP on the site. Phase 2. |
| `collegamenti-rapidi` | Collegamenti Rapidi | **A** | Quick Links WP | — |
| `pulsante-cta` | Pulsante CTA | **A** | Button WP | — |
| `titolo-libero` | Titolo Libero | **A** | Text WP | — |
| `embed-custom` | Embed Personalizzato | **A** | Embed WP | Caveat: sites with `X-Frame-Options: SAMEORIGIN` will block rendering |

### KNOWLEDGE BASE

| Block ID | Label | Tier | SP Mapping | Delta / Notes |
|---|---|---|---|---|
| `motore-ricerca` | Motore di ricerca | **A** | Search Box WP | — |
| `faq` | FAQ | **C** | PnP Accordion | — |
| `come-fare-per` | Come fare per | **C** | PnP Accordion | — |
| `organigramma` | Organigramma | **C** | PnP Org Chart | — |
| `rubrica-colleghi` | Rubrica colleghi | **C** | PnP People Directory | — |
| `contatti-chiave` | Contatti Chiave | **B** | People WP | Reclassified from Phase 3. People WP covers name/title/email/photo for fixed list of contacts. Delta: layout less customizable than Shareflow design. |
| `documenti` | Documenti | **A** | Document Library WP | — |
| `chi-siamo` | Sezione Chi siamo | **A** | Text WP | — |
| `desc-country` | Desc. Country | **A** | Text WP | — |
| `desc-sede` | Desc. Sede | **A** | Text WP | — |
| `desc-funzione` | Desc. Funzione | **A** | Text WP | — |
| `timeline-aziendale` | Timeline Aziendale | **C** | PnP Timeline | — |

---

## Block Count by Tier

| Tier | Count |
|---|---|
| A — Native full | 11 |
| B — Native partial | 13 |
| C — PnP | 10 |
| D — SPFx custom | 11 |
| X — Semantic / skip | 4 |
| **Total** | **49** |

---

## Architectural Decisions

### Decision 1 — Tier X Pattern: Semantic Mapping

When a Shareflow block has no SP web part equivalent, the provisioning pipeline maps the block's **intent** to the closest SP feature, rather than producing a placeholder or failing silently.

**Rule:** if semantic mapping exists → trigger the SP feature during provisioning, produce no web part node. If no semantic mapping exists → skip the block, add it to the pre-deploy `unmappedBlocks[]` warning.

| Block | Semantic mapping | Phase |
|---|---|---|
| `commenti-contenuto` | `PATCH page` with `commentsDisabled: false` via Graph API | Phase 1 ext. |
| `like-contenuto` | Enable page reactions via Graph API | Phase 1 ext. |
| `multilingua` | Activate MLP on the site during provisioning | Phase 2 |
| `linkedin-feed` | No semantic mapping → skip + warning | — |

**Implementation note for `commenti-contenuto` / `like-contenuto`:**
These blocks do not occupy a position in the canvas layout. Their presence in `page.blocks` (anywhere on any section) is what triggers the page-level setting. `pageBuilder.js` must scan all blocks before building `canvasLayout` and pass the flags to `provisioningJobs.js` for the page PATCH call.

### Decision 2 — Tier B Props Delta: Contextual Badge

Props on Tier B blocks that do not propagate to SP web part properties remain visible and editable in the Shareflow config panel. They receive an inline badge (chip "SP") with a contextual tooltip explaining the SP behavior.

**Tooltip text per prop:**

| Prop | Tooltip |
|---|---|
| `commentsEnabled` (news/eventi) | "In SharePoint i commenti si abilitano a livello pagina tramite il blocco 'Commenti sul contenuto'" |
| `likesEnabled` (news/eventi) | "In SharePoint le reazioni si abilitano a livello pagina tramite il blocco 'Like sul contenuto'" |
| `mandatoryRead` | Resolved in separate spec (2026-06-25-phase6-mandatory-read-design.md) |

Props retain their values in canvas state (retrocompatible). The badge is rendered by the prop component in the right sidebar config panel, conditional on prop presence in a `SP_UNSUPPORTED_PROPS` constant.

### Decision 3 — Reclassifications from Phase 3

Two blocks previously assigned to Phase 3 (SPFx) are reclassified to Tier B (native partial), reducing Phase 3 scope:

| Block | Old | New | Mapping |
|---|---|---|---|
| `contatti-chiave` | Phase 3 SPFx | Tier B | People WP |
| `feedback-utenti` | Phase 3 SPFx | Tier B | Forms WP (= `polls-survey`) |

`avvisi-homepage` remains Phase 3: the alert visual (colored banner, warning icon, fixed top-of-page position) has no viable native approximation. Downgrading to Highlighted Content would lose the urgency semantics that define the block's purpose.

---

## Updated Phase Roadmap

### Phase 1 — Native web parts (already implemented + extension)

**Existing mappings (21 active + 1 pending fix):**
All blocks currently in `blockToWebpart.js` MAPPINGS table, plus:
- `carosello-contenuti`: re-enable once Highlighted Content GUID is verified (blocked by GUID bug)
- `contatti-chiave`: add People WP mapper (reclassified from Phase 3)
- `feedback-utenti`: add Forms WP mapper (identical to `polls-survey`, reclassified from Phase 3)

**Phase 1 extension — semantic mapping for Tier X:**
- `commenti-contenuto` → `pageBuilder.js` scans for block presence → flag passed to provisioning → Graph API page PATCH
- `like-contenuto` → same pattern

**Phase 1 total coverage: 26 blocks** (21 existing + carosello pending GUID fix + contatti-chiave + feedback-utenti + commenti-contenuto semantic + like-contenuto semantic)

### Phase 2 — PnP Modern Web Parts

Requires IT admin to install PnP Modern Web Parts `.sppkg` in tenant app catalog. ShareFlow generates a deployment guide (Markdown + PowerShell) when PnP blocks are present.

| Block | PnP Web Part |
|---|---|
| `organigramma` | PnP Org Chart |
| `rubrica-colleghi` | PnP People Directory |
| `timeline-aziendale` | PnP Timeline |
| `countdown-lancio` | PnP Countdown Timer |
| `faq` | PnP Accordion |
| `come-fare-per` | PnP Accordion |
| `rassegna-stampa` | PnP RSS Reader |
| `procedure` | PnP List with custom view |
| `sezione-fiere` | PnP Highlighted Content |
| `sezione-mostre` | PnP Highlighted Content |
| `multilingua` | MLP activation (no WP — semantic) |

**Phase 2 total: 11 blocks**

### Phase 3 — SPFx Custom Web Parts

Requires development of custom SPFx solution (`.sppkg`). ShareFlow generates the manifest.

| Block | Notes |
|---|---|
| `avvisi-homepage` | Alert banner with urgency visual |
| `bacheca-sindacale` | Structured union bulletin |
| `bacheca-scambio` | UGC peer-to-peer marketplace |
| `new-entry` | New employee spotlight with HR data |
| `oggi-presentiamo` | Rotating editorial spotlight |
| `sezione-welfare` | HR/welfare aggregator |
| `kudos` | Recognition system (or Viva Engage if licensed) |
| `anniversari` | Work anniversaries via Graph People API |
| `sezione-progetti` | Project overview |
| `meteo` | Weather widget (external API) |
| `fusi-orari` | World clock widget (no native/PnP equivalent) |

**Phase 3 total: 11 blocks** *(was 13 before reclassifications)*

### Permanent gap

| Block | Reason |
|---|---|
| `linkedin-feed` | LinkedIn blocks iframe + no public feed API without partnership. Pre-deploy warning only. |

---

## Implementation Deltas

### `server/src/blockToWebpart.js`

Add to MAPPINGS:
- `contatti-chiave` → `peopleMapper` (People WP)
- `feedback-utenti` → `formsMapper` (identical to `polls-survey`)
- `carosello-contenuti` → `highlightedContentMapper` (re-enable after GUID verification)

`commenti-contenuto` and `like-contenuto` are **not** added to MAPPINGS — they produce no web part node. Instead, add to a separate export:

```js
export const SEMANTIC_PAGE_FLAGS = ['commenti-contenuto', 'like-contenuto', 'multilingua']
```

### `server/src/pageBuilder.js`

`buildCanvasLayout(page, ctx)` gains page-level flag detection:

```js
const allBlocks = page.sections.flatMap(s => s.columns.flatMap(c => c.blocks))
const flags = {
  commentsEnabled: allBlocks.some(b => b.blockId === 'commenti-contenuto'),
  reactionsEnabled: allBlocks.some(b => b.blockId === 'like-contenuto'),
}
return { canvasLayout, unmappedBlocks, pageFlags: flags }
```

### `server/src/provisioningJobs.js`

Step 5 (Configure Pages & Webparts) uses `pageFlags` from `buildCanvasLayout` to PATCH the page with:
```json
{ "commentsDisabled": false }
```
via `PATCH /beta/sites/{id}/pages/{pageId}` when `commentsEnabled` is true.

Reactions toggle requires a separate Graph API call if available; otherwise logged as warning.

### `client/src/components/sidebar-right` (prop badge)

Add `SP_UNSUPPORTED_PROPS` constant:
```js
export const SP_UNSUPPORTED_PROPS = {
  commentsEnabled: "In SharePoint i commenti si abilitano a livello pagina tramite il blocco 'Commenti sul contenuto'",
  likesEnabled:    "In SharePoint le reazioni si abilitano a livello pagina tramite il blocco 'Like sul contenuto'",
}
```

Prop rendering component checks if `propKey` is in `SP_UNSUPPORTED_PROPS` → renders badge chip with tooltip. Props remain enabled and editable.

---

## Open Items

| Item | Owner | Notes |
|---|---|---|
| Verify Highlighted Content WP GUID | Dev | `e377ea37-9047-43b9-8cdb-a761be2f8e09` — confirm via GET on a real SP page with this WP |
| Graph API endpoint for page reactions | Dev | Verify if SP modern page reactions are settable via Graph beta |
| `carosello-contenuti` re-enable | Dev | Blocked on GUID verification |
| PnP deployment guide generator | Dev | Phase 2 prerequisite |

---

## Success Criteria

1. All 49 blocks are assigned a tier and a phase — no block is "undefined"
2. `contatti-chiave` and `feedback-utenti` are deployed as native WPs in Phase 1 without SPFx
3. Pages with `commenti-contenuto` block have SP page comments enabled after deploy; pages without it have comments disabled
4. `linkedin-feed` appears in pre-deploy `unmappedBlocks[]` warning with a specific, actionable message
5. `commentsEnabled` and `likesEnabled` props on news/eventi blocks show badge tooltip in config panel
6. Phase 3 scope is 10 blocks (down from 12 before this spec)
