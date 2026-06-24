# Phase 6 Sub-Project 4 — Intranet Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new, editor-only "Analytics" view to ShareFlow with 3 mock-data usage dashboards (Overview, Sites, Content & Page Analytics), period selection, and period-over-period comparison — Fase A of the source requirements document.

**Architecture:** A new full-screen `AnalyticsView` replaces `WorkspaceShell` (toggled from a new Navbar button), holding shared period/comparison state and an internal 3-tab switch. All data comes from a single deterministic fixture module (`analyticsMockData.js`) built from small seed tables and a period-scaling function — no backend, no Graph calls, no randomness. Recharts (new dependency) renders the trend/bar charts; ranked lists and tables are plain markup.

**Tech Stack:** React 19, Recharts (new), `lucide-react`, `react-i18next`, Vitest (pure logic), Playwright + axe-core (e2e/a11y).

## Global Constraints

- `npm install recharts` in `client/` — the only new dependency this plan introduces, used only for the trend line chart (Dashboard 1), the 2 device/hourly bar charts (Dashboard 1), and the ranked bar chart (Dashboard 2). Ranked lists/tables (Dashboards 1 and 3) are plain markup, never Recharts.
- All data is static and deterministic: one fixture module, 4 supported periods (`last30`, `last6months`, `ytd`, `lastyear`), no `Math.random`, no live calls.
- `AnalyticsView` never touches `state.pages`/the configurator reducer/`DndContext`. It is reachable only from the main editor (`App.jsx`'s `AppInner`), never from `PreviewApp.jsx`.
- Colors for Recharts (hex, since SVG fill/stroke can't use Tailwind classes): primary `#0078D4` (blue), secondary/comparison `#00B4FF` (blue-electric), grid/axis `#8899AA` (slate-light), chart background `#FFFFFF` (surface-card).
- i18n: new `analytics.*` namespace in all 4 locale files (it/en/fr/de) for every UI label; the ~12 mock site names and ~15 mock items per content type are fixture data (page content, not UI chrome) and stay plain strings.
- "Periodo personalizzato", Fase B/C, per-site/per-content drill-down pages, and any real Graph/Power BI integration are explicitly out of scope (see spec's Out of Scope section) — do not add stubs or hooks for them.
- Test commands (from `client/`): `npm run test:unit` (Vitest), `npm run test:e2e` (Playwright).

---

### Task 1: Mock data model and `computeDelta`

**Files:**
- Create: `client/src/data/analyticsMockData.js`
- Create: `client/src/utils/analyticsMath.js`
- Test: `client/src/utils/analyticsMath.test.js`

**Interfaces:**
- Produces: `computeDelta(value, previousValue)` → number (percentage change, 1 decimal, e.g. `15.2`; returns `0` if `previousValue` is `0`). Consumed by every dashboard component (Tasks 3-5) wherever a comparison badge is shown.
- Produces: `PERIODS` (array of 4 period keys), `PERIOD_LABELS` (object keyed by period, each a `{it,en,fr,de}` multilingual label), `getAnalyticsData(period)` → `{ hub, sites, pages, news, documents }` object (exact shape below). Consumed by `AnalyticsView`/dashboards in Tasks 2-5.

- [ ] **Step 1: Write the failing test for `computeDelta`**

```js
import { test, expect } from 'vitest'
import { computeDelta } from './analyticsMath.js'

test('computeDelta returns the percentage change rounded to 1 decimal', () => {
  expect(computeDelta(115, 100)).toBe(15)
  expect(computeDelta(88, 100)).toBe(-12)
  expect(computeDelta(123, 100)).toBe(23)
})

test('computeDelta returns 0 when previousValue is 0, avoiding division by zero', () => {
  expect(computeDelta(50, 0)).toBe(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/utils/analyticsMath.test.js`
Expected: FAIL — `analyticsMath.js` does not exist yet.

- [ ] **Step 3: Implement `computeDelta`**

```js
export function computeDelta(value, previousValue) {
  if (!previousValue) return 0
  return Math.round(((value - previousValue) / previousValue) * 1000) / 10
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd client && npx vitest run src/utils/analyticsMath.test.js`
Expected: PASS

- [ ] **Step 5: Create the mock data fixture**

Create `client/src/data/analyticsMockData.js` with this exact content:

```js
export const PERIODS = ['last30', 'last6months', 'ytd', 'lastyear']

export const PERIOD_LABELS = {
  last30:      { it: 'Ultimi 30 giorni',        en: 'Last 30 days',        fr: '30 derniers jours',        de: 'Letzte 30 Tage' },
  last6months: { it: 'Ultimi 6 mesi',           en: 'Last 6 months',       fr: '6 derniers mois',          de: 'Letzte 6 Monate' },
  ytd:         { it: 'Anno corrente (YTD)',     en: 'Current year (YTD)',  fr: 'Année en cours (YTD)',      de: 'Aktuelles Jahr (YTD)' },
  lastyear:    { it: 'Anno scorso',             en: 'Last year',           fr: 'Année dernière',            de: 'Letztes Jahr' },
}

// factor: multiplier applied to the last30 baseline to approximate this period's totals.
// prevFactor: multiplier applied to THIS period's value to derive the prior comparable period's value.
const PERIOD_SCALE = {
  last30:      { factor: 1,    prevFactor: 0.88 },
  last6months: { factor: 5.6,  prevFactor: 0.93 },
  ytd:         { factor: 4.2,  prevFactor: 0.97 },
  lastyear:    { factor: 11.5, prevFactor: 0.90 },
}

// 30-day baseline per site. avgTimeSeconds/mobilePct/afternoonPct don't scale with period length.
const SITE_SEEDS = [
  { name: 'Comunicazione Corporate', uniqueVisitors: 4200, visits: 9800,  avgTimeSeconds: 145, mobilePct: 38, afternoonPct: 41 },
  { name: 'Employee Hub',            uniqueVisitors: 5400, visits: 12100, avgTimeSeconds: 180, mobilePct: 45, afternoonPct: 39 },
  { name: 'Portale HR',              uniqueVisitors: 3100, visits: 6900,  avgTimeSeconds: 210, mobilePct: 30, afternoonPct: 44 },
  { name: 'IT & Tools',              uniqueVisitors: 2600, visits: 5200,  avgTimeSeconds: 95,  mobilePct: 22, afternoonPct: 36 },
  { name: 'Centro Formazione',       uniqueVisitors: 1900, visits: 4400,  avgTimeSeconds: 260, mobilePct: 50, afternoonPct: 33 },
  { name: 'Sede Milano',             uniqueVisitors: 1500, visits: 3100,  avgTimeSeconds: 130, mobilePct: 41, afternoonPct: 40 },
  { name: 'Country Germania',        uniqueVisitors: 1200, visits: 2500,  avgTimeSeconds: 150, mobilePct: 35, afternoonPct: 38 },
  { name: 'Country Francia',         uniqueVisitors: 1100, visits: 2300,  avgTimeSeconds: 140, mobilePct: 33, afternoonPct: 37 },
  { name: 'Sede Torino',             uniqueVisitors: 980,  visits: 1950,  avgTimeSeconds: 120, mobilePct: 39, afternoonPct: 42 },
  { name: 'Percorso Onboarding',     uniqueVisitors: 850,  visits: 2300,  avgTimeSeconds: 320, mobilePct: 55, afternoonPct: 30 },
  { name: 'Welfare & Benefit',       uniqueVisitors: 760,  visits: 1600,  avgTimeSeconds: 175, mobilePct: 48, afternoonPct: 35 },
  { name: 'Procurement',             uniqueVisitors: 540,  visits: 1050,  avgTimeSeconds: 100, mobilePct: 20, afternoonPct: 45 },
]

// 30-day baseline per content item: visits/uniqueVisitors now vs previousVisits/previousUniqueVisitors
// (the immediately preceding 30-day window). The current/previous ratio is preserved across periods.
// Every content item also carries `site` (one of SITE_SEEDS' names), so Dashboard 3's
// site filter can narrow rows for real, not just decorate a dropdown that filters nothing.
const PAGE_SEEDS = [
  { name: 'Homepage Comunicazione',  site: 'Comunicazione Corporate', uniqueVisitors: 3800, visits: 8200, previousUniqueVisitors: 3500, previousVisits: 7400 },
  { name: 'Policy Smart Working',    site: 'IT & Tools',              uniqueVisitors: 2100, visits: 4400, previousUniqueVisitors: 2050, previousVisits: 4300 },
  { name: 'Guida Onboarding',        site: 'Percorso Onboarding',     uniqueVisitors: 1450, visits: 3100, previousUniqueVisitors: 1500, previousVisits: 3300 },
  { name: 'FAQ Benefit',             site: 'Welfare & Benefit',       uniqueVisitors: 1200, visits: 2600, previousUniqueVisitors: 900,  previousVisits: 1850 },
  { name: 'Organigramma',            site: 'Employee Hub',            uniqueVisitors: 980,  visits: 2050, previousUniqueVisitors: 1000, previousVisits: 2100 },
  { name: 'Procedure Sicurezza',     site: 'IT & Tools',              uniqueVisitors: 760,  visits: 1500, previousUniqueVisitors: 1450, previousVisits: 2900 },
  { name: 'Modulistica HR',          site: 'Portale HR',              uniqueVisitors: 690,  visits: 1380, previousUniqueVisitors: 700,  previousVisits: 1400 },
  { name: 'Calendario Eventi',       site: 'Comunicazione Corporate', uniqueVisitors: 1100, visits: 2350, previousUniqueVisitors: 950,  previousVisits: 2000 },
  { name: 'Contatti IT',             site: 'IT & Tools',              uniqueVisitors: 540,  visits: 1050, previousUniqueVisitors: 560,  previousVisits: 1090 },
  { name: 'Linee Guida Brand',       site: 'Comunicazione Corporate', uniqueVisitors: 320,  visits: 600,  previousUniqueVisitors: 610,  previousVisits: 1180 },
  { name: 'Manuale Qualità',         site: 'Procurement',             uniqueVisitors: 410,  visits: 790,  previousUniqueVisitors: 800,  previousVisits: 1550 },
  { name: 'Rubrica Aziendale',       site: 'Employee Hub',            uniqueVisitors: 1650, visits: 3500, previousUniqueVisitors: 1580, previousVisits: 3350 },
  { name: 'Policy Privacy',          site: 'Portale HR',              uniqueVisitors: 290,  visits: 540,  previousUniqueVisitors: 300,  previousVisits: 560 },
  { name: 'Catalogo Fornitori',      site: 'Procurement',             uniqueVisitors: 180,  visits: 320,  previousUniqueVisitors: 350,  previousVisits: 640 },
  { name: 'Bacheca Annunci Interni', site: 'Sede Milano',             uniqueVisitors: 230,  visits: 410,  previousUniqueVisitors: 220,  previousVisits: 390 },
]

const NEWS_SEEDS = [
  { name: 'Risultati Q1 2026',             site: 'Comunicazione Corporate', uniqueVisitors: 5200, visits: 6100, previousUniqueVisitors: 4400, previousVisits: 5000 },
  { name: 'Nuova Sede Milano',             site: 'Sede Milano',             uniqueVisitors: 3300, visits: 3900, previousUniqueVisitors: 2900, previousVisits: 3400 },
  { name: 'Lancio Piattaforma Welfare',    site: 'Welfare & Benefit',       uniqueVisitors: 2900, visits: 3400, previousUniqueVisitors: 2200, previousVisits: 2600 },
  { name: 'Intervista al CEO',             site: 'Comunicazione Corporate', uniqueVisitors: 2400, visits: 2800, previousUniqueVisitors: 2350, previousVisits: 2750 },
  { name: 'Premio Innovazione',            site: 'Centro Formazione',       uniqueVisitors: 1800, visits: 2100, previousUniqueVisitors: 1750, previousVisits: 2050 },
  { name: 'Settimana della Sicurezza',     site: 'IT & Tools',              uniqueVisitors: 1500, visits: 1750, previousUniqueVisitors: 1480, previousVisits: 1720 },
  { name: 'Newsletter Luglio',             site: 'Comunicazione Corporate', uniqueVisitors: 620,  visits: 700,  previousUniqueVisitors: 1750, previousVisits: 2050 },
  { name: 'Partnership Strategica',        site: 'Comunicazione Corporate', uniqueVisitors: 2050, visits: 2400, previousUniqueVisitors: 1900, previousVisits: 2200 },
  { name: 'Evento Natalizio',              site: 'Comunicazione Corporate', uniqueVisitors: 980,  visits: 1150, previousUniqueVisitors: 2400, previousVisits: 2850 },
  { name: 'Aggiornamento Smart Working',   site: 'IT & Tools',              uniqueVisitors: 1650, visits: 1950, previousUniqueVisitors: 1600, previousVisits: 1900 },
  { name: 'Risultati Sondaggio Clima',     site: 'Employee Hub',            uniqueVisitors: 1100, visits: 1300, previousUniqueVisitors: 1050, previousVisits: 1240 },
  { name: 'Nuovi Ingressi Q2',             site: 'Percorso Onboarding',     uniqueVisitors: 1400, visits: 1650, previousUniqueVisitors: 1100, previousVisits: 1300 },
  { name: 'Premio Sostenibilità',          site: 'Centro Formazione',       uniqueVisitors: 540,  visits: 630,  previousUniqueVisitors: 1300, previousVisits: 1550 },
  { name: 'Aggiornamento Org Chart',       site: 'Employee Hub',            uniqueVisitors: 460,  visits: 540,  previousUniqueVisitors: 440,  previousVisits: 520 },
  { name: 'Recap Evento Kickoff',          site: 'Percorso Onboarding',     uniqueVisitors: 720,  visits: 850,  previousUniqueVisitors: 1450, previousVisits: 1700 },
]

const DOCUMENT_SEEDS = [
  { name: 'Regolamento Aziendale.pdf',        site: 'Portale HR',              uniqueVisitors: 2100, visits: 2600, previousUniqueVisitors: 1950, previousVisits: 2400 },
  { name: 'Piano Ferie 2026.xlsx',             site: 'Portale HR',              uniqueVisitors: 3400, visits: 4100, previousUniqueVisitors: 2600, previousVisits: 3150 },
  { name: 'Modulo Rimborso Spese.docx',        site: 'Procurement',             uniqueVisitors: 1900, visits: 2300, previousUniqueVisitors: 1850, previousVisits: 2250 },
  { name: 'Policy Privacy.pdf',                site: 'Portale HR',              uniqueVisitors: 1100, visits: 1350, previousUniqueVisitors: 1080, previousVisits: 1320 },
  { name: 'Organigramma 2026.pdf',             site: 'Employee Hub',            uniqueVisitors: 1450, visits: 1750, previousUniqueVisitors: 1500, previousVisits: 1820 },
  { name: 'Manuale Benefit.pdf',               site: 'Welfare & Benefit',       uniqueVisitors: 980,  visits: 1180, previousUniqueVisitors: 700,  previousVisits: 850 },
  { name: 'Procedura Sicurezza.pdf',           site: 'IT & Tools',              uniqueVisitors: 870,  visits: 1050, previousUniqueVisitors: 1700, previousVisits: 2050 },
  { name: 'Template Presentazione.pptx',       site: 'Comunicazione Corporate', uniqueVisitors: 620,  visits: 740,  previousUniqueVisitors: 600,  previousVisits: 720 },
  { name: 'Guida Smart Working.pdf',           site: 'IT & Tools',              uniqueVisitors: 1300, visits: 1560, previousUniqueVisitors: 1250, previousVisits: 1500 },
  { name: 'Contratto Collettivo.pdf',          site: 'Portale HR',              uniqueVisitors: 540,  visits: 650,  previousUniqueVisitors: 1280, previousVisits: 1540 },
  { name: 'Catalogo Formazione.pdf',           site: 'Centro Formazione',       uniqueVisitors: 760,  visits: 910,  previousUniqueVisitors: 700,  previousVisits: 840 },
  { name: 'Listino Fornitori.xlsx',            site: 'Procurement',             uniqueVisitors: 310,  visits: 370,  previousUniqueVisitors: 600,  previousVisits: 720 },
  { name: 'Modulo Trasferta.docx',             site: 'Procurement',             uniqueVisitors: 480,  visits: 570,  previousUniqueVisitors: 460,  previousVisits: 550 },
  { name: 'Manuale Qualità Procurement.pdf',   site: 'Procurement',             uniqueVisitors: 260,  visits: 310,  previousUniqueVisitors: 250,  previousVisits: 300 },
  { name: 'Planning Ferie Reparti.xlsx',       site: 'Portale HR',              uniqueVisitors: 690,  visits: 820,  previousUniqueVisitors: 1380, previousVisits: 1640 },
]

const HOURLY_PCT = { morning: 26, lunch: 16, afternoon: 40, evening: 18 }
const TABLET_PCT = 8

function scaleSite(seed, factor, prevFactor) {
  const uniqueVisitors = Math.round(seed.uniqueVisitors * factor)
  const visits = Math.round(seed.visits * factor)
  return {
    name: seed.name,
    uniqueVisitors,
    visits,
    previousUniqueVisitors: Math.round(uniqueVisitors * prevFactor),
    previousVisits: Math.round(visits * prevFactor),
    avgTimeSeconds: seed.avgTimeSeconds,
    mobilePct: seed.mobilePct,
    afternoonPct: seed.afternoonPct,
  }
}

function scaleContentItem(seed, factor) {
  return {
    name: seed.name,
    site: seed.site,
    uniqueVisitors: Math.round(seed.uniqueVisitors * factor),
    visits: Math.round(seed.visits * factor),
    previousUniqueVisitors: Math.round(seed.previousUniqueVisitors * factor),
    previousVisits: Math.round(seed.previousVisits * factor),
  }
}

function buildTrend(totalVisits) {
  const weights = [0.7, 0.82, 0.94, 1.06, 1.18, 1.3]
  const baseShare = totalVisits / weights.reduce((a, b) => a + b, 0)
  return weights.map((w, i) => ({ index: i + 1, visits: Math.round(baseShare * w) }))
}

function buildHub(sites, prevFactor) {
  const uniqueVisitors = sites.reduce((sum, s) => sum + s.uniqueVisitors, 0)
  const visits = sites.reduce((sum, s) => sum + s.visits, 0)
  const weightedTime = sites.reduce((sum, s) => sum + s.avgTimeSeconds * s.visits, 0) / visits
  const weightedMobilePct = sites.reduce((sum, s) => sum + s.mobilePct * s.visits, 0) / visits
  return {
    uniqueVisitors,
    visits,
    previousUniqueVisitors: Math.round(uniqueVisitors * prevFactor),
    previousVisits: Math.round(visits * prevFactor),
    avgTimeSeconds: Math.round(weightedTime),
    devicePct: {
      mobile: Math.round(weightedMobilePct),
      tablet: TABLET_PCT,
      desktop: 100 - Math.round(weightedMobilePct) - TABLET_PCT,
    },
    hourlyPct: HOURLY_PCT,
    trend: buildTrend(visits),
  }
}

export function getAnalyticsData(period) {
  const { factor, prevFactor } = PERIOD_SCALE[period]
  const sites = SITE_SEEDS.map(seed => scaleSite(seed, factor, prevFactor))
  return {
    hub: buildHub(sites, prevFactor),
    sites,
    pages: PAGE_SEEDS.map(seed => scaleContentItem(seed, factor)),
    news: NEWS_SEEDS.map(seed => scaleContentItem(seed, factor)),
    documents: DOCUMENT_SEEDS.map(seed => scaleContentItem(seed, factor)),
  }
}
```

- [ ] **Step 6: Write a Vitest test confirming the fixture's internal consistency**

```js
import { test, expect } from 'vitest'
import { PERIODS, getAnalyticsData } from './analyticsMockData.js'

test('getAnalyticsData returns 12 sites, 15 pages, 15 news, 15 documents for every period', () => {
  for (const period of PERIODS) {
    const data = getAnalyticsData(period)
    expect(data.sites).toHaveLength(12)
    expect(data.pages).toHaveLength(15)
    expect(data.news).toHaveLength(15)
    expect(data.documents).toHaveLength(15)
  }
})

test('hub uniqueVisitors and visits equal the sum across all sites', () => {
  const data = getAnalyticsData('last30')
  const sumUnique = data.sites.reduce((sum, s) => sum + s.uniqueVisitors, 0)
  const sumVisits = data.sites.reduce((sum, s) => sum + s.visits, 0)
  expect(data.hub.uniqueVisitors).toBe(sumUnique)
  expect(data.hub.visits).toBe(sumVisits)
})

test('hub device percentages sum to 100', () => {
  const data = getAnalyticsData('ytd')
  const { desktop, mobile, tablet } = data.hub.devicePct
  expect(desktop + mobile + tablet).toBe(100)
})
```

Add this test to a new file `client/src/data/analyticsMockData.test.js`.

- [ ] **Step 7: Run all new tests**

Run: `cd client && npx vitest run src/utils/analyticsMath.test.js src/data/analyticsMockData.test.js`
Expected: PASS (5 tests)

- [ ] **Step 8: Run the full unit suite to confirm no regression**

Run: `cd client && npm run test:unit`
Expected: all existing tests still pass, plus these 5 new ones.

- [ ] **Step 9: Commit**

```bash
git add client/src/data/analyticsMockData.js client/src/data/analyticsMockData.test.js client/src/utils/analyticsMath.js client/src/utils/analyticsMath.test.js
git commit -m "feat: add deterministic analytics mock data and computeDelta helper"
```

---

### Task 2: Entry point, AnalyticsView shell, shared filter bar

**Files:**
- Modify: `client/src/components/layout/Navbar.jsx`
- Modify: `client/src/App.jsx`
- Create: `client/src/components/analytics/AnalyticsView.jsx`
- Create: `client/src/components/analytics/AnalyticsFilterBar.jsx`
- Create: `client/src/components/analytics/KpiCard.jsx`
- Modify: `client/src/locales/it.json`, `en.json`, `fr.json`, `de.json`

**Interfaces:**
- Consumes: `PERIODS`, `PERIOD_LABELS`, `getAnalyticsData(period)` from Task 1.
- Produces: `export default function AnalyticsView({ onClose })` — mounted/unmounted by `App.jsx`. Produces `export default function KpiCard({ label, value, previousValue, showComparison, formatter })` — consumed by Task 3's Overview dashboard.

- [ ] **Step 1: Add the Navbar button**

In `client/src/components/layout/Navbar.jsx`, add the import:

```js
import { Eye, LineChart } from 'lucide-react'
```

Add an `onAnalyticsClick` prop to the component signature: `export default function Navbar({ onDeployClick, onAnalyticsClick }) {`

Add a new button right before the existing "Anteprima" button:

```jsx
<button
  onClick={onAnalyticsClick}
  className="flex items-center gap-2 text-slate-light hover:text-white border border-slate-mid hover:border-slate text-sm px-3 py-1.5 rounded-lg transition-colors"
>
  <LineChart size={14} />
  {t('navbar.analytics')}
</button>
```

- [ ] **Step 2: Add the i18n key**

In all 4 locale files, inside the existing `navbar` object, add a new key. In `it.json`:

```json
"analytics": "Analytics"
```

In `en.json`: `"analytics": "Analytics"`. In `fr.json`: `"analytics": "Analytics"`. In `de.json`: `"analytics": "Analytics"`.

Also add a new top-level `analytics` namespace to all 4 files (placed right before the final closing `}` of the root object, as a sibling of `tooltips`). In `it.json`:

```json
,
  "analytics": {
    "backToEditor": "Torna all'editor",
    "tabOverview": "Overview",
    "tabSites": "Siti",
    "tabContent": "Contenuti",
    "periodLabel": "Periodo",
    "compareToggle": "Confronta con periodo precedente",
    "kpiUniqueVisitors": "Visitatori unici",
    "kpiTotalVisits": "Visite totali",
    "kpiAvgVisitsPerVisitor": "Media visite per visitatore",
    "kpiAvgTimePerUser": "Tempo medio per utente"
  }
```

In `en.json`:

```json
,
  "analytics": {
    "backToEditor": "Back to editor",
    "tabOverview": "Overview",
    "tabSites": "Sites",
    "tabContent": "Content",
    "periodLabel": "Period",
    "compareToggle": "Compare to previous period",
    "kpiUniqueVisitors": "Unique visitors",
    "kpiTotalVisits": "Total visits",
    "kpiAvgVisitsPerVisitor": "Avg. visits per visitor",
    "kpiAvgTimePerUser": "Avg. time per user"
  }
```

In `fr.json`:

```json
,
  "analytics": {
    "backToEditor": "Retour à l'éditeur",
    "tabOverview": "Overview",
    "tabSites": "Sites",
    "tabContent": "Contenus",
    "periodLabel": "Période",
    "compareToggle": "Comparer à la période précédente",
    "kpiUniqueVisitors": "Visiteurs uniques",
    "kpiTotalVisits": "Visites totales",
    "kpiAvgVisitsPerVisitor": "Moy. visites par visiteur",
    "kpiAvgTimePerUser": "Temps moyen par utilisateur"
  }
```

In `de.json`:

```json
,
  "analytics": {
    "backToEditor": "Zurück zum Editor",
    "tabOverview": "Overview",
    "tabSites": "Websites",
    "tabContent": "Inhalte",
    "periodLabel": "Zeitraum",
    "compareToggle": "Mit vorherigem Zeitraum vergleichen",
    "kpiUniqueVisitors": "Eindeutige Besucher",
    "kpiTotalVisits": "Besuche insgesamt",
    "kpiAvgVisitsPerVisitor": "Ø Besuche pro Besucher",
    "kpiAvgTimePerUser": "Ø Zeit pro Benutzer"
  }
```

(Each insertion goes right after the line that currently reads `    }` closing `tooltips`'s last entry and the line `  }` that closes the `tooltips` object itself — change that `  }` to `  },` and append the block above, then the final root-closing `}`.)

- [ ] **Step 3: Create `KpiCard.jsx`**

```jsx
import { computeDelta } from '../../utils/analyticsMath.js'

export default function KpiCard({ label, value, previousValue, showComparison, formatter = v => v.toLocaleString('it-IT') }) {
  const delta = computeDelta(value, previousValue)
  const isPositive = delta >= 0

  return (
    <div className="bg-surface-card rounded-xl border border-slate-mid p-4">
      <div className="text-xs text-slate-light mb-1">{label}</div>
      <div className="text-2xl font-semibold text-navy">{formatter(value)}</div>
      {showComparison && (
        <div className={`text-xs font-medium mt-1 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{delta}%
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `AnalyticsFilterBar.jsx`**

```jsx
import { useTranslation } from 'react-i18next'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'
import { PERIODS, PERIOD_LABELS } from '../../data/analyticsMockData.js'

export default function AnalyticsFilterBar({ period, onPeriodChange, showComparison, onToggleComparison }) {
  const { t } = useTranslation()
  const lang = useLang()

  return (
    <div className="flex items-center gap-4 bg-surface-card border border-slate-mid rounded-xl px-4 py-3">
      <label className="flex items-center gap-2 text-sm text-navy">
        {t('analytics.periodLabel')}
        <select
          value={period}
          onChange={e => onPeriodChange(e.target.value)}
          className="border border-slate-mid rounded-lg px-2 py-1 text-sm"
        >
          {PERIODS.map(key => (
            <option key={key} value={key}>{t2(PERIOD_LABELS[key], lang)}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-navy cursor-pointer">
        <input type="checkbox" checked={showComparison} onChange={e => onToggleComparison(e.target.checked)} />
        {t('analytics.compareToggle')}
      </label>
    </div>
  )
}
```

- [ ] **Step 5: Create `AnalyticsView.jsx`**

```jsx
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getAnalyticsData, PERIODS } from '../../data/analyticsMockData.js'
import AnalyticsFilterBar from './AnalyticsFilterBar.jsx'

const TABS = ['overview', 'sites', 'content']

export default function AnalyticsView({ onClose }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('overview')
  const [period, setPeriod] = useState(PERIODS[0])
  const [showComparison, setShowComparison] = useState(false)

  const data = getAnalyticsData(period)

  return (
    <div className="overflow-y-auto bg-surface" style={{ height: 'calc(100vh - 3.5rem)', marginTop: '3.5rem' }}>
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-light hover:text-navy text-sm"
          >
            <ArrowLeft size={16} />
            {t('analytics.backToEditor')}
          </button>
        </div>

        <div className="flex gap-2 mb-4 border-b border-slate-mid">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-blue text-blue' : 'border-transparent text-slate-light hover:text-navy'
              }`}
            >
              {t(`analytics.tab${tab.charAt(0).toUpperCase()}${tab.slice(1)}`)}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <AnalyticsFilterBar
            period={period}
            onPeriodChange={setPeriod}
            showComparison={showComparison}
            onToggleComparison={setShowComparison}
          />
        </div>

        {activeTab === 'overview' && <div data-testid="analytics-overview-placeholder">{t('analytics.tabOverview')}</div>}
        {activeTab === 'sites' && <div data-testid="analytics-sites-placeholder">{t('analytics.tabSites')}</div>}
        {activeTab === 'content' && <div data-testid="analytics-content-placeholder">{t('analytics.tabContent')}</div>}
      </div>
    </div>
  )
}
```

The 3 placeholder `<div>`s are intentionally minimal — Tasks 3, 4, and 5 replace each one with the real dashboard component (`AnalyticsOverview`, `AnalyticsSites`, `AnalyticsContent`). `data` (already scoped to the active period) is threaded into all 3; only `AnalyticsOverview` also takes `showComparison` — `AnalyticsSites` and `AnalyticsContent` have no comparison-badge UI in their design, so they take `data` alone.

- [ ] **Step 6: Wire `AnalyticsView` into `App.jsx`**

Add the import: `import AnalyticsView from './components/analytics/AnalyticsView.jsx'`

Add new state in `AppInner`, alongside `deployOpen`: `const [analyticsOpen, setAnalyticsOpen] = useState(false)`

Update the `Navbar` element to pass the new prop:

```jsx
<Navbar onDeployClick={() => setDeployOpen(true)} onAnalyticsClick={() => setAnalyticsOpen(true)} />
```

Replace the `<WorkspaceShell ... />` element with a conditional:

```jsx
{analyticsOpen ? (
  <AnalyticsView onClose={() => setAnalyticsOpen(false)} />
) : (
  <WorkspaceShell
    left={<LeftSidebar />}
    center={<CanvasDropZone />}
    right={<PropertiesPanel />}
  />
)}
```

- [ ] **Step 7: Manually verify in the running app**

Run: `cd client && npm run dev`. Click the new "Analytics" button in the navbar — the editor should be replaced by the Analytics view with 3 tabs, a period dropdown, a comparison checkbox, and one placeholder line of text per tab. Click "Torna all'editor" to confirm it returns to the normal 3-pane editor.

- [ ] **Step 8: Run the full unit suite**

Run: `cd client && npm run test:unit`
Expected: same count as Task 1 left it (no new unit tests in this task — `KpiCard`/`AnalyticsFilterBar`/`AnalyticsView` are DOM components, covered by Task 6's e2e suite, not Vitest, per this repo's no-jsdom convention).

- [ ] **Step 9: Commit**

```bash
git add client/src/components/layout/Navbar.jsx client/src/App.jsx client/src/components/analytics/AnalyticsView.jsx client/src/components/analytics/AnalyticsFilterBar.jsx client/src/components/analytics/KpiCard.jsx client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json
git commit -m "feat: add Analytics view entry point, tab shell, and shared filter bar"
```

---

### Task 3: Dashboard 1 — Intranet Overview

**Files:**
- Create: `client/src/components/analytics/AnalyticsOverview.jsx`
- Create: `client/src/components/analytics/RankedList.jsx`
- Modify: `client/src/components/analytics/AnalyticsView.jsx`
- Modify: `client/src/locales/it.json`, `en.json`, `fr.json`, `de.json`
- Modify: `client/package.json` (via `npm install recharts`)

**Interfaces:**
- Consumes: `KpiCard` (Task 2), `data.hub` shape from Task 1 (`{uniqueVisitors, previousUniqueVisitors, visits, previousVisits, avgTimeSeconds, devicePct:{desktop,mobile,tablet}, hourlyPct:{morning,lunch,afternoon,evening}, trend:[{index,visits}]}`), `data.sites`/`data.pages`/`data.news`/`data.documents` (each item has `{name, uniqueVisitors, visits, previousUniqueVisitors?, previousVisits?}`).
- Produces: `export default function AnalyticsOverview({ data, showComparison })`, `export default function RankedList({ title, items })` (generic top-5 ranked list with its own internal "per visite"/"per visitatori univoci" sort toggle — these lists never show period-comparison deltas, only the 4 KPI cards and Dashboard 3's declining/growing tables do, so `RankedList` has no `showComparison` prop) — `RankedList` is local to this task; Dashboard 3 (Task 5) uses the differently-shaped `RankedTable` instead.

- [ ] **Step 1: Install Recharts**

Run: `cd client && npm install recharts`
Expected: `recharts` appears in `client/package.json`'s `dependencies`.

- [ ] **Step 2: Create `RankedList.jsx`**

```jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function RankedList({ title, items }) {
  const { t } = useTranslation()
  const [sortBy, setSortBy] = useState('visits')

  const sorted = [...items].sort((a, b) => b[sortBy] - a[sortBy]).slice(0, 5)

  return (
    <div className="bg-surface-card rounded-xl border border-slate-mid p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="text-xs border border-slate-mid rounded-lg px-2 py-1"
        >
          <option value="visits">{t('analytics.byVisits')}</option>
          <option value="uniqueVisitors">{t('analytics.byUniqueVisitors')}</option>
        </select>
      </div>
      <ol className="space-y-1.5">
        {sorted.map((item, i) => (
          <li key={item.name} className="flex items-center justify-between text-sm">
            <span className="text-navy truncate">{i + 1}. {item.name}</span>
            <span className="text-slate-light flex-shrink-0 ml-2">{item[sortBy].toLocaleString('it-IT')}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
```

- [ ] **Step 3: Create `AnalyticsOverview.jsx`**

```jsx
import { useTranslation } from 'react-i18next'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import KpiCard from './KpiCard.jsx'
import RankedList from './RankedList.jsx'

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  return `${minutes}m ${seconds}s`
}

export default function AnalyticsOverview({ data, showComparison }) {
  const { t } = useTranslation()
  const { hub, sites, pages, news, documents } = data

  const deviceData = [
    { name: 'Desktop', value: hub.devicePct.desktop },
    { name: 'Mobile', value: hub.devicePct.mobile },
    { name: 'Tablet', value: hub.devicePct.tablet },
  ]
  const hourlyData = [
    { name: t('analytics.hourMorning'), value: hub.hourlyPct.morning },
    { name: t('analytics.hourLunch'), value: hub.hourlyPct.lunch },
    { name: t('analytics.hourAfternoon'), value: hub.hourlyPct.afternoon },
    { name: t('analytics.hourEvening'), value: hub.hourlyPct.evening },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label={t('analytics.kpiUniqueVisitors')} value={hub.uniqueVisitors} previousValue={hub.previousUniqueVisitors} showComparison={showComparison} />
        <KpiCard label={t('analytics.kpiTotalVisits')} value={hub.visits} previousValue={hub.previousVisits} showComparison={showComparison} />
        <KpiCard
          label={t('analytics.kpiAvgVisitsPerVisitor')}
          value={hub.visits / hub.uniqueVisitors}
          previousValue={hub.previousVisits / hub.previousUniqueVisitors}
          showComparison={showComparison}
          formatter={v => v.toFixed(1)}
        />
        <KpiCard
          label={t('analytics.kpiAvgTimePerUser')}
          value={hub.avgTimeSeconds}
          previousValue={hub.avgTimeSeconds}
          showComparison={showComparison}
          formatter={formatSeconds}
        />
      </div>

      <div className="bg-surface-card rounded-xl border border-slate-mid p-4">
        <h3 className="text-sm font-semibold text-navy mb-3">{t('analytics.trendTitle')}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={hub.trend}>
            <CartesianGrid stroke="#8899AA" strokeOpacity={0.2} />
            <XAxis dataKey="index" tickFormatter={i => t('analytics.trendPoint', { n: i })} stroke="#8899AA" fontSize={12} />
            <YAxis stroke="#8899AA" fontSize={12} />
            <Tooltip />
            <Area type="monotone" dataKey="visits" stroke="#0078D4" fill="#00B4FF" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <RankedList title={t('analytics.popularSites')} items={sites} />
        <RankedList title={t('analytics.popularPages')} items={pages} />
        <RankedList title={t('analytics.popularNews')} items={news} />
        <RankedList title={t('analytics.popularDocuments')} items={documents} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-card rounded-xl border border-slate-mid p-4">
          <h3 className="text-sm font-semibold text-navy mb-3">{t('analytics.deviceChartTitle')}</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={deviceData}>
              <XAxis dataKey="name" stroke="#8899AA" fontSize={12} />
              <YAxis stroke="#8899AA" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#0078D4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface-card rounded-xl border border-slate-mid p-4">
          <h3 className="text-sm font-semibold text-navy mb-3">{t('analytics.hourlyChartTitle')}</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={hourlyData}>
              <XAxis dataKey="name" stroke="#8899AA" fontSize={12} />
              <YAxis stroke="#8899AA" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#00B4FF" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add the new i18n keys**

In all 4 locale files, inside the `analytics` namespace added in Task 2, add these keys (it.json values shown; translate naturally for en/fr/de):

```json
"byVisits": "Per visite",
"byUniqueVisitors": "Per visitatori univoci",
"trendTitle": "Andamento visite nel periodo",
"trendPoint": "Periodo {{n}}",
"popularSites": "Siti popolari",
"popularPages": "Pagine popolari",
"popularNews": "Post di notizie popolari",
"popularDocuments": "Documenti popolari",
"deviceChartTitle": "Accessi per dispositivo",
"hourlyChartTitle": "Accessi per fascia oraria",
"hourMorning": "Mattina",
"hourLunch": "Pranzo",
"hourAfternoon": "Pomeriggio",
"hourEvening": "Sera"
```

English equivalents for `en.json`: `"byVisits": "By visits", "byUniqueVisitors": "By unique visitors", "trendTitle": "Visits trend over the period", "trendPoint": "Period {{n}}", "popularSites": "Popular sites", "popularPages": "Popular pages", "popularNews": "Popular news posts", "popularDocuments": "Popular documents", "deviceChartTitle": "Access by device", "hourlyChartTitle": "Access by time of day", "hourMorning": "Morning", "hourLunch": "Lunch", "hourAfternoon": "Afternoon", "hourEvening": "Evening"`.

French for `fr.json`: `"byVisits": "Par visites", "byUniqueVisitors": "Par visiteurs uniques", "trendTitle": "Évolution des visites sur la période", "trendPoint": "Période {{n}}", "popularSites": "Sites populaires", "popularPages": "Pages populaires", "popularNews": "Actualités populaires", "popularDocuments": "Documents populaires", "deviceChartTitle": "Accès par appareil", "hourlyChartTitle": "Accès par tranche horaire", "hourMorning": "Matin", "hourLunch": "Midi", "hourAfternoon": "Après-midi", "hourEvening": "Soir"`.

German for `de.json`: `"byVisits": "Nach Besuchen", "byUniqueVisitors": "Nach eindeutigen Besuchern", "trendTitle": "Besuchsentwicklung im Zeitraum", "trendPoint": "Zeitraum {{n}}", "popularSites": "Beliebte Websites", "popularPages": "Beliebte Seiten", "popularNews": "Beliebte News-Beiträge", "popularDocuments": "Beliebte Dokumente", "deviceChartTitle": "Zugriffe nach Gerät", "hourlyChartTitle": "Zugriffe nach Tageszeit", "hourMorning": "Morgen", "hourLunch": "Mittag", "hourAfternoon": "Nachmittag", "hourEvening": "Abend"`.

- [ ] **Step 5: Wire `AnalyticsOverview` into `AnalyticsView.jsx`**

Add the import: `import AnalyticsOverview from './AnalyticsOverview.jsx'`

Replace the overview placeholder line:

```jsx
{activeTab === 'overview' && <AnalyticsOverview data={data} showComparison={showComparison} />}
```

- [ ] **Step 6: Manually verify in the running app**

Run: `cd client && npm run dev`, open Analytics → Overview tab. Confirm: 4 KPI cards show numbers, the trend area chart renders, the 4 ranked lists show 5 items each and their dropdown re-sorts them, the 2 device/hourly bar charts render. Toggle "Confronta con periodo precedente" and confirm the KPI cards show a `+`/`-` percentage badge. Change period and confirm all numbers change.

- [ ] **Step 7: Run the full unit suite**

Run: `cd client && npm run test:unit`
Expected: same count as Task 1 (no new unit tests — this task is pure DOM/chart rendering, e2e-covered in Task 6).

- [ ] **Step 8: Commit**

```bash
git add client/package.json client/package-lock.json client/src/components/analytics/AnalyticsOverview.jsx client/src/components/analytics/RankedList.jsx client/src/components/analytics/AnalyticsView.jsx client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json
git commit -m "feat: add Analytics Overview dashboard with trend, ranked lists, and device/hourly charts"
```

---

### Task 4: Dashboard 2 — Sites Analytics

**Files:**
- Create: `client/src/components/analytics/AnalyticsSites.jsx`
- Modify: `client/src/components/analytics/AnalyticsView.jsx`
- Modify: `client/src/locales/it.json`, `en.json`, `fr.json`, `de.json`

**Interfaces:**
- Consumes: `data.sites` shape from Task 1 (`{name, uniqueVisitors, visits, previousUniqueVisitors, previousVisits, avgTimeSeconds, mobilePct, afternoonPct}`).
- Produces: `export default function AnalyticsSites({ data })` — this dashboard has no comparison badges in its design (the ranking bar chart shows absolute/current values only), so it takes no `showComparison` prop.

- [ ] **Step 1: Create `AnalyticsSites.jsx`**

```jsx
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const METRICS = {
  uniqueVisitors: site => site.uniqueVisitors,
  visits: site => site.visits,
  avgVisitsPerVisitor: site => site.visits / site.uniqueVisitors,
  avgTimeSeconds: site => site.avgTimeSeconds,
  mobilePct: site => site.mobilePct,
  afternoonPct: site => site.afternoonPct,
}

export default function AnalyticsSites({ data }) {
  const { t } = useTranslation()
  const [metric, setMetric] = useState('uniqueVisitors')

  const rankedSites = useMemo(
    () => [...data.sites].sort((a, b) => METRICS[metric](b) - METRICS[metric](a)),
    [data.sites, metric]
  )
  const top10Names = useMemo(() => rankedSites.slice(0, 10).map(s => s.name), [rankedSites])

  const [selectedNames, setSelectedNames] = useState(top10Names)

  function toggleSite(name) {
    setSelectedNames(current =>
      current.includes(name) ? current.filter(n => n !== name) : [...current, name]
    )
  }

  const chartData = rankedSites
    .filter(site => selectedNames.includes(site.name))
    .map(site => ({ name: site.name, value: Math.round(METRICS[metric](site) * 10) / 10 }))

  return (
    <div className="space-y-4">
      <div className="bg-surface-card rounded-xl border border-slate-mid p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-navy">{t('analytics.sitesRankingTitle')}</h3>
          <select
            value={metric}
            onChange={e => setMetric(e.target.value)}
            className="text-xs border border-slate-mid rounded-lg px-2 py-1"
          >
            <option value="uniqueVisitors">{t('analytics.metricUniqueVisitors')}</option>
            <option value="visits">{t('analytics.metricVisits')}</option>
            <option value="avgVisitsPerVisitor">{t('analytics.metricAvgVisitsPerVisitor')}</option>
            <option value="avgTimeSeconds">{t('analytics.metricAvgTime')}</option>
            <option value="mobilePct">{t('analytics.metricMobile')}</option>
            <option value="afternoonPct">{t('analytics.metricAfternoon')}</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" stroke="#8899AA" fontSize={12} />
            <YAxis type="category" dataKey="name" stroke="#8899AA" fontSize={12} width={140} />
            <Tooltip />
            <Bar dataKey="value" fill="#0078D4" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface-card rounded-xl border border-slate-mid p-4">
        <h3 className="text-sm font-semibold text-navy mb-3">{t('analytics.siteSelectorTitle')}</h3>
        <div className="grid grid-cols-3 gap-2">
          {rankedSites.map(site => (
            <label key={site.name} className="flex items-center gap-2 text-sm text-navy">
              <input
                type="checkbox"
                checked={selectedNames.includes(site.name)}
                onChange={() => toggleSite(site.name)}
              />
              {site.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
```

`top10Names` (and therefore the initial `selectedNames`) is computed once via `useState`'s lazy initial value behavior — it is NOT recomputed when `metric` changes afterward, so switching the metric dropdown re-ranks and re-scales the already-selected sites' bars without silently changing which sites are checked. This matches the spec's intent that changing the ranking metric shouldn't surprise the user by altering their manual site selection.

- [ ] **Step 2: Add the new i18n keys**

In all 4 locale files, inside the `analytics` namespace, add (it.json):

```json
"sitesRankingTitle": "Classifica siti",
"siteSelectorTitle": "Siti da visualizzare",
"metricUniqueVisitors": "Visitatori unici",
"metricVisits": "Visite totali",
"metricAvgVisitsPerVisitor": "Media visite per visitatore",
"metricAvgTime": "Tempo medio per utente",
"metricMobile": "% Accessi da mobile",
"metricAfternoon": "% Accessi pomeriggio"
```

English (`en.json`): `"sitesRankingTitle": "Sites ranking", "siteSelectorTitle": "Sites to display", "metricUniqueVisitors": "Unique visitors", "metricVisits": "Total visits", "metricAvgVisitsPerVisitor": "Avg. visits per visitor", "metricAvgTime": "Avg. time per user", "metricMobile": "% Mobile access", "metricAfternoon": "% Afternoon access"`.

French (`fr.json`): `"sitesRankingTitle": "Classement des sites", "siteSelectorTitle": "Sites à afficher", "metricUniqueVisitors": "Visiteurs uniques", "metricVisits": "Visites totales", "metricAvgVisitsPerVisitor": "Moy. visites par visiteur", "metricAvgTime": "Temps moyen par utilisateur", "metricMobile": "% Accès mobile", "metricAfternoon": "% Accès après-midi"`.

German (`de.json`): `"sitesRankingTitle": "Website-Ranking", "siteSelectorTitle": "Anzuzeigende Websites", "metricUniqueVisitors": "Eindeutige Besucher", "metricVisits": "Besuche insgesamt", "metricAvgVisitsPerVisitor": "Ø Besuche pro Besucher", "metricAvgTime": "Ø Zeit pro Benutzer", "metricMobile": "% Mobilzugriffe", "metricAfternoon": "% Zugriffe Nachmittag"`.

- [ ] **Step 3: Wire `AnalyticsSites` into `AnalyticsView.jsx`**

Add the import: `import AnalyticsSites from './AnalyticsSites.jsx'`

Replace the sites placeholder line:

```jsx
{activeTab === 'sites' && <AnalyticsSites data={data} />}
```

- [ ] **Step 4: Manually verify in the running app**

Run: `cd client && npm run dev`, open Analytics → Siti tab. Confirm: the bar chart shows the top 10 sites by "Visitatori unici" by default, changing the metric dropdown re-ranks and re-scales bars without un-checking any site, and unchecking a site in the selector below removes its bar.

- [ ] **Step 5: Run the full unit suite**

Run: `cd client && npm run test:unit`
Expected: same count as Task 1 (no new unit tests, e2e-covered in Task 6).

- [ ] **Step 6: Commit**

```bash
git add client/src/components/analytics/AnalyticsSites.jsx client/src/components/analytics/AnalyticsView.jsx client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json
git commit -m "feat: add Analytics Sites dashboard with metric-switchable ranking and site selector"
```

---

### Task 5: Dashboard 3 — Content & Page Analytics

**Files:**
- Create: `client/src/components/analytics/AnalyticsContent.jsx`
- Create: `client/src/components/analytics/RankedTable.jsx`
- Modify: `client/src/components/analytics/AnalyticsView.jsx`
- Modify: `client/src/locales/it.json`, `en.json`, `fr.json`, `de.json`

**Interfaces:**
- Consumes: `data.pages`/`data.news`/`data.documents` shape from Task 1 (each item now includes a `site` field, one of the 12 names in `data.sites`), `data.sites` (for the site filter dropdown's name list), `computeDelta` from Task 1.
- Produces: `export default function AnalyticsContent({ data })` — the declining/growing tables always show their `delta` column regardless of the global comparison toggle (the delta IS the table's content, not an optional overlay), so this dashboard takes no `showComparison` prop either. Also produces `export default function RankedTable({ title, rows, columns })` (generic table, `columns` is `[{key, label}]`, `rows` is an array of plain objects already shaped to match `columns`' keys).

- [ ] **Step 1: Create `RankedTable.jsx`**

```jsx
export default function RankedTable({ title, rows, columns }) {
  return (
    <div className="bg-surface-card rounded-xl border border-slate-mid p-4">
      <h3 className="text-sm font-semibold text-navy mb-3">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-light">
            {columns.map(col => <th key={col.key} className="pb-2 font-medium">{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-mid">
              {columns.map(col => (
                <td key={col.key} className="py-1.5 text-navy">{row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Create `AnalyticsContent.jsx`**

```jsx
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { computeDelta } from '../../utils/analyticsMath.js'
import RankedTable from './RankedTable.jsx'

const CONTENT_TYPES = { all: null, pages: 'pages', news: 'news', documents: 'documents' }

function topAndWorst(items) {
  const sorted = [...items].sort((a, b) => b.visits - a.visits)
  return { top: sorted.slice(0, 10), worst: sorted.slice(-10).reverse() }
}

export default function AnalyticsContent({ data }) {
  const { t } = useTranslation()
  const [siteFilter, setSiteFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const visibleTypes = typeFilter === 'all' ? ['pages', 'news', 'documents'] : [typeFilter]

  const standardColumns = [
    { key: 'name', label: t('analytics.colName') },
    { key: 'uniqueVisitors', label: t('analytics.colUniqueVisitors') },
    { key: 'visits', label: t('analytics.colVisits') },
    { key: 'avgVisitsPerVisitor', label: t('analytics.colAvgVisitsPerVisitor') },
  ]
  const deltaColumns = [
    { key: 'name', label: t('analytics.colName') },
    { key: 'previousVisits', label: t('analytics.colPreviousVisits') },
    { key: 'visits', label: t('analytics.colVisits') },
    { key: 'delta', label: t('analytics.colDelta') },
  ]

  function toRows(items) {
    return items.map(item => ({
      ...item,
      avgVisitsPerVisitor: (item.visits / item.uniqueVisitors).toFixed(1),
    }))
  }

  function filterBySite(items) {
    return siteFilter === 'all' ? items : items.filter(item => item.site === siteFilter)
  }

  const filteredPages = useMemo(() => filterBySite(data.pages), [data.pages, siteFilter])
  const filteredNews = useMemo(() => filterBySite(data.news), [data.news, siteFilter])
  const filteredDocuments = useMemo(() => filterBySite(data.documents), [data.documents, siteFilter])

  const allItemsWithType = useMemo(() => {
    const labeled = []
    if (visibleTypes.includes('pages')) labeled.push(...filteredPages.map(p => ({ ...p, type: 'pages' })))
    if (visibleTypes.includes('news')) labeled.push(...filteredNews.map(p => ({ ...p, type: 'news' })))
    if (visibleTypes.includes('documents')) labeled.push(...filteredDocuments.map(p => ({ ...p, type: 'documents' })))
    return labeled
  }, [filteredPages, filteredNews, filteredDocuments, visibleTypes])

  const declining = allItemsWithType
    .map(item => ({ ...item, delta: computeDelta(item.visits, item.previousVisits) }))
    .filter(item => item.delta < -10)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 10)
    .map(item => ({ ...item, delta: `${item.delta}%` }))

  const growing = allItemsWithType
    .map(item => ({ ...item, delta: computeDelta(item.visits, item.previousVisits) }))
    .filter(item => item.delta > 10)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 10)
    .map(item => ({ ...item, delta: `+${item.delta}%` }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 bg-surface-card border border-slate-mid rounded-xl px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-navy">
          {t('analytics.siteFilterLabel')}
          <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="border border-slate-mid rounded-lg px-2 py-1 text-sm">
            <option value="all">{t('analytics.allSites')}</option>
            {data.sites.map(site => <option key={site.name} value={site.name}>{site.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-navy">
          {t('analytics.typeFilterLabel')}
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-slate-mid rounded-lg px-2 py-1 text-sm">
            <option value="all">{t('analytics.allTypes')}</option>
            <option value="pages">{t('analytics.typePages')}</option>
            <option value="news">{t('analytics.typeNews')}</option>
            <option value="documents">{t('analytics.typeDocuments')}</option>
          </select>
        </label>
      </div>

      {visibleTypes.includes('pages') && (() => {
        const { top, worst } = topAndWorst(filteredPages)
        return (
          <div className="grid grid-cols-2 gap-4">
            <RankedTable title={t('analytics.topPages')} rows={toRows(top)} columns={standardColumns} />
            <RankedTable title={t('analytics.worstPages')} rows={toRows(worst)} columns={standardColumns} />
          </div>
        )
      })()}
      {visibleTypes.includes('news') && (() => {
        const { top, worst } = topAndWorst(filteredNews)
        return (
          <div className="grid grid-cols-2 gap-4">
            <RankedTable title={t('analytics.topNews')} rows={toRows(top)} columns={standardColumns} />
            <RankedTable title={t('analytics.worstNews')} rows={toRows(worst)} columns={standardColumns} />
          </div>
        )
      })()}
      {visibleTypes.includes('documents') && (() => {
        const { top, worst } = topAndWorst(filteredDocuments)
        return (
          <div className="grid grid-cols-2 gap-4">
            <RankedTable title={t('analytics.topDocuments')} rows={toRows(top)} columns={standardColumns} />
            <RankedTable title={t('analytics.worstDocuments')} rows={toRows(worst)} columns={standardColumns} />
          </div>
        )
      })()}

      <div className="grid grid-cols-2 gap-4">
        <RankedTable title={t('analytics.declining')} rows={declining} columns={deltaColumns} />
        <RankedTable title={t('analytics.growing')} rows={growing} columns={deltaColumns} />
      </div>
    </div>
  )
}
```

`filteredPages`/`filteredNews`/`filteredDocuments` apply `siteFilter` (via each content item's `site` field, added to the Task 1 fixture) before any top/worst/declining/growing computation — selecting a specific site genuinely narrows all 8 tables to that site's content, not just a decorative dropdown.

- [ ] **Step 3: Add the new i18n keys**

In all 4 locale files, inside the `analytics` namespace, add (it.json):

```json
"colName": "Nome",
"colUniqueVisitors": "Visitatori univoci",
"colVisits": "Visite",
"colAvgVisitsPerVisitor": "Media visite/visitatore",
"colPreviousVisits": "Periodo precedente",
"colDelta": "Variazione",
"siteFilterLabel": "Sito",
"allSites": "Tutti i siti",
"typeFilterLabel": "Tipo contenuto",
"allTypes": "Tutti i tipi",
"typePages": "Solo pagine",
"typeNews": "Solo news",
"typeDocuments": "Solo documenti",
"topPages": "Top 10 pagine",
"worstPages": "Worst 10 pagine",
"topNews": "Top 10 news",
"worstNews": "Worst 10 news",
"topDocuments": "Top 10 documenti",
"worstDocuments": "Worst 10 documenti",
"declining": "Contenuti in calo",
"growing": "Contenuti in crescita"
```

English (`en.json`): `"colName": "Name", "colUniqueVisitors": "Unique visitors", "colVisits": "Visits", "colAvgVisitsPerVisitor": "Avg. visits/visitor", "colPreviousVisits": "Previous period", "colDelta": "Change", "siteFilterLabel": "Site", "allSites": "All sites", "typeFilterLabel": "Content type", "allTypes": "All types", "typePages": "Pages only", "typeNews": "News only", "typeDocuments": "Documents only", "topPages": "Top 10 pages", "worstPages": "Worst 10 pages", "topNews": "Top 10 news", "worstNews": "Worst 10 news", "topDocuments": "Top 10 documents", "worstDocuments": "Worst 10 documents", "declining": "Declining content", "growing": "Growing content"`.

French (`fr.json`): `"colName": "Nom", "colUniqueVisitors": "Visiteurs uniques", "colVisits": "Visites", "colAvgVisitsPerVisitor": "Moy. visites/visiteur", "colPreviousVisits": "Période précédente", "colDelta": "Variation", "siteFilterLabel": "Site", "allSites": "Tous les sites", "typeFilterLabel": "Type de contenu", "allTypes": "Tous les types", "typePages": "Pages uniquement", "typeNews": "Actualités uniquement", "typeDocuments": "Documents uniquement", "topPages": "Top 10 pages", "worstPages": "Pires 10 pages", "topNews": "Top 10 actualités", "worstNews": "Pires 10 actualités", "topDocuments": "Top 10 documents", "worstDocuments": "Pires 10 documents", "declining": "Contenus en baisse", "growing": "Contenus en hausse"`.

German (`de.json`): `"colName": "Name", "colUniqueVisitors": "Eindeutige Besucher", "colVisits": "Besuche", "colAvgVisitsPerVisitor": "Ø Besuche/Besucher", "colPreviousVisits": "Vorheriger Zeitraum", "colDelta": "Änderung", "siteFilterLabel": "Website", "allSites": "Alle Websites", "typeFilterLabel": "Inhaltstyp", "allTypes": "Alle Typen", "typePages": "Nur Seiten", "typeNews": "Nur News", "typeDocuments": "Nur Dokumente", "topPages": "Top 10 Seiten", "worstPages": "Letzte 10 Seiten", "topNews": "Top 10 News", "worstNews": "Letzte 10 News", "topDocuments": "Top 10 Dokumente", "worstDocuments": "Letzte 10 Dokumente", "declining": "Rückgängige Inhalte", "growing": "Wachsende Inhalte"`.

- [ ] **Step 4: Wire `AnalyticsContent` into `AnalyticsView.jsx`**

Add the import: `import AnalyticsContent from './AnalyticsContent.jsx'`

Replace the content placeholder line:

```jsx
{activeTab === 'content' && <AnalyticsContent data={data} />}
```

- [ ] **Step 5: Manually verify in the running app**

Run: `cd client && npm run dev`, open Analytics → Contenuti tab. Confirm: 6 top/worst tables render with real numbers, "Contenuti in calo"/"Contenuti in crescita" show plausible entries (e.g. "Newsletter Luglio" should appear in "Contenuti in calo"), the type filter narrows which table pairs are shown.

- [ ] **Step 6: Run the full unit suite**

Run: `cd client && npm run test:unit`
Expected: same count as Task 1 (no new unit tests, e2e-covered in Task 6).

- [ ] **Step 7: Commit**

```bash
git add client/src/components/analytics/AnalyticsContent.jsx client/src/components/analytics/RankedTable.jsx client/src/components/analytics/AnalyticsView.jsx client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json
git commit -m "feat: add Analytics Content dashboard with top/worst tables and declining/growing content"
```

---

### Task 6: End-to-end tests and accessibility

**Files:**
- Modify: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: all UI/text from Tasks 2-5 (button labels, tab labels, table/list content, exact mock data values from Task 1's fixture — e.g. "Newsletter Luglio" must appear in the declining-content table).

- [ ] **Step 1: Write the end-to-end tests**

Append to `client/tests/smoke.spec.js`, inside the existing `test.describe('ShareFlow configurator smoke test', ...)` block:

```js
  test('opening Analytics shows the Overview dashboard with KPIs and a way back to the editor', async ({ page }) => {
    await page.getByRole('button', { name: 'Analytics' }).click()

    await expect(page.getByText('Visitatori unici', { exact: true })).toBeVisible()
    await expect(page.getByText('Visite totali', { exact: true })).toBeVisible()
    await expect(page.getByText('Andamento visite nel periodo', { exact: true })).toBeVisible()
    await expect(page.getByText('Siti popolari', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: "Torna all'editor" }).click()
    await expect(page.getByRole('button', { name: 'Aggiungi sezione' })).toBeVisible()
  })

  test('changing the Analytics period changes the displayed numbers', async ({ page }) => {
    await page.getByRole('button', { name: 'Analytics' }).click()

    const kpiCard = page.locator('div', { hasText: 'Visitatori unici' }).last()
    const initialText = await kpiCard.textContent()

    await page.getByLabel('Periodo').selectOption('lastyear')

    await expect(async () => {
      const updatedText = await kpiCard.textContent()
      expect(updatedText).not.toBe(initialText)
    }).toPass()
  })

  test('toggling the comparison checkbox shows a delta badge on KPI cards', async ({ page }) => {
    await page.getByRole('button', { name: 'Analytics' }).click()

    await page.getByLabel('Confronta con periodo precedente').check()
    await expect(page.getByText(/^[+-]\d+(\.\d+)?%$/).first()).toBeVisible()
  })

  test('switching Analytics tabs shows the Sites and Content dashboards', async ({ page }) => {
    await page.getByRole('button', { name: 'Analytics' }).click()

    await page.getByRole('button', { name: 'Siti', exact: true }).click()
    await expect(page.getByText('Classifica siti', { exact: true })).toBeVisible()
    await expect(page.getByText('Siti da visualizzare', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Contenuti', exact: true }).click()
    await expect(page.getByText('Top 10 pagine', { exact: true })).toBeVisible()
    await expect(page.getByText('Contenuti in calo', { exact: true })).toBeVisible()
  })

  test('unchecking a site in the Sites dashboard removes it from the ranking chart', async ({ page }) => {
    await page.getByRole('button', { name: 'Analytics' }).click()
    await page.getByRole('button', { name: 'Siti', exact: true }).click()

    const chart = page.locator('div', { hasText: 'Classifica siti' }).first()
    await expect(chart.getByText('Employee Hub', { exact: true })).toBeVisible()

    await page.getByRole('checkbox', { name: 'Employee Hub' }).uncheck()
    await expect(chart.getByText('Employee Hub', { exact: true })).not.toBeVisible()
  })

  test('filtering Content dashboard by type shows only the matching tables', async ({ page }) => {
    await page.getByRole('button', { name: 'Analytics' }).click()
    await page.getByRole('button', { name: 'Contenuti', exact: true }).click()

    await page.getByLabel('Tipo contenuto').selectOption('news')
    await expect(page.getByText('Top 10 news', { exact: true })).toBeVisible()
    await expect(page.getByText('Top 10 pagine', { exact: true })).not.toBeVisible()
  })

  test('filtering Content dashboard by site narrows the tables to that site only', async ({ page }) => {
    await page.getByRole('button', { name: 'Analytics' }).click()
    await page.getByRole('button', { name: 'Contenuti', exact: true }).click()
    await page.getByLabel('Tipo contenuto').selectOption('news')

    await page.getByLabel('Sito').selectOption('Welfare & Benefit')
    const newsTable = page.locator('div', { hasText: 'Top 10 news' }).last()
    await expect(newsTable.getByText('Lancio Piattaforma Welfare', { exact: true })).toBeVisible()
    await expect(newsTable.getByText('Risultati Q1 2026', { exact: true })).not.toBeVisible()
  })

  test('Analytics view has no in-scope accessibility violations', async ({ page }) => {
    await page.getByRole('button', { name: 'Analytics' }).click()

    const results = await new AxeBuilder({ page }).disableRules(OUT_OF_SCOPE_AXE_RULES).analyze()
    expect(results.violations).toEqual([])
  })
```

- [ ] **Step 2: Run the new tests**

Run: `cd client && npm run test:e2e -- -g "Analytics"`
Expected: PASS (8/8). If the "unchecking a site" test fails because `getByRole('checkbox', { name: 'Employee Hub' })` doesn't resolve uniquely (the site name might also appear in the bar chart's own text), use `systematic-debugging` to inspect the actual DOM via Playwright's trace before adjusting the selector — don't guess.

- [ ] **Step 3: Run the full unit and e2e suites**

Run: `cd client && npm run test:unit`
Expected: PASS, same count Task 1 left it (7 tests from Task 1, no new ones added since).

Run: `cd client && npm run test:e2e`
Expected: PASS, previous baseline count + 8 new tests, with the same 2 pre-existing unrelated failures (deploy-flow timeout, Deploy-modal a11y) carried forward unchanged.

- [ ] **Step 4: Commit**

```bash
git add client/tests/smoke.spec.js
git commit -m "test: add Analytics dashboard e2e coverage and accessibility check"
```
