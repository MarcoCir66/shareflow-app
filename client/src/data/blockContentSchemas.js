export const SOURCE_TYPE_LABELS = {
  'sharepoint-list': 'SharePoint',
  'rss': 'RSS',
  'http-api': 'HTTP API',
  'manual': 'Manuale',
}

export const DEFAULT_CONTENT_SOURCE = { type: 'sharepoint-list', url: '', params: {} }

// Reusable schema fragments
const newsSchema = [
  { key: 'title',    label: 'Titolo',    type: 'text',     required: true  },
  { key: 'date',     label: 'Data',      type: 'date',     required: true  },
  { key: 'author',   label: 'Autore',    type: 'text',     required: false },
  { key: 'category', label: 'Categoria', type: 'text',     required: false },
  { key: 'body',     label: 'Testo',     type: 'textarea', required: false },
  { key: 'url',      label: 'Link',      type: 'url',      required: false },
  { key: 'imageUrl', label: 'Immagine',  type: 'url',      required: false },
]

const eventiSchema = [
  { key: 'title',       label: 'Titolo',      type: 'text',     required: true  },
  { key: 'date',        label: 'Data inizio', type: 'date',     required: true  },
  { key: 'endDate',     label: 'Data fine',   type: 'date',     required: false },
  { key: 'location',    label: 'Luogo',       type: 'text',     required: false },
  { key: 'description', label: 'Descrizione', type: 'textarea', required: false },
  { key: 'url',         label: 'Link',        type: 'url',      required: false },
  { key: 'imageUrl',    label: 'Immagine',    type: 'url',      required: false },
]

const mediaSchema = [
  { key: 'imageUrl', label: 'Immagine',   type: 'url',  required: true  },
  { key: 'title',    label: 'Titolo',     type: 'text', required: false },
  { key: 'caption',  label: 'Didascalia', type: 'text', required: false },
  { key: 'date',     label: 'Data',       type: 'date', required: false },
]

const genericListSchema = [
  { key: 'title',    label: 'Titolo',   type: 'text',     required: true  },
  { key: 'body',     label: 'Testo',    type: 'textarea', required: false },
  { key: 'date',     label: 'Data',     type: 'date',     required: false },
  { key: 'category', label: 'Categoria',type: 'text',     required: false },
  { key: 'url',      label: 'Link',     type: 'url',      required: false },
]

const descSchema = [
  { key: 'title',    label: 'Titolo',   type: 'text',     required: true  },
  { key: 'body',     label: 'Testo',    type: 'textarea', required: false },
  { key: 'imageUrl', label: 'Immagine', type: 'url',      required: false },
  { key: 'location', label: 'Luogo',    type: 'text',     required: false },
]

const SP_RSS_MANUAL = ['sharepoint-list', 'rss', 'manual']
const SP_MANUAL = ['sharepoint-list', 'manual']

/**
 * Map of blockId → { sourceTypes, schema }.
 * Blocks absent from this map have contentSourceTypes: null (no Contenuto tab).
 */
export const BLOCK_CONTENT_DEFS = {
  // ── Communication ────────────────────────────────────────────────────────────
  'news-corporate':    { sourceTypes: SP_RSS_MANUAL,  schema: newsSchema },
  'news-country':      { sourceTypes: SP_RSS_MANUAL,  schema: newsSchema },
  'news-sede':         { sourceTypes: SP_RSS_MANUAL,  schema: newsSchema },
  'news-funzione':     { sourceTypes: SP_RSS_MANUAL,  schema: newsSchema },
  'eventi-corporate':  { sourceTypes: SP_RSS_MANUAL,  schema: eventiSchema },
  'eventi-country':    { sourceTypes: SP_RSS_MANUAL,  schema: eventiSchema },
  'eventi-sede':       { sourceTypes: SP_RSS_MANUAL,  schema: eventiSchema },
  'eventi-funzione':   { sourceTypes: SP_RSS_MANUAL,  schema: eventiSchema },
  'avvisi-homepage':   {
    sourceTypes: SP_MANUAL,
    schema: [
      { key: 'title',    label: 'Titolo',   type: 'text',     required: true  },
      { key: 'body',     label: 'Testo',    type: 'textarea', required: false },
      { key: 'severity', label: 'Severità', type: 'select',   required: true,
        options: ['info', 'warning', 'error'] },
      { key: 'date',     label: 'Data',     type: 'date',     required: false },
      { key: 'url',      label: 'Link',     type: 'url',      required: false },
    ],
  },
  'countdown-lancio':  {
    sourceTypes: ['manual'],
    schema: [
      { key: 'title',       label: 'Titolo',      type: 'text',     required: true  },
      { key: 'targetDate',  label: 'Data lancio', type: 'date',     required: true  },
      { key: 'description', label: 'Descrizione', type: 'textarea', required: false },
    ],
  },
  'multimedia-gallery':{ sourceTypes: ['sharepoint-list', 'http-api', 'manual'], schema: mediaSchema },
  'rassegna-stampa':   {
    sourceTypes: ['rss', 'sharepoint-list', 'manual'],
    schema: [
      { key: 'title',   label: 'Titolo',   type: 'text',     required: true  },
      { key: 'source',  label: 'Fonte',    type: 'text',     required: false },
      { key: 'date',    label: 'Data',     type: 'date',     required: false },
      { key: 'url',     label: 'Link',     type: 'url',      required: false },
      { key: 'excerpt', label: 'Estratto', type: 'textarea', required: false },
    ],
  },
  'bacheca-sindacale': {
    sourceTypes: SP_MANUAL,
    schema: genericListSchema,
  },
  'bacheca-scambio':   {
    sourceTypes: SP_MANUAL,
    schema: [
      { key: 'title',    label: 'Titolo',   type: 'text',     required: true  },
      { key: 'body',     label: 'Testo',    type: 'textarea', required: false },
      { key: 'date',     label: 'Data',     type: 'date',     required: false },
      { key: 'category', label: 'Categoria',type: 'text',     required: false },
      { key: 'contact',  label: 'Contatto', type: 'text',     required: false },
    ],
  },
  'sezione-fiere':     {
    sourceTypes: SP_MANUAL,
    schema: [
      { key: 'title',       label: 'Titolo',      type: 'text',     required: true  },
      { key: 'date',        label: 'Data',         type: 'date',     required: false },
      { key: 'location',    label: 'Luogo',        type: 'text',     required: false },
      { key: 'description', label: 'Descrizione',  type: 'textarea', required: false },
      { key: 'url',         label: 'Link',         type: 'url',      required: false },
      { key: 'imageUrl',    label: 'Immagine',     type: 'url',      required: false },
    ],
  },
  'sezione-mostre':    {
    sourceTypes: SP_MANUAL,
    schema: [
      { key: 'title',       label: 'Titolo',      type: 'text',     required: true  },
      { key: 'date',        label: 'Data',         type: 'date',     required: false },
      { key: 'location',    label: 'Luogo',        type: 'text',     required: false },
      { key: 'description', label: 'Descrizione',  type: 'textarea', required: false },
      { key: 'url',         label: 'Link',         type: 'url',      required: false },
      { key: 'imageUrl',    label: 'Immagine',     type: 'url',      required: false },
    ],
  },
  // ── Learning ─────────────────────────────────────────────────────────────────
  'new-entry':         {
    sourceTypes: SP_MANUAL,
    schema: [
      { key: 'name',       label: 'Nome',    type: 'text',     required: true  },
      { key: 'department', label: 'Reparto', type: 'text',     required: false },
      { key: 'date',       label: 'Data',    type: 'date',     required: false },
      { key: 'body',       label: 'Testo',   type: 'textarea', required: false },
      { key: 'imageUrl',   label: 'Foto',    type: 'url',      required: false },
    ],
  },
  'oggi-presentiamo':  {
    sourceTypes: SP_MANUAL,
    schema: [
      { key: 'title',    label: 'Titolo',   type: 'text',     required: true  },
      { key: 'body',     label: 'Testo',    type: 'textarea', required: false },
      { key: 'imageUrl', label: 'Immagine', type: 'url',      required: false },
      { key: 'date',     label: 'Data',     type: 'date',     required: false },
    ],
  },
  'polls-survey':      {
    sourceTypes: SP_MANUAL,
    schema: [
      { key: 'question', label: 'Domanda',              type: 'text',  required: true  },
      { key: 'options',  label: 'Opzioni (una per riga)',type: 'array', required: true  },
      { key: 'date',     label: 'Scadenza',              type: 'date',  required: false },
    ],
  },
  'sezione-welfare':   { sourceTypes: SP_MANUAL, schema: genericListSchema },
  // ── Productivity ─────────────────────────────────────────────────────────────
  'procedure':         { sourceTypes: SP_MANUAL, schema: genericListSchema },
  'sezione-progetti':  {
    sourceTypes: SP_MANUAL,
    schema: [
      { key: 'title',       label: 'Titolo',      type: 'text',     required: true  },
      { key: 'description', label: 'Descrizione', type: 'textarea', required: false },
      { key: 'status',      label: 'Stato',       type: 'select',   required: false,
        options: ['active', 'completed', 'on-hold'] },
      { key: 'owner',       label: 'Owner',       type: 'text',     required: false },
      { key: 'date',        label: 'Scadenza',    type: 'date',     required: false },
    ],
  },
  'meteo':             {
    sourceTypes: ['http-api', 'manual'],
    schema: [
      { key: 'city',        label: 'Città',        type: 'text', required: true  },
      { key: 'temperature', label: 'Temperatura',  type: 'text', required: false },
      { key: 'condition',   label: 'Condizione',   type: 'text', required: false },
      { key: 'icon',        label: 'Icona (emoji)',type: 'text', required: false },
    ],
  },
  // ── Knowledge Base ────────────────────────────────────────────────────────────
  'faq':               {
    sourceTypes: SP_MANUAL,
    schema: [
      { key: 'question', label: 'Domanda',   type: 'text',     required: true  },
      { key: 'answer',   label: 'Risposta',  type: 'textarea', required: true  },
      { key: 'category', label: 'Categoria', type: 'text',     required: false },
    ],
  },
  'come-fare-per':     {
    sourceTypes: SP_MANUAL,
    schema: [
      { key: 'title',    label: 'Titolo',   type: 'text',     required: true  },
      { key: 'steps',    label: 'Passi',    type: 'textarea', required: false },
      { key: 'category', label: 'Categoria',type: 'text',     required: false },
      { key: 'url',      label: 'Link',     type: 'url',      required: false },
    ],
  },
  'organigramma':      {
    sourceTypes: ['sharepoint-list', 'http-api'],
    schema: [
      { key: 'name',       label: 'Nome',      type: 'text', required: true  },
      { key: 'role',       label: 'Ruolo',     type: 'text', required: false },
      { key: 'department', label: 'Reparto',   type: 'text', required: false },
      { key: 'email',      label: 'Email',     type: 'text', required: false },
      { key: 'imageUrl',   label: 'Foto',      type: 'url',  required: false },
      { key: 'parentId',   label: 'Parent ID', type: 'text', required: false },
    ],
  },
  'rubrica-colleghi':  {
    sourceTypes: ['sharepoint-list', 'http-api'],
    schema: [
      { key: 'name',       label: 'Nome',     type: 'text', required: true  },
      { key: 'role',       label: 'Ruolo',    type: 'text', required: false },
      { key: 'department', label: 'Reparto',  type: 'text', required: false },
      { key: 'email',      label: 'Email',    type: 'text', required: false },
      { key: 'phone',      label: 'Telefono', type: 'text', required: false },
      { key: 'imageUrl',   label: 'Foto',     type: 'url',  required: false },
    ],
  },
  'chi-siamo':         {
    sourceTypes: ['manual'],
    schema: [
      { key: 'title',    label: 'Titolo',   type: 'text',     required: true  },
      { key: 'body',     label: 'Testo',    type: 'textarea', required: false },
      { key: 'imageUrl', label: 'Immagine', type: 'url',      required: false },
    ],
  },
  'desc-country':      { sourceTypes: ['manual'], schema: descSchema },
  'desc-sede':         { sourceTypes: ['manual'], schema: descSchema },
  'desc-funzione':     { sourceTypes: ['manual'], schema: descSchema },
  // Absent: commenti-contenuto, like-contenuto, fusi-orari, multilingua, motore-ricerca
}
