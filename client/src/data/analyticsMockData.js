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
