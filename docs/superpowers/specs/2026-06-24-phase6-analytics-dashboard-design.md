# Phase 6, sub-project 4 — Intranet Analytics dashboard — design spec

**Date:** 2026-06-24
**Source:** "Intranet Advanced Analytics – Requisiti Funzionali & Esperienza Intranet Manager" (E. Sasselli, 23/06/2026), an external requirements document proposing a 3-phase ("Fase A/B/C") extension of SharePoint Online's native usage analytics for the Intranet Manager persona.
**Scope:** Fase A only ("Estensione Base") — the only phase with concrete, build-ready dashboard requirements. Fase B (site/hub clustering, Audit Log data, anomaly/correlation detection) and Fase C (AI-generated insights, audience segmentation) are explicitly out of scope, deferred to a future sub-project.

## Goal

Add a new "Analytics" area to ShareFlow giving the Intranet Manager 3 usage dashboards (Intranet Overview, Sites Analytics, Content & Page Analytics) with period selection and period-over-period comparison — closing the Fase A gap identified in the source document. This is **not** a canvas block: unlike every other Phase 6 deliverable, this view is reserved for whoever is using the ShareFlow configurator, not content placed on a published intranet page. It is also **not** a real integration: all data is static, deterministic mock data, matching the convention every other block in ShareFlow already follows (zero live external data sources, one exception being the existing SharePoint-provisioning-only Graph client, which this feature does not touch or extend).

## Section 1 — Entry point and navigation

A new "Analytics" button in `Navbar.jsx` (icon: `LineChart` from `lucide-react`, confirmed present in the installed package — distinct from the existing `polls-survey` block's `BarChart3` icon to avoid visual confusion), next to the existing "Anteprima"/"Pubblica su SharePoint" buttons. Clicking it replaces the entire `WorkspaceShell` (left sidebar / canvas / right sidebar) with a new `AnalyticsView`, in the same browser tab — unlike "Anteprima", which opens a separate tab/window, this is a same-tab mode swap with an explicit "Torna all'editor" button to return. `AnalyticsView` is never reachable from `PreviewApp.jsx` (the read-only published-site preview) — it has nothing to do with page content and is editor-only tooling.

`AnalyticsView` has its own internal tab bar with 3 tabs, one per dashboard: **Overview**, **Siti**, **Contenuti**. No drill-down to a per-site or per-content detail page — the source document itself marks both as "facoltativa" (optional) with no defined requirements ("Visual principali TBD"), so they're out of scope here, not merely deferred-but-implied.

`AnalyticsView` is entirely decoupled from the page/section/widget reducer and from `DndContext` — it reads only its own static mock data module, never `state.pages`.

## Section 2 — Mock data model

A new fixture file (`analyticsMockData.js`) holds one complete dataset per supported period. Four periods are supported, matching a subset of the document's proposed options: **"Ultimi 30 giorni"**, **"Ultimi 6 mesi"**, **"Anno corrente (YTD)"**, **"Anno scorso"**. The document's 5th option, free-form "Periodo personalizzato" (custom date range), is out of scope for this mock-data v1: with a fixed set of canned datasets, an arbitrary date range has nothing real to compute, and a control that looks functional but silently does nothing would be worse than omitting it.

Every numeric metric is stored as a pair `{ value, previousValue }`, not a pre-computed percentage. A new pure helper, `computeDelta(value, previousValue)`, returns the percentage change — unit-tested with Vitest, following the same pure-logic-gets-a-unit-test convention as `getMonthGrid`/`wrapIndex` from sub-project 2. The period-comparison toggle (Section 3) only ever shows/hides delta badges computed from this helper; it never needs a second dataset.

A fixed list of ~12 mock "sites" backs Dashboard 2 and the "Siti popolari" ranking in Dashboard 1: the 5 existing site-bundle names (`siteTemplates.js`: Comunicazione Corporate, Portale HR, Percorso Onboarding, Employee Hub, Centro Formazione) plus several invented names, to make a believable top-10 ranking. ShareFlow has no real multi-site registry (it configures one site at a time), so this list is entirely fixture data, not derived from any real user state.

Filters that don't require extra datasets, all real client-side filtering over the existing static data:
- **Selettore periodo** picks which of the 4 datasets is active.
- **Toggle confronto periodi** shows/hides `computeDelta`-derived badges on the active dataset — no extra data needed.
- **Selettore siti** (Dashboard 2) and **filtro tipo contenuto** (Dashboard 3) filter the displayed rows/series from the active dataset's arrays — no extra data needed.

Each item in a ranking array (a site, a page, a news post, a document) carries every field it can be ranked by (e.g. a site entry has both `uniqueVisitors` and `totalVisits`), all as fixture data — no item is missing a field a UI control might rank it by. Re-ranking by a different field (the "per visite"/"per visitatori univoci" toggle in Dashboard 1, the metric dropdown in Dashboard 2) is a trivial client-side `toSorted` by the selected field, not a meaningful algorithm worth a dedicated pure-logic file/unit test — `computeDelta` remains the only helper extracted and unit-tested for this feature, consistent with the project's existing convention that only genuinely non-trivial logic gets pulled into its own tested module.

## Section 3 — Dashboard content

**Dashboard 1 — Intranet Overview** (`AnalyticsOverview.jsx`)
- 4 KPI cards: Visitatori unici, Visite totali, Media visite/visitatore (computed: `totalVisits / uniqueVisitors`), Tempo medio per utente.
- 1 trend chart (Recharts area or line chart): visits over time across the active period.
- 4 ranked lists (plain styled lists, not Recharts — a "rank + name + number" row, not a chart): Siti popolari, Pagine popolari, Post di notizie popolari, Documenti popolari. Each has a "per visite" / "per visitatori univoci" toggle that re-sorts/re-displays the same fixture array by a different field.
- 2 small bar charts (Recharts): Accessi per dispositivo (Desktop/Mobile/Tablet), Accessi per fascia oraria (hourly buckets).
- Selettore periodo + toggle confronto periodi, shared chrome (Section 4) shown above the dashboard content; comparison badges appear on the 4 KPI cards when the toggle is on.

**Dashboard 2 — Sites Analytics** (`AnalyticsSites.jsx`)
- 1 horizontal ranked bar chart (Recharts) showing the top sites, with a metric dropdown that changes which field the ranking and bar lengths represent: Visitatori unici / Visite totali / Media visite per visitatore / Tempo medio per utente / Accessi per dispositivo / Accessi per fascia oraria.
- Selettore siti: multi-select over the full ~12-site list, pre-checked with the top 10 by the currently selected metric for the active period; unchecking/checking changes which sites' bars appear (no recomputation, pure filter).
- Selettore periodo + toggle confronto periodi (shared chrome).

**Dashboard 3 — Content & Page Analytics** (`AnalyticsContent.jsx`)
- 6 ranked tables: Top 10 and Worst 10 each for Pagine / News / Documenti, columns: nome contenuto, visitatori univoci, visite, media visite/visitatore.
- 2 special tables: **Contenuti in calo** and **Contenuti in crescita** — columns: nome contenuto, valore periodo precedente, valore attuale, delta % (via `computeDelta`).
- Filtro per sito (tutti / un sito specifico / un gruppo — for this mock v1, a simple single-select: "Tutti i siti" or one specific site from the ~12-site list; multi-site grouping is Fase B's "clusterizzazione" concept and out of scope here) and filtro per tipo di contenuto (tutti / solo news / solo pagine / solo documenti) — both filter which rows appear across the 8 tables above.
- Selettore periodo + toggle confronto periodi (shared chrome).

## Section 4 — Shared chrome, dependency, i18n, testing

**Shared filter chrome:** a single `AnalyticsFilterBar.jsx` (period selector + comparison toggle) rendered once by `AnalyticsView.jsx` and shared across all 3 dashboard tabs via shared state (the active period and comparison-toggle state live in `AnalyticsView`, not duplicated per dashboard) — switching tabs keeps the same period/comparison selection.

**New dependency:** [Recharts](https://recharts.org/) (peer-compatible with React 19, confirmed: `^16.8.0 || ... || ^19.0.0`) — the first charting library and the first new frontend dependency introduced across all of Phase 6. Used only for the trend chart, the 2 device/hourly bar charts, and Dashboard 2's ranked bar chart; the ranked lists/tables in Dashboards 1 and 3 are plain styled markup, not Recharts components.

**i18n:** a new `analytics.*` namespace in all 4 locale files (it/en/fr/de) for dashboard titles, KPI labels, period names, filter labels, table headers. The ~12 mock site names and content-item names are fixture data (page content, not UI chrome) and stay as plain strings, same treatment as every other block's mock content.

**Testing:**
- Vitest: `computeDelta(value, previousValue)` and any other pure filter/sort helper — no DOM, same convention as `calendarGrid.js`/`carouselIndex.js`.
- Playwright e2e: open Analytics from the Navbar; verify KPIs render; switch period and verify displayed numbers change; toggle comparison and verify a delta badge appears; switch between the 3 dashboard tabs; filter sites (Dashboard 2) and content type (Dashboard 3) and verify the visible rows change; return to the editor via "Torna all'editor".
- Accessibility (axe-core) test on `AnalyticsView`, matching the existing per-screen a11y test convention.

## Out of scope

- Fase B (site/hub clustering, Audit Log data, anomaly/correlation detection) and Fase C (AI-generated insights, audience segmentation) — both deferred to a future sub-project.
- Any real integration with Microsoft Graph/SharePoint usage-reporting APIs, or any server-side data historicization/persistence.
- Per-site and per-content detail drill-down pages — the source document marks both "facoltativa" with undefined visuals.
- "Periodo personalizzato" (free-form date range picker).
- Role-based access control for the Analytics view — ShareFlow has no role/permission system today (same known gap blocking Phase 6 sub-project 5); the view is reachable by anyone who can open ShareFlow, like every other feature today.
- Any change to `PreviewApp.jsx` — Analytics is editor-only, never part of the published-site preview.
- Multi-site "cluster" grouping in Dashboard 3's site filter (Fase B concept) — only a flat "all sites" / "one site" filter is in scope.
