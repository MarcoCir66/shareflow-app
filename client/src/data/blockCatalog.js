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
  { id: 'news-corporate',      label: 'News - Corporate',           category: CATEGORIES.COMMUNICATION, icon: 'Newspaper',     defaultProps: { scope: 'corporate', visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['scope', 'visible', 'commentsEnabled', 'likesEnabled', 'mandatoryRead'] },
  { id: 'news-country',        label: 'News - Country',             category: CATEGORIES.COMMUNICATION, icon: 'Globe',         defaultProps: { scope: 'country',   visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['scope', 'visible', 'commentsEnabled', 'likesEnabled', 'mandatoryRead'] },
  { id: 'news-sede',           label: 'News - Sede',                category: CATEGORIES.COMMUNICATION, icon: 'Building2',     defaultProps: { scope: 'sede',      visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['scope', 'visible', 'commentsEnabled', 'likesEnabled', 'mandatoryRead'] },
  { id: 'news-funzione',       label: 'News - Funzione',            category: CATEGORIES.COMMUNICATION, icon: 'Briefcase',     defaultProps: { scope: 'funzione',  visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['scope', 'visible', 'commentsEnabled', 'likesEnabled', 'mandatoryRead'] },
  { id: 'commenti-contenuto',  label: 'Commenti sul contenuto',     category: CATEGORIES.COMMUNICATION, icon: 'MessageSquare', defaultProps: { scope: null,        visible: true, commentsEnabled: true,  likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'commentsEnabled', 'mandatoryRead'] },
  { id: 'like-contenuto',      label: 'Like sul contenuto',         category: CATEGORIES.COMMUNICATION, icon: 'ThumbsUp',      defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: true, mandatoryRead: false }, configurableProps: ['visible', 'likesEnabled', 'mandatoryRead'] },
  { id: 'avvisi-homepage',     label: 'Avvisi in home page',        category: CATEGORIES.COMMUNICATION, icon: 'AlertTriangle', defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'eventi-corporate',    label: 'Eventi - Corporate',         category: CATEGORIES.COMMUNICATION, icon: 'CalendarDays',  defaultProps: { scope: 'corporate', visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['scope', 'visible', 'mandatoryRead'] },
  { id: 'eventi-country',      label: 'Eventi - Country',           category: CATEGORIES.COMMUNICATION, icon: 'CalendarRange', defaultProps: { scope: 'country',   visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['scope', 'visible', 'mandatoryRead'] },
  { id: 'eventi-sede',         label: 'Eventi - Sede',              category: CATEGORIES.COMMUNICATION, icon: 'Calendar',      defaultProps: { scope: 'sede',      visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['scope', 'visible', 'mandatoryRead'] },
  { id: 'eventi-funzione',     label: 'Eventi - Funzione',          category: CATEGORIES.COMMUNICATION, icon: 'CalendarCheck', defaultProps: { scope: 'funzione',  visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['scope', 'visible', 'mandatoryRead'] },
  { id: 'sezione-fiere',       label: 'Sezione Fiere',              category: CATEGORIES.COMMUNICATION, icon: 'Store',         defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'sezione-mostre',      label: 'Sezione Mostre',             category: CATEGORIES.COMMUNICATION, icon: 'Frame',         defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'multimedia-gallery',  label: 'Multimedia Gallery',         category: CATEGORIES.COMMUNICATION, icon: 'GalleryHorizontal', defaultProps: { scope: null,   visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'countdown-lancio',    label: 'Count down di lancio',       category: CATEGORIES.COMMUNICATION, icon: 'Timer',         defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'rassegna-stampa',     label: 'Rassegna stampa',            category: CATEGORIES.COMMUNICATION, icon: 'ScrollText',    defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'bacheca-sindacale',   label: 'Bacheca Sindacale',          category: CATEGORIES.COMMUNICATION, icon: 'Landmark',      defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'bacheca-scambio',     label: 'Bacheca Cerco/scambio',      category: CATEGORIES.COMMUNICATION, icon: 'ArrowLeftRight', defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'linkedin-feed',       label: 'Feed LinkedIn',              category: CATEGORIES.COMMUNICATION, icon: 'Rss',           defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'calendario-eventi',   label: 'Calendario',                category: CATEGORIES.COMMUNICATION, icon: 'CalendarClock', defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'carosello-contenuti', label: 'Carosello',                  category: CATEGORIES.COMMUNICATION, icon: 'GalleryHorizontalEnd', defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  // ── LEARNING ───────────────────────────────────────────────────────────────
  { id: 'new-entry',           label: 'New entry',                  category: CATEGORIES.LEARNING, icon: 'UserPlus',       defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'oggi-presentiamo',    label: 'Oggi presentiamo…',          category: CATEGORIES.LEARNING, icon: 'Presentation',   defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'polls-survey',        label: 'Polls & Survey',             category: CATEGORIES.LEARNING, icon: 'BarChart3',      defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'sezione-welfare',     label: 'Sezione Welfare',            category: CATEGORIES.LEARNING, icon: 'Heart',          defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'kudos',                label: 'Kudos',                      category: CATEGORIES.LEARNING, icon: 'Award',              defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'anniversari',          label: 'Anniversari',                category: CATEGORIES.LEARNING, icon: 'PartyPopper',        defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'feedback-utenti',      label: 'Feedback Utenti',            category: CATEGORIES.LEARNING, icon: 'MessageCircleQuestion', defaultProps: { scope: null,    visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  // ── PRODUCTIVITY ───────────────────────────────────────────────────────────
  { id: 'procedure',           label: 'Procedure',                  category: CATEGORIES.PRODUCTIVITY, icon: 'ClipboardList', defaultProps: { scope: null,      visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'sezione-progetti',    label: 'Sezione Progetti',           category: CATEGORIES.PRODUCTIVITY, icon: 'Kanban',        defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'meteo',               label: 'Meteo',                      category: CATEGORIES.PRODUCTIVITY, icon: 'CloudSun',      defaultProps: { scope: 'country',  visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['scope', 'visible', 'mandatoryRead'] },
  { id: 'fusi-orari',          label: 'Fusi orari',                 category: CATEGORIES.PRODUCTIVITY, icon: 'Clock',         defaultProps: { scope: 'country',  visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['scope', 'visible', 'mandatoryRead'] },
  { id: 'multilingua',         label: 'Multilingua',                category: CATEGORIES.PRODUCTIVITY, icon: 'Languages',     defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'collegamenti-rapidi',  label: 'Collegamenti Rapidi',        category: CATEGORIES.PRODUCTIVITY, icon: 'Link2',           defaultProps: { scope: null,      visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'pulsante-cta',         label: 'Pulsante CTA',               category: CATEGORIES.PRODUCTIVITY, icon: 'MousePointerClick', defaultProps: { scope: null,    visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'titolo-libero',        label: 'Titolo Libero',              category: CATEGORIES.PRODUCTIVITY, icon: 'Heading',         defaultProps: { scope: null,      visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'embed-custom',         label: 'Embed Personalizzato',       category: CATEGORIES.PRODUCTIVITY, icon: 'Code2',           defaultProps: { scope: null,      visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  // ── KNOWLEDGE BASE ─────────────────────────────────────────────────────────
  { id: 'motore-ricerca',      label: 'Motore di ricerca',          category: CATEGORIES.KNOWLEDGE_BASE, icon: 'Search',       defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'faq',                 label: 'FAQ',                        category: CATEGORIES.KNOWLEDGE_BASE, icon: 'HelpCircle',   defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'come-fare-per',       label: 'Come fare per',              category: CATEGORIES.KNOWLEDGE_BASE, icon: 'ListChecks',   defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'organigramma',        label: 'Organigramma',               category: CATEGORIES.KNOWLEDGE_BASE, icon: 'Network',      defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'rubrica-colleghi',    label: 'Rubrica (Cerca colleghi)',   category: CATEGORIES.KNOWLEDGE_BASE, icon: 'BookUser',     defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'contatti-chiave',      label: 'Contatti Chiave',            category: CATEGORIES.KNOWLEDGE_BASE, icon: 'IdCard',        defaultProps: { scope: null,      visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'documenti',           label: 'Documenti',                  category: CATEGORIES.KNOWLEDGE_BASE, icon: 'FileText',     defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'chi-siamo',           label: 'Sezione Chi siamo',          category: CATEGORIES.KNOWLEDGE_BASE, icon: 'Info',         defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
  { id: 'desc-country',        label: 'Sezione descrittiva Country',category: CATEGORIES.KNOWLEDGE_BASE, icon: 'MapPin',       defaultProps: { scope: 'country',  visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['scope', 'visible', 'mandatoryRead'] },
  { id: 'desc-sede',           label: 'Sezione descrittiva Sede',   category: CATEGORIES.KNOWLEDGE_BASE, icon: 'Building',     defaultProps: { scope: 'sede',     visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['scope', 'visible', 'mandatoryRead'] },
  { id: 'desc-funzione',       label: 'Sezione descrittiva Funzione', category: CATEGORIES.KNOWLEDGE_BASE, icon: 'FolderOpen', defaultProps: { scope: 'funzione', visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['scope', 'visible', 'mandatoryRead'] },
  { id: 'timeline-aziendale',  label: 'Timeline Aziendale',         category: CATEGORIES.KNOWLEDGE_BASE, icon: 'Milestone',     defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false, mandatoryRead: false }, configurableProps: ['visible', 'mandatoryRead'] },
]

export const blockCatalog = _rawCatalog.map(withContent)

export const blockById = Object.fromEntries(blockCatalog.map(b => [b.id, b]))
