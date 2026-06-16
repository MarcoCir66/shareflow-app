import { BLOCK_CONTENT_DEFS, DEFAULT_CONTENT_SOURCE } from './blockContentSchemas.js'

function withContent(entry) {
  const def = BLOCK_CONTENT_DEFS[entry.id]
  if (!def) return entry
  return {
    ...entry,
    contentSourceTypes: def.sourceTypes,
    defaultProps: {
      ...entry.defaultProps,
      contentSource: { ...DEFAULT_CONTENT_SOURCE, type: def.sourceTypes[0] },
      contentItems: [],
    },
  }
}

export const CATEGORIES = {
  COMMUNICATION: 'COMMUNICATION',
  LEARNING: 'LEARNING',
  PRODUCTIVITY: 'PRODUCTIVITY',
  KNOWLEDGE_BASE: 'KNOWLEDGE_BASE',
}

export const CATEGORY_LABELS = {
  COMMUNICATION: 'Communication',
  LEARNING: 'Learning',
  PRODUCTIVITY: 'Productivity',
  KNOWLEDGE_BASE: 'Knowledge Base',
}

/** @type {Array<{id:string, label:string, category:string, icon:string, defaultProps:object, configurableProps:string[]}>} */
const _rawCatalog = [
  // ── COMMUNICATION ──────────────────────────────────────────────────────────
  { id: 'news-corporate',      label: 'News - Corporate',           category: CATEGORIES.COMMUNICATION, icon: 'Newspaper',     defaultProps: { scope: 'corporate', visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible', 'commentsEnabled', 'likesEnabled'] },
  { id: 'news-country',        label: 'News - Country',             category: CATEGORIES.COMMUNICATION, icon: 'Globe',         defaultProps: { scope: 'country',   visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible', 'commentsEnabled', 'likesEnabled'] },
  { id: 'news-sede',           label: 'News - Sede',                category: CATEGORIES.COMMUNICATION, icon: 'Building2',     defaultProps: { scope: 'sede',      visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible', 'commentsEnabled', 'likesEnabled'] },
  { id: 'news-funzione',       label: 'News - Funzione',            category: CATEGORIES.COMMUNICATION, icon: 'Briefcase',     defaultProps: { scope: 'funzione',  visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible', 'commentsEnabled', 'likesEnabled'] },
  { id: 'commenti-contenuto',  label: 'Commenti sul contenuto',     category: CATEGORIES.COMMUNICATION, icon: 'MessageSquare', defaultProps: { scope: null,        visible: true, commentsEnabled: true,  likesEnabled: false }, configurableProps: ['visible', 'commentsEnabled'] },
  { id: 'like-contenuto',      label: 'Like sul contenuto',         category: CATEGORIES.COMMUNICATION, icon: 'ThumbsUp',      defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: true  }, configurableProps: ['visible', 'likesEnabled'] },
  { id: 'avvisi-homepage',     label: 'Avvisi in home page',        category: CATEGORIES.COMMUNICATION, icon: 'AlertTriangle', defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'eventi-corporate',    label: 'Eventi - Corporate',         category: CATEGORIES.COMMUNICATION, icon: 'CalendarDays',  defaultProps: { scope: 'corporate', visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'eventi-country',      label: 'Eventi - Country',           category: CATEGORIES.COMMUNICATION, icon: 'CalendarRange', defaultProps: { scope: 'country',   visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'eventi-sede',         label: 'Eventi - Sede',              category: CATEGORIES.COMMUNICATION, icon: 'Calendar',      defaultProps: { scope: 'sede',      visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'eventi-funzione',     label: 'Eventi - Funzione',          category: CATEGORIES.COMMUNICATION, icon: 'CalendarCheck', defaultProps: { scope: 'funzione',  visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'sezione-fiere',       label: 'Sezione Fiere',              category: CATEGORIES.COMMUNICATION, icon: 'Store',         defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'sezione-mostre',      label: 'Sezione Mostre',             category: CATEGORIES.COMMUNICATION, icon: 'Frame',         defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'multimedia-gallery',  label: 'Multimedia Gallery',         category: CATEGORIES.COMMUNICATION, icon: 'GalleryHorizontal', defaultProps: { scope: null,   visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'countdown-lancio',    label: 'Count down di lancio',       category: CATEGORIES.COMMUNICATION, icon: 'Timer',         defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'rassegna-stampa',     label: 'Rassegna stampa',            category: CATEGORIES.COMMUNICATION, icon: 'ScrollText',    defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'bacheca-sindacale',   label: 'Bacheca Sindacale',          category: CATEGORIES.COMMUNICATION, icon: 'Landmark',      defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'bacheca-scambio',     label: 'Bacheca Cerco/scambio',      category: CATEGORIES.COMMUNICATION, icon: 'ArrowLeftRight', defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  // ── LEARNING ───────────────────────────────────────────────────────────────
  { id: 'new-entry',           label: 'New entry',                  category: CATEGORIES.LEARNING, icon: 'UserPlus',       defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'oggi-presentiamo',    label: 'Oggi presentiamo…',          category: CATEGORIES.LEARNING, icon: 'Presentation',   defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'polls-survey',        label: 'Polls & Survey',             category: CATEGORIES.LEARNING, icon: 'BarChart3',      defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'sezione-welfare',     label: 'Sezione Welfare',            category: CATEGORIES.LEARNING, icon: 'Heart',          defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  // ── PRODUCTIVITY ───────────────────────────────────────────────────────────
  { id: 'procedure',           label: 'Procedure',                  category: CATEGORIES.PRODUCTIVITY, icon: 'ClipboardList', defaultProps: { scope: null,      visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'sezione-progetti',    label: 'Sezione Progetti',           category: CATEGORIES.PRODUCTIVITY, icon: 'Kanban',        defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'meteo',               label: 'Meteo',                      category: CATEGORIES.PRODUCTIVITY, icon: 'CloudSun',      defaultProps: { scope: 'country',  visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'fusi-orari',          label: 'Fusi orari',                 category: CATEGORIES.PRODUCTIVITY, icon: 'Clock',         defaultProps: { scope: 'country',  visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'multilingua',         label: 'Multilingua',                category: CATEGORIES.PRODUCTIVITY, icon: 'Languages',     defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  // ── KNOWLEDGE BASE ─────────────────────────────────────────────────────────
  { id: 'motore-ricerca',      label: 'Motore di ricerca',          category: CATEGORIES.KNOWLEDGE_BASE, icon: 'Search',       defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'faq',                 label: 'FAQ',                        category: CATEGORIES.KNOWLEDGE_BASE, icon: 'HelpCircle',   defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'come-fare-per',       label: 'Come fare per',              category: CATEGORIES.KNOWLEDGE_BASE, icon: 'ListChecks',   defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'organigramma',        label: 'Organigramma',               category: CATEGORIES.KNOWLEDGE_BASE, icon: 'Network',      defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'rubrica-colleghi',    label: 'Rubrica (Cerca colleghi)',   category: CATEGORIES.KNOWLEDGE_BASE, icon: 'BookUser',     defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'chi-siamo',           label: 'Sezione Chi siamo',          category: CATEGORIES.KNOWLEDGE_BASE, icon: 'Info',         defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'desc-country',        label: 'Sezione descrittiva Country',category: CATEGORIES.KNOWLEDGE_BASE, icon: 'MapPin',       defaultProps: { scope: 'country',  visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'desc-sede',           label: 'Sezione descrittiva Sede',   category: CATEGORIES.KNOWLEDGE_BASE, icon: 'Building',     defaultProps: { scope: 'sede',     visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'desc-funzione',       label: 'Sezione descrittiva Funzione', category: CATEGORIES.KNOWLEDGE_BASE, icon: 'FolderOpen', defaultProps: { scope: 'funzione', visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
]

export const blockCatalog = _rawCatalog.map(withContent)

export const blockById = Object.fromEntries(blockCatalog.map(b => [b.id, b]))
