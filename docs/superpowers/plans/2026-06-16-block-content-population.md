# Block Content Population Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-block content source configuration (SharePoint list, RSS, HTTP API, manual) and a schema-driven item editor to ShareFlow, so users can configure where each block's data comes from and populate sample data (or production content for manual blocks) that appears in the editor canvas preview.

**Architecture:** All content data (`contentSource` + `contentItems`) lives in each block instance's existing `props` object — no new reducer or store. A new `blockContentSchemas.js` data file defines field schemas per block type. `blockCatalog.js` is enriched via a `.map(withContent)` pipeline that adds `contentSourceTypes` and default content props to applicable blocks. The PropertiesPanel gains a "Contenuto" tab that composes three new components: `SourceSelector`, `ContentItemForm`, and `ContentPanel`. `CanvasBlockPreview` gains a content-aware rendering branch (falls back to existing skeletons when no items).

**Tech Stack:** React 19, Vite, Tailwind CSS 3.4 (custom colors: navy/#0F1C2E, navy-light/#1A2F4A, blue/#0078D4, blue-electric/#00B4FF, slate-mid/#2D3E50, slate-light/#8899AA), lucide-react, @playwright/test (e2e only — no unit test framework).

---

## File Structure

**New files:**
- `client/src/data/blockContentSchemas.js` — content schemas and source type definitions per block ID
- `client/src/components/sidebar-right/SourceSelector.jsx` — source type segmented control + URL field
- `client/src/components/sidebar-right/ContentItemForm.jsx` — schema-driven inline form for one item
- `client/src/components/sidebar-right/ContentPanel.jsx` — assembles SourceSelector + item list CRUD

**Modified files:**
- `client/src/data/blockCatalog.js` — import blockContentSchemas, add `withContent()` helper, pipe catalog through `.map(withContent)`
- `client/src/components/sidebar-right/PropertiesPanel.jsx` — add "Contenuto" tab bar + conditional ContentPanel
- `client/src/components/canvas/CanvasBlock.jsx` — pass `widget.props.contentItems` to CanvasBlockPreview
- `client/src/components/canvas/CanvasBlockPreview.jsx` — accept `contentItems` prop, add content-aware rendering branches
- `client/tests/smoke.spec.js` — add 3 e2e tests

---

## Context for agentic workers

**Key patterns:**
- `useConfigurator()` returns `{ state, dispatch, ACTIONS }` from `ConfiguratorContext`
- To update a widget prop: `dispatch({ type: ACTIONS.UPDATE_WIDGET_PROP, payload: { instanceId, key, value } })`
- `UPDATE_WIDGET_PROP` does a flat merge on `props`: `{ ...w.props, [key]: value }` — use it twice for `contentSource` and `contentItems` separately
- `blockById` (from blockCatalog) maps blockId → catalog entry; `findWidget(sections, instanceId)` finds a widget in nested sections
- Custom Tailwind colors: `navy` (#0F1C2E), `navy-light` (#1A2F4A), `blue` (#0078D4), `blue-electric` (#00B4FF), `slate-mid` (#2D3E50), `slate-light` (#8899AA), `surface` (#F3F6F9)
- Tests run with: `npm run test:e2e` (Playwright, auto-starts dev server on port 5173)
- No unit test framework — e2e only

**Git root:** `shareflow-app/` — run all commands from there. The client code is in `client/src/`.

---

### Task 1: Content schemas data file

**Files:**
- Create: `client/src/data/blockContentSchemas.js`

- [ ] **Step 1: Create `client/src/data/blockContentSchemas.js`** with complete schemas for all 27 content-enabled block types

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add client/src/data/blockContentSchemas.js
git commit -m "feat: add block content schemas data file"
```

---

### Task 2: Enrich blockCatalog with content definitions

**Files:**
- Modify: `client/src/data/blockCatalog.js`

The catalog is enriched via `.map(withContent)`. The existing entries are unchanged — the helper adds `contentSourceTypes` and default content props to blocks that have a `BLOCK_CONTENT_DEFS` entry.

- [ ] **Step 1: Add import and `withContent` helper at the top of `client/src/data/blockCatalog.js`**

Add these two lines after the existing first line (which has no imports currently):

```js
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
```

- [ ] **Step 2: Pipe the catalog array through `.map(withContent)` and do the same for `blockById`**

Change the existing export at the end of the file from:

```js
export const blockCatalog = [
  // ... all entries ...
]

export const blockById = Object.fromEntries(blockCatalog.map(b => [b.id, b]))
```

to:

```js
const _rawCatalog = [
  // ... all entries unchanged ...
]

export const blockCatalog = _rawCatalog.map(withContent)

export const blockById = Object.fromEntries(blockCatalog.map(b => [b.id, b]))
```

Concretely: rename the existing `export const blockCatalog = [` to `const _rawCatalog = [`, then add `export const blockCatalog = _rawCatalog.map(withContent)` before the existing `blockById` line.

- [ ] **Step 3: Verify in browser**

Run `npm run dev` from `shareflow-app/` and open http://localhost:5173. Add any News block to the canvas. Open browser console and run:

```js
// In browser console (after importing via window or checking React DevTools):
// Verify contentSourceTypes is present on a news block
```

The app should load without errors. The canvas and block library should work exactly as before.

- [ ] **Step 4: Commit**

```bash
git add client/src/data/blockCatalog.js
git commit -m "feat: enrich blockCatalog with contentSourceTypes and default content props"
```

---

### Task 3: SourceSelector component

**Files:**
- Create: `client/src/components/sidebar-right/SourceSelector.jsx`

- [ ] **Step 1: Create `client/src/components/sidebar-right/SourceSelector.jsx`**

```jsx
import { SOURCE_TYPE_LABELS } from '../../data/blockContentSchemas.js'

export default function SourceSelector({ sourceTypes, value, onChange }) {
  const isManual = value.type === 'manual'

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-light">Fonte dati</p>

      {sourceTypes.length > 1 && (
        <div className="flex gap-1">
          {sourceTypes.map(type => (
            <button
              key={type}
              onClick={() => onChange({ ...value, type })}
              className={`flex-1 text-center py-1 px-1 rounded text-[10px] font-medium transition-colors ${
                value.type === type
                  ? 'bg-blue text-white'
                  : 'bg-slate text-slate-light hover:text-white'
              }`}
            >
              {SOURCE_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}

      {sourceTypes.length === 1 && (
        <p className="text-xs text-slate-light">{SOURCE_TYPE_LABELS[sourceTypes[0]]}</p>
      )}

      {isManual ? (
        <div className="bg-blue/10 border border-blue/20 rounded p-2 text-xs text-blue-electric">
          In modalità manuale il contenuto inserito qui è quello pubblicato in produzione.
        </div>
      ) : (
        <div>
          <label className="text-[10px] text-slate-light block mb-1">URL</label>
          <input
            type="url"
            value={value.url}
            onChange={e => onChange({ ...value, url: e.target.value })}
            placeholder={
              value.type === 'sharepoint-list'
                ? 'https://tenant.sharepoint.com/sites/.../Lists/...'
                : value.type === 'rss'
                ? 'https://example.com/feed.xml'
                : 'https://api.example.com/endpoint'
            }
            className="w-full text-xs bg-slate border border-slate-mid rounded px-2 py-1.5 text-white placeholder-slate-mid focus:outline-none focus:border-blue"
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/sidebar-right/SourceSelector.jsx
git commit -m "feat: add SourceSelector component for content source type and URL"
```

---

### Task 4: ContentItemForm component

**Files:**
- Create: `client/src/components/sidebar-right/ContentItemForm.jsx`

- [ ] **Step 1: Create `client/src/components/sidebar-right/ContentItemForm.jsx`**

```jsx
import { useState } from 'react'

export default function ContentItemForm({ schema, item, onSave, onCancel }) {
  const [values, setValues] = useState(() => {
    const init = {}
    schema.forEach(field => { init[field.key] = item[field.key] ?? '' })
    return init
  })
  const [errors, setErrors] = useState({})

  function set(key, val) {
    setValues(v => ({ ...v, [key]: val }))
  }

  function handleSave() {
    const newErrors = {}
    schema.filter(f => f.required).forEach(f => {
      const v = values[f.key]
      const empty = !v || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '')
      if (empty) newErrors[f.key] = true
    })
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    onSave(values)
  }

  return (
    <div className="border border-blue/40 rounded p-3 mb-2 space-y-2 bg-slate">
      {schema.map(field => (
        <div key={field.key}>
          <label className="text-[10px] text-slate-light block mb-0.5">
            {field.label}
            {field.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>

          {field.type === 'textarea' ? (
            <textarea
              value={values[field.key]}
              onChange={e => set(field.key, e.target.value)}
              rows={3}
              className={`w-full text-xs bg-navy border rounded px-2 py-1 text-white focus:outline-none resize-none ${
                errors[field.key] ? 'border-red-400' : 'border-slate-mid focus:border-blue'
              }`}
            />
          ) : field.type === 'select' ? (
            <select
              value={values[field.key]}
              onChange={e => set(field.key, e.target.value)}
              className={`w-full text-xs bg-navy border rounded px-2 py-1 text-white focus:outline-none ${
                errors[field.key] ? 'border-red-400' : 'border-slate-mid focus:border-blue'
              }`}
            >
              <option value="">— seleziona —</option>
              {field.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field.type === 'array' ? (
            <textarea
              value={Array.isArray(values[field.key]) ? values[field.key].join('\n') : values[field.key]}
              onChange={e => set(field.key, e.target.value.split('\n').filter(Boolean))}
              rows={3}
              placeholder="Un'opzione per riga"
              className={`w-full text-xs bg-navy border rounded px-2 py-1 text-white placeholder-slate-mid focus:outline-none resize-none ${
                errors[field.key] ? 'border-red-400' : 'border-slate-mid focus:border-blue'
              }`}
            />
          ) : (
            <input
              type={field.type === 'date' ? 'date' : field.type === 'url' ? 'url' : 'text'}
              value={values[field.key]}
              onChange={e => set(field.key, e.target.value)}
              className={`w-full text-xs bg-navy border rounded px-2 py-1 text-white focus:outline-none ${
                errors[field.key] ? 'border-red-400' : 'border-slate-mid focus:border-blue'
              }`}
            />
          )}
        </div>
      ))}

      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="text-xs text-slate-light hover:text-white px-2 py-1 transition-colors"
        >
          Annulla
        </button>
        <button
          onClick={handleSave}
          className="text-xs bg-blue hover:bg-blue/80 text-white rounded px-3 py-1 transition-colors"
        >
          Salva
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/sidebar-right/ContentItemForm.jsx
git commit -m "feat: add ContentItemForm schema-driven inline editor"
```

---

### Task 5: ContentPanel component

**Files:**
- Create: `client/src/components/sidebar-right/ContentPanel.jsx`

- [ ] **Step 1: Create `client/src/components/sidebar-right/ContentPanel.jsx`**

```jsx
import { useState } from 'react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { BLOCK_CONTENT_DEFS } from '../../data/blockContentSchemas.js'
import SourceSelector from './SourceSelector.jsx'
import ContentItemForm from './ContentItemForm.jsx'

export default function ContentPanel({ widget, block }) {
  const { dispatch, ACTIONS } = useConfigurator()
  const [editingIndex, setEditingIndex] = useState(null) // null=closed, -1=adding new, N=editing item N

  const def = BLOCK_CONTENT_DEFS[block.id]
  const schema = def?.schema ?? []

  const contentSource = widget.props.contentSource ?? { type: def.sourceTypes[0], url: '', params: {} }
  const contentItems  = widget.props.contentItems  ?? []

  function updateSource(newSource) {
    dispatch({ type: ACTIONS.UPDATE_WIDGET_PROP, payload: { instanceId: widget.instanceId, key: 'contentSource', value: newSource } })
  }

  function updateItems(newItems) {
    dispatch({ type: ACTIONS.UPDATE_WIDGET_PROP, payload: { instanceId: widget.instanceId, key: 'contentItems', value: newItems } })
  }

  function saveItem(item) {
    if (editingIndex === -1) {
      updateItems([...contentItems, item])
    } else {
      updateItems(contentItems.map((it, i) => i === editingIndex ? item : it))
    }
    setEditingIndex(null)
  }

  function removeItem(index) {
    updateItems(contentItems.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
  }

  const isManual = contentSource.type === 'manual'
  const sectionLabel = isManual ? 'Contenuto' : 'Dati campione'

  function itemLabel(item) {
    return item.title || item.name || item.question || Object.values(item).find(v => typeof v === 'string' && v.trim()) || '—'
  }

  return (
    <div className="space-y-4">
      <SourceSelector
        sourceTypes={block.contentSourceTypes}
        value={contentSource}
        onChange={updateSource}
      />

      <div className="border-t border-slate-mid pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-light flex items-center gap-2">
            {sectionLabel}
            {isManual && (
              <span className="bg-green-600 text-white text-[9px] rounded px-1.5 py-0.5 font-bold normal-case tracking-normal">
                PRODUZIONE
              </span>
            )}
          </span>
          {editingIndex === null && (
            <button
              onClick={() => setEditingIndex(-1)}
              className="text-[10px] bg-blue text-white rounded px-2 py-0.5 hover:bg-blue/80 transition-colors"
            >
              + Aggiungi
            </button>
          )}
        </div>

        {!isManual && contentSource.url === '' && contentItems.length === 0 && editingIndex === null && (
          <p className="text-[10px] text-slate-light italic mb-3">
            Inserisci un URL per la fonte esterna, poi aggiungi dati campione per l&apos;anteprima.
          </p>
        )}

        {contentItems.map((item, i) =>
          editingIndex === i ? (
            <ContentItemForm
              key={i}
              schema={schema}
              item={item}
              onSave={saveItem}
              onCancel={() => setEditingIndex(null)}
            />
          ) : (
            <div
              key={i}
              className="border border-slate-mid rounded px-3 py-2 mb-1.5 flex items-center gap-2"
            >
              <span className="text-xs text-white truncate flex-1">{itemLabel(item)}</span>
              <button
                onClick={() => setEditingIndex(i)}
                className="text-slate-light hover:text-white text-xs flex-shrink-0 transition-colors"
                title="Modifica"
              >✎</button>
              <button
                onClick={() => removeItem(i)}
                className="text-slate-light hover:text-red-400 text-xs flex-shrink-0 transition-colors"
                title="Rimuovi"
              >✕</button>
            </div>
          )
        )}

        {editingIndex === -1 && (
          <ContentItemForm
            schema={schema}
            item={{}}
            onSave={saveItem}
            onCancel={() => setEditingIndex(null)}
          />
        )}

        {contentItems.length === 0 && editingIndex === null && (
          <button
            onClick={() => setEditingIndex(-1)}
            className="w-full border border-dashed border-slate-mid rounded p-2 text-xs text-slate-light hover:text-white hover:border-slate-light transition-colors"
          >
            + Aggiungi item
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/sidebar-right/ContentPanel.jsx
git commit -m "feat: add ContentPanel with source selector and item CRUD"
```

---

### Task 6: PropertiesPanel — add "Contenuto" tab

**Files:**
- Modify: `client/src/components/sidebar-right/PropertiesPanel.jsx`

The tab bar appears below the block header only when `block.contentSourceTypes !== null`. Tab state resets to `'props'` when the selected block changes (via `key={widget.instanceId}` on the root `<div>`).

- [ ] **Step 1: Replace the full content of `client/src/components/sidebar-right/PropertiesPanel.jsx`**

```jsx
import { useState, useEffect } from 'react'
import * as icons from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { blockById, CATEGORY_LABELS } from '../../data/blockCatalog.js'
import { findWidget } from '../../context/sectionHelpers.js'
import { findPage } from '../../context/pageHelpers.js'
import EmptyState from './EmptyState.jsx'
import ScopeSelector from './ScopeSelector.jsx'
import ToggleField from './ToggleField.jsx'
import SectionPropertiesPanel from './SectionPropertiesPanel.jsx'
import ContentPanel from './ContentPanel.jsx'

const PROP_LABELS = {
  visible:         'Visible',
  commentsEnabled: 'Comments enabled',
  likesEnabled:    'Likes enabled',
}

export default function PropertiesPanel() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { selectedWidgetInstanceId, selectedSectionId } = state
  const activePage = findPage(state.pages, state.activePageId)
  const [activeTab, setActiveTab] = useState('props')

  // Reset to Proprietà tab whenever the selected widget changes
  useEffect(() => { setActiveTab('props') }, [selectedWidgetInstanceId])

  if (selectedSectionId) {
    return <SectionPropertiesPanel sectionId={selectedSectionId} />
  }

  const widget = findWidget(activePage.sections, selectedWidgetInstanceId)
  const block  = widget ? blockById[widget.blockId] : null

  if (!widget || !block) return <EmptyState />

  const Icon = icons[block.icon] ?? icons.Box
  const hasContentTab = block.contentSourceTypes != null

  function updateProp(key, value) {
    dispatch({ type: ACTIONS.UPDATE_WIDGET_PROP, payload: { instanceId: widget.instanceId, key, value } })
  }

  return (
    <div key={widget.instanceId} className="p-4">
      <div className="flex items-center gap-3 mb-1 pb-4 border-b border-slate-mid">
        <div className="w-9 h-9 rounded-lg bg-blue/20 flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-blue-electric" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white leading-tight">{block.label}</h3>
          <span className="text-xs text-slate-light">{CATEGORY_LABELS[block.category]}</span>
        </div>
      </div>

      {hasContentTab && (
        <div className="flex border-b border-slate-mid mb-4 mt-3">
          <button
            onClick={() => setActiveTab('props')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'props'
                ? 'text-white border-b-2 border-blue-electric -mb-px'
                : 'text-slate-light hover:text-white'
            }`}
          >
            Proprietà
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'content'
                ? 'text-white border-b-2 border-blue-electric -mb-px'
                : 'text-slate-light hover:text-white'
            }`}
          >
            Contenuto
          </button>
        </div>
      )}

      {activeTab === 'props' && (
        <div className="mt-4 space-y-5">
          {block.configurableProps.map(key => {
            if (key === 'scope') {
              return (
                <ScopeSelector
                  key={key}
                  value={widget.props.scope}
                  onChange={v => updateProp('scope', v)}
                />
              )
            }
            return (
              <ToggleField
                key={key}
                label={PROP_LABELS[key] ?? key}
                value={widget.props[key]}
                onChange={v => updateProp(key, v)}
              />
            )
          })}
        </div>
      )}

      {activeTab === 'content' && hasContentTab && (
        <ContentPanel widget={widget} block={block} />
      )}

      {activeTab === 'props' && (
        <div className="mt-6 pt-4 border-t border-slate-mid">
          <p className="text-xs text-slate-light font-medium uppercase tracking-wider mb-2">Instance ID</p>
          <code className="text-xs text-slate-light font-mono break-all">{widget.instanceId}</code>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`. Add a "News - Corporate" block, click it. Verify:
- A two-tab bar "Proprietà / Contenuto" appears below the block header
- "Proprietà" shows existing toggles
- "Contenuto" shows the source selector and empty item list
- Add a "Motore di ricerca" block (no content schema) — verify NO tab bar appears

- [ ] **Step 3: Commit**

```bash
git add client/src/components/sidebar-right/PropertiesPanel.jsx
git commit -m "feat: add Contenuto tab to PropertiesPanel with ContentPanel integration"
```

---

### Task 7: Pass contentItems from CanvasBlock to CanvasBlockPreview

**Files:**
- Modify: `client/src/components/canvas/CanvasBlock.jsx`
- Modify: `client/src/components/canvas/CanvasBlockPreview.jsx`

- [ ] **Step 1: In `client/src/components/canvas/CanvasBlock.jsx`, pass `contentItems` to `CanvasBlockPreview`**

Find this line (around line 107):
```jsx
{block && <CanvasBlockPreview block={block} width={widthHint} />}
```

Replace with:
```jsx
{block && (
  <CanvasBlockPreview
    block={block}
    width={widthHint}
    contentItems={widget.props.contentItems ?? []}
  />
)}
```

- [ ] **Step 2: In `client/src/components/canvas/CanvasBlockPreview.jsx`, accept the `contentItems` prop**

Change the function signature from:
```jsx
export default function CanvasBlockPreview({ block, width = 'full' }) {
```

to:
```jsx
export default function CanvasBlockPreview({ block, width = 'full', contentItems = [] }) {
```

- [ ] **Step 3: Verify in browser**

The app should work exactly as before — no visual change yet, since content-aware rendering comes in Task 8.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/canvas/CanvasBlock.jsx client/src/components/canvas/CanvasBlockPreview.jsx
git commit -m "feat: thread contentItems from widget props into CanvasBlockPreview"
```

---

### Task 8: Content-aware rendering in CanvasBlockPreview

**Files:**
- Modify: `client/src/components/canvas/CanvasBlockPreview.jsx`

Each existing render branch gets a content-aware sub-branch at its top. When `contentItems.length > 0`, real data is rendered; otherwise the existing skeleton is shown unchanged.

- [ ] **Step 1: Replace the full content of `client/src/components/canvas/CanvasBlockPreview.jsx`**

```jsx
import * as icons from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.js'

const EVENT_IDS = new Set([
  'eventi-corporate', 'eventi-country', 'eventi-sede', 'eventi-funzione',
])

const MEDIA_IDS = new Set([
  'sezione-fiere', 'sezione-mostre', 'multimedia-gallery',
])

const PERSON_IDS = new Set(['organigramma', 'rubrica-colleghi', 'new-entry', 'oggi-presentiamo'])

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

const SEVERITY_DOT = { error: 'bg-red-500', warning: 'bg-yellow-400', info: 'bg-blue-electric' }

const GRID_COLS_BY_WIDTH   = { full: 'grid-cols-3', twoThirds: 'grid-cols-2', half: 'grid-cols-2', third: 'grid-cols-1' }
const ITEM_COUNT_BY_WIDTH  = { full: 3, twoThirds: 2, half: 2, third: 1 }

function SkeletonLine({ template, w = 'w-full', h = 'h-2', light = false }) {
  return <div className={`${w} ${h} rounded ${light ? template.card.skeletonLight : template.card.skeleton}`} />
}

function Header({ template, block, Icon, showSeeAll = true }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={16} className={`${template.card.accentText} flex-shrink-0`} />
        <span className={`text-sm font-semibold truncate ${template.card.text}`}>{block.label}</span>
      </div>
      {showSeeAll && (
        <span className={`text-xs font-medium flex-shrink-0 ${template.card.accentText}`}>See all</span>
      )}
    </div>
  )
}

export default function CanvasBlockPreview({ block, width = 'full', contentItems = [] }) {
  const { template } = useTheme()
  const Icon = icons[block.icon] ?? icons.Box
  const gridColsClass = GRID_COLS_BY_WIDTH[width] ?? GRID_COLS_BY_WIDTH.full
  const itemCount = ITEM_COUNT_BY_WIDTH[width] ?? ITEM_COUNT_BY_WIDTH.full

  // ── news ─────────────────────────────────────────────────────────────────────
  if (block.id.startsWith('news') || block.id === 'rassegna-stampa') {
    if (contentItems.length > 0) {
      return (
        <div>
          <Header template={template} block={block} Icon={Icon} />
          <div className="space-y-2.5">
            {contentItems.slice(0, itemCount).map((item, i) => (
              <div key={i} className="space-y-1">
                <p className={`text-xs font-semibold leading-snug ${template.card.text} line-clamp-2`}>
                  {item.title}
                </p>
                <p className={`text-[10px] ${template.card.textMuted}`}>
                  {[item.date && new Date(item.date).toLocaleDateString('it-IT'), item.author || item.source, item.category]
                    .filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )
    }
    return (
      <div>
        <Header template={template} block={block} Icon={Icon} />
        <div className={`grid ${gridColsClass} gap-3`}>
          {Array.from({ length: itemCount }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className={`aspect-[16/10] rounded-md ${template.card.skeletonLight}`} />
              <SkeletonLine template={template} h="h-2.5" />
              <SkeletonLine template={template} w="w-2/3" light />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── eventi ────────────────────────────────────────────────────────────────────
  if (EVENT_IDS.has(block.id)) {
    const today = new Date()
    if (contentItems.length > 0) {
      return (
        <div>
          <Header template={template} block={block} Icon={Icon} />
          <div className="space-y-3">
            {contentItems.slice(0, 2).map((item, i) => {
              const d = item.date ? new Date(item.date) : null
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`flex flex-col items-center justify-center w-11 h-11 rounded-md flex-shrink-0 ${template.card.chip}`}>
                    {d ? (
                      <>
                        <span className={`text-[10px] font-semibold uppercase leading-none ${template.card.accentText}`}>
                          {MONTHS[d.getMonth()]}
                        </span>
                        <span className={`text-sm font-bold leading-none mt-0.5 ${template.card.text}`}>{d.getDate()}</span>
                      </>
                    ) : (
                      <span className={`text-[10px] ${template.card.textMuted}`}>—</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${template.card.text}`}>{item.title}</p>
                    {item.location && (
                      <p className={`text-[10px] ${template.card.textMuted} truncate`}>{item.location}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
    return (
      <div>
        <Header template={template} block={block} Icon={Icon} />
        <div className="space-y-3">
          {[3, 9].map((offset, i) => {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`flex flex-col items-center justify-center w-11 h-11 rounded-md flex-shrink-0 ${template.card.chip}`}>
                  <span className={`text-[10px] font-semibold uppercase leading-none ${template.card.accentText}`}>
                    {MONTHS[d.getMonth()]}
                  </span>
                  <span className={`text-sm font-bold leading-none mt-0.5 ${template.card.text}`}>{d.getDate()}</span>
                </div>
                <div className="flex-1 space-y-1.5">
                  <SkeletonLine template={template} w="w-3/4" h="h-2.5" />
                  <SkeletonLine template={template} w="w-1/2" light />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── avvisi-homepage ────────────────────────────────────────────────────────────
  if (block.id === 'avvisi-homepage') {
    if (contentItems.length > 0) {
      return (
        <div>
          <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
          <div className="space-y-2">
            {contentItems.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${SEVERITY_DOT[item.severity] ?? SEVERITY_DOT.info}`} />
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${template.card.text}`}>{item.title}</p>
                  {item.body && (
                    <p className={`text-[10px] ${template.card.textMuted} truncate`}>{item.body}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
    // skeleton fallback — avvisi falls through to generic
  }

  // ── media / fiere / mostre ─────────────────────────────────────────────────────
  if (MEDIA_IDS.has(block.id)) {
    if (contentItems.length > 0) {
      return (
        <div>
          <Header template={template} block={block} Icon={Icon} />
          <div className={`grid ${gridColsClass} gap-2`}>
            {contentItems.slice(0, itemCount).map((item, i) =>
              item.imageUrl ? (
                <img
                  key={i}
                  src={item.imageUrl}
                  alt={item.caption || item.title || ''}
                  className="aspect-square rounded-md object-cover w-full"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <div key={i} className={`aspect-square rounded-md ${template.card.skeletonLight}`} />
              )
            )}
          </div>
        </div>
      )
    }
    return (
      <div>
        <Header template={template} block={block} Icon={Icon} />
        <div className={`grid ${gridColsClass} gap-2`}>
          {Array.from({ length: itemCount }).map((_, i) => (
            <div key={i} className={`aspect-square rounded-md ${template.card.skeletonLight}`} />
          ))}
        </div>
      </div>
    )
  }

  // ── countdown-lancio ───────────────────────────────────────────────────────────
  if (block.id === 'countdown-lancio') {
    const targetItem = contentItems[0]
    if (targetItem?.targetDate) {
      const msLeft = new Date(targetItem.targetDate) - new Date()
      const days = Math.max(0, Math.floor(msLeft / 86400000))
      return (
        <div>
          <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
          {targetItem.title && (
            <p className={`text-center text-xs ${template.card.textMuted} mb-2 truncate`}>{targetItem.title}</p>
          )}
          <div className="flex justify-center">
            <div className={`flex items-baseline gap-1 px-4 py-2 rounded-md ${template.card.iconBg}`}>
              <span className="text-xl font-bold text-white">{days}</span>
              <span className="text-xs text-white/70">giorni</span>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div>
        <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
        <div className="flex justify-center gap-2">
          {['12', '08', '45', '30'].map((n, i) => (
            <div key={i} className={`flex items-center justify-center w-12 h-12 rounded-md ${template.card.iconBg}`}>
              <span className="text-base font-bold text-white">{n}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── faq / come-fare-per ────────────────────────────────────────────────────────
  if (block.id === 'faq' || block.id === 'come-fare-per') {
    if (contentItems.length > 0) {
      return (
        <div>
          <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
          <div className="space-y-1.5">
            {contentItems.slice(0, 3).map((item, i) => (
              <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded ${template.card.chip}`}>
                <icons.ChevronRight size={11} className={`${template.card.accentText} flex-shrink-0`} />
                <span className={`text-xs truncate ${template.card.text}`}>{item.question || item.title}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  // ── organigramma / rubrica / new-entry / oggi-presentiamo ─────────────────────
  if (PERSON_IDS.has(block.id)) {
    if (contentItems.length > 0) {
      return (
        <div>
          <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
          <div className="space-y-2">
            {contentItems.slice(0, 2).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${template.card.iconBg}`}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                  ) : (
                    <span className="text-xs font-bold text-white">
                      {(item.name || item.title || '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${template.card.text}`}>{item.name || item.title}</p>
                  {(item.role || item.department) && (
                    <p className={`text-[10px] ${template.card.textMuted} truncate`}>{item.role || item.department}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  // ── generic fallback (skeleton) ────────────────────────────────────────────────
  return (
    <div>
      <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
      {contentItems.length > 0 ? (
        <div className="space-y-2">
          {contentItems.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <icons.ChevronRight size={12} className={`${template.card.textMuted} flex-shrink-0`} />
              <span className={`text-xs truncate ${template.card.text}`}>
                {item.title || item.name || item.question || Object.values(item).find(v => typeof v === 'string') || '—'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <icons.ChevronRight size={12} className={`${template.card.textMuted} flex-shrink-0`} />
            <SkeletonLine template={template} w="w-5/6" />
          </div>
          <div className="flex items-center gap-2">
            <icons.ChevronRight size={12} className={`${template.card.textMuted} flex-shrink-0`} />
            <SkeletonLine template={template} w="w-2/3" />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`. Test these scenarios:

1. Add "News - Corporate" → click it → tab "Contenuto" → click "Aggiungi" → fill title "Lancio piano welfare" + date → Salva. Canvas should now show the title text instead of skeleton image placeholders.

2. Add "Avvisi in home page" → Contenuto → Aggiungi → title "Manutenzione server" + severity "error" → Salva. Canvas shows red dot + title.

3. Add "Count down di lancio" → Contenuto → Aggiungi → title "Lancio prodotto" + targetDate (a future date) → Salva. Canvas shows "X giorni" countdown.

4. Block with no contentItems still shows skeletons (add "Procedure" and don't add items).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/canvas/CanvasBlockPreview.jsx
git commit -m "feat: content-aware rendering in CanvasBlockPreview when contentItems are present"
```

---

### Task 9: Smoke tests

**Files:**
- Modify: `client/tests/smoke.spec.js`

- [ ] **Step 1: Add 3 new tests to `client/tests/smoke.spec.js`** before the closing `})`

```js
  test('Contenuto tab appears for content-enabled blocks and is absent for widget-only blocks', async ({ page }) => {
    // News block has content schema → tab appears
    await page.getByText('News - Corporate', { exact: true }).click()
    const canvasBlock = page.locator('main').getByText('News - Corporate', { exact: true })
    await canvasBlock.click()

    const sidebar = page.locator('aside.border-l')
    await expect(sidebar.getByRole('button', { name: 'Contenuto', exact: true })).toBeVisible()
    await expect(sidebar.getByRole('button', { name: 'Proprietà', exact: true })).toBeVisible()
  })

  test('switching to source type "Manuale" shows production badge and hides URL field', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    await page.locator('main').getByText('News - Corporate', { exact: true }).click()

    const sidebar = page.locator('aside.border-l')
    await sidebar.getByRole('button', { name: 'Contenuto', exact: true }).click()

    // Switch to Manuale
    await sidebar.getByRole('button', { name: 'Manuale', exact: true }).click()

    // URL field gone, production badge + info banner visible
    await expect(sidebar.locator('input[type="url"]')).not.toBeVisible()
    await expect(sidebar.getByText('PRODUZIONE')).toBeVisible()
  })

  test('adding a content item replaces the skeleton in the canvas preview', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    const canvasBlock = page.locator('main').getByText('News - Corporate', { exact: true })
    await canvasBlock.click()

    const sidebar = page.locator('aside.border-l')
    await sidebar.getByRole('button', { name: 'Contenuto', exact: true }).click()

    // Add item
    await sidebar.getByRole('button', { name: '+ Aggiungi', exact: true }).click()
    await sidebar.locator('input[type="text"]').first().fill('Lancio piano welfare 2026')
    await sidebar.locator('input[type="date"]').first().fill('2026-06-20')
    await sidebar.getByRole('button', { name: 'Salva', exact: true }).click()

    // Canvas should now show the item title
    await expect(page.locator('main').getByText('Lancio piano welfare 2026')).toBeVisible()
  })
```

- [ ] **Step 2: Run tests**

```bash
cd shareflow-app && npm run test:e2e
```

Expected: all 15 tests pass (12 existing + 3 new).

If tests fail, check:
- The `aside.border-l` selector targets the right sidebar — verify in browser that the right sidebar has that class
- The `input[type="text"]` in the form — if there are multiple text inputs visible, use `.nth(0)` or a more specific locator
- The canvas item text — it must be the first child of the `<p>` in the content-aware news branch

- [ ] **Step 3: Commit**

```bash
git add client/tests/smoke.spec.js
git commit -m "test: add smoke tests for block content population feature"
```
