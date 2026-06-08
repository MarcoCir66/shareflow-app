export const CATEGORIES = {
  COMMUNICATION: 'COMMUNICATION',
  EVENTS: 'EVENTS',
  EMPLOYEES: 'EMPLOYEES',
  COLLABORATION: 'COLLABORATION',
  STRUCTURE: 'STRUCTURE',
}

export const CATEGORY_LABELS = {
  COMMUNICATION: 'Internal Communication & News',
  EVENTS: 'Events & Initiatives',
  EMPLOYEES: 'Employees & Engagement',
  COLLABORATION: 'Collaboration & Utilities',
  STRUCTURE: 'Structure & Core',
}

/** @type {Array<{id:string, label:string, category:string, icon:string, defaultProps:object, configurableProps:string[]}>} */
export const blockCatalog = [
  // ── COMMUNICATION ──────────────────────────────────────────────────────────
  { id: 'news-corporate',      label: 'News - Corporate',           category: CATEGORIES.COMMUNICATION, icon: 'Newspaper',     defaultProps: { scope: 'corporate', visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible', 'commentsEnabled', 'likesEnabled'] },
  { id: 'news-country',        label: 'News - Country',             category: CATEGORIES.COMMUNICATION, icon: 'Globe',         defaultProps: { scope: 'country',   visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible', 'commentsEnabled', 'likesEnabled'] },
  { id: 'news-sede',           label: 'News - Sede',                category: CATEGORIES.COMMUNICATION, icon: 'Building2',     defaultProps: { scope: 'sede',      visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible', 'commentsEnabled', 'likesEnabled'] },
  { id: 'news-funzione',       label: 'News - Funzione',            category: CATEGORIES.COMMUNICATION, icon: 'Briefcase',     defaultProps: { scope: 'funzione',  visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible', 'commentsEnabled', 'likesEnabled'] },
  { id: 'commenti-contenuto',  label: 'Commenti sul contenuto',     category: CATEGORIES.COMMUNICATION, icon: 'MessageSquare', defaultProps: { scope: null,        visible: true, commentsEnabled: true,  likesEnabled: false }, configurableProps: ['visible', 'commentsEnabled'] },
  { id: 'like-contenuto',      label: 'Like sul contenuto',         category: CATEGORIES.COMMUNICATION, icon: 'ThumbsUp',      defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: true  }, configurableProps: ['visible', 'likesEnabled'] },
  { id: 'avvisi-homepage',     label: 'Avvisi in home page',        category: CATEGORIES.COMMUNICATION, icon: 'AlertTriangle', defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  // ── EVENTS ─────────────────────────────────────────────────────────────────
  { id: 'eventi-corporate',    label: 'Eventi - Corporate',         category: CATEGORIES.EVENTS, icon: 'CalendarDays',  defaultProps: { scope: 'corporate', visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'eventi-country',      label: 'Eventi - Country',           category: CATEGORIES.EVENTS, icon: 'CalendarRange', defaultProps: { scope: 'country',   visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'eventi-sede',         label: 'Eventi - Sede',              category: CATEGORIES.EVENTS, icon: 'Calendar',      defaultProps: { scope: 'sede',      visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'eventi-funzione',     label: 'Eventi - Funzione',          category: CATEGORIES.EVENTS, icon: 'CalendarCheck', defaultProps: { scope: 'funzione',  visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'sezione-fiere',       label: 'Sezione Fiere',              category: CATEGORIES.EVENTS, icon: 'Store',         defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'sezione-mostre',      label: 'Sezione Mostre',             category: CATEGORIES.EVENTS, icon: 'Frame',         defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'multimedia-gallery',  label: 'Multimedia Gallery',         category: CATEGORIES.EVENTS, icon: 'GalleryHorizontal', defaultProps: { scope: null,   visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'countdown-lancio',    label: 'Count down di lancio',       category: CATEGORIES.EVENTS, icon: 'Timer',         defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  // ── EMPLOYEES ──────────────────────────────────────────────────────────────
  { id: 'new-entry',           label: 'New entry',                  category: CATEGORIES.EMPLOYEES, icon: 'UserPlus',       defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'oggi-presentiamo',    label: 'Oggi presentiamo…',          category: CATEGORIES.EMPLOYEES, icon: 'Presentation',   defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'rubrica-colleghi',    label: 'Rubrica (Cerca colleghi)',   category: CATEGORIES.EMPLOYEES, icon: 'BookUser',       defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'organigramma',        label: 'Organigramma',               category: CATEGORIES.EMPLOYEES, icon: 'Network',        defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'polls-survey',        label: 'Polls & Survey',             category: CATEGORIES.EMPLOYEES, icon: 'BarChart3',      defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'faq',                 label: 'FAQ',                        category: CATEGORIES.EMPLOYEES, icon: 'HelpCircle',     defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'come-fare-per',       label: 'Come fare per',              category: CATEGORIES.EMPLOYEES, icon: 'ListChecks',     defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'sezione-welfare',     label: 'Sezione Welfare',            category: CATEGORIES.EMPLOYEES, icon: 'Heart',          defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  // ── COLLABORATION ──────────────────────────────────────────────────────────
  { id: 'bacheca-sindacale',   label: 'Bacheca Sindacale',          category: CATEGORIES.COLLABORATION, icon: 'Landmark',    defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'bacheca-scambio',     label: 'Bacheca Cerco/scambio',      category: CATEGORIES.COLLABORATION, icon: 'ArrowLeftRight', defaultProps: { scope: null,  visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'rassegna-stampa',     label: 'Rassegna stampa',            category: CATEGORIES.COLLABORATION, icon: 'ScrollText',  defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'procedure',           label: 'Procedure',                  category: CATEGORIES.COLLABORATION, icon: 'ClipboardList', defaultProps: { scope: null,     visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'meteo',               label: 'Meteo',                      category: CATEGORIES.COLLABORATION, icon: 'CloudSun',    defaultProps: { scope: 'country',  visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'fusi-orari',          label: 'Fusi orari',                 category: CATEGORIES.COLLABORATION, icon: 'Clock',       defaultProps: { scope: 'country',  visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  // ── STRUCTURE ──────────────────────────────────────────────────────────────
  { id: 'chi-siamo',           label: 'Sezione Chi siamo',          category: CATEGORIES.STRUCTURE, icon: 'Info',           defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'desc-country',        label: 'Sezione descrittiva Country',category: CATEGORIES.STRUCTURE, icon: 'MapPin',         defaultProps: { scope: 'country',  visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'desc-sede',           label: 'Sezione descrittiva Sede',   category: CATEGORIES.STRUCTURE, icon: 'Building',       defaultProps: { scope: 'sede',     visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'desc-funzione',       label: 'Sezione descrittiva Funzione', category: CATEGORIES.STRUCTURE, icon: 'FolderOpen',  defaultProps: { scope: 'funzione', visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['scope', 'visible'] },
  { id: 'sezione-progetti',    label: 'Sezione Progetti',           category: CATEGORIES.STRUCTURE, icon: 'Kanban',         defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'motore-ricerca',      label: 'Motore di ricerca',          category: CATEGORIES.STRUCTURE, icon: 'Search',         defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'multilingua',         label: 'Multilingua',                category: CATEGORIES.STRUCTURE, icon: 'Languages',      defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
]

export const blockById = Object.fromEntries(blockCatalog.map(b => [b.id, b]))
