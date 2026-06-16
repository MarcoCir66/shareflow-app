# Block Content Population — Design Spec

## Goal

Allow each block instance to declare its content source (SharePoint list, RSS feed, HTTP API, or manual) and manage content items with a per-block-type schema. Manual items serve as production content; items on external-source blocks serve as realistic sample data for the editor preview.

## Architecture

Approach: **in-props, schema-driven**. All content data lives inside the existing `props` object of each block instance. Block type definitions in `blockCatalog.js` gain a `contentSchema` (field definitions) and `contentSourceTypes` (allowed source types). No new reducer or store is introduced — the existing `SET_TENANT_META` / block update path serializes everything automatically at export time.

Tech stack: React 19, Vite, Tailwind CSS 3.4 (JIT), existing `configuratorReducer` + `ConfiguratorContext`.

---

## Section 1 — Data Shape

### `blockCatalog.js` additions per block type

```js
{
  id: 'news-corporate',
  // ... existing fields ...
  contentSourceTypes: ['sharepoint-list', 'rss', 'manual'], // null = no content tab
  contentSchema: [
    { key: 'title',    label: 'Titolo',    type: 'text',     required: true  },
    { key: 'body',     label: 'Testo',     type: 'textarea', required: false },
    { key: 'date',     label: 'Data',      type: 'date',     required: true  },
    { key: 'author',   label: 'Autore',    type: 'text',     required: false },
    { key: 'category', label: 'Categoria', type: 'text',     required: false },
    { key: 'url',      label: 'Link',      type: 'url',      required: false },
    { key: 'imageUrl', label: 'Immagine',  type: 'url',      required: false },
  ]
}
```

`contentSourceTypes: null` means the block has no content management (widget UI blocks like `multilingua`, `fusi-orari`, `motore-ricerca`, `commenti-contenuto`, `like-contenuto`). These blocks do not show the "Contenuto" tab.

### Field types supported in `contentSchema`

| type | Input rendered |
|---|---|
| `text` | `<input type="text">` |
| `textarea` | `<textarea>` |
| `date` | `<input type="date">` |
| `url` | `<input type="url">` |
| `select` | `<select>` with `options: string[]` |
| `array` | Comma-separated text (for `polls-survey` options) |

### Block instance `props` additions

```js
{
  // existing props
  scope: 'corporate',
  visible: true,
  commentsEnabled: false,
  likesEnabled: false,
  // NEW
  contentSource: {
    type: 'sharepoint-list',  // 'sharepoint-list' | 'rss' | 'http-api' | 'manual'
    url: '',                  // SP list URL, RSS URL, or HTTP endpoint
    params: {}                // e.g. { apiKey: '', headers: {} } for http-api
  },
  contentItems: []            // array of objects conforming to contentSchema
}
```

### Semantics of `contentItems` by source type

| `contentSource.type` | Meaning of `contentItems` |
|---|---|
| `sharepoint-list` / `rss` / `http-api` | Sample data for editor preview only — not published |
| `manual` | Production content — included in export and published |

---

## Section 2 — Block Schemas

### Communication

| Block | Allowed sources | Schema fields |
|---|---|---|
| `news-*` (corporate/country/sede/funzione) | SP / RSS / manual | title, date, author, category, body, url, imageUrl |
| `eventi-*` (corporate/country/sede/funzione) | SP / RSS / manual | title, date, endDate, location, description, url, imageUrl |
| `avvisi-homepage` | SP / manual | title, body, severity (select: info/warning/error), date, url |
| `countdown-lancio` | manual | title, targetDate (date), description |
| `multimedia-gallery` | SP / HTTP API / manual | title, imageUrl, caption, date |
| `rassegna-stampa` | RSS / SP / manual | title, source, date, url, excerpt |
| `bacheca-sindacale` | SP / manual | title, body, date, category, url |
| `bacheca-scambio` | SP / manual | title, body, date, category, contact |
| `sezione-fiere` | SP / manual | title, date, location, description, url, imageUrl |
| `sezione-mostre` | SP / manual | title, date, location, description, url, imageUrl |
| `commenti-contenuto` | *(none — widget UI)* | — |
| `like-contenuto` | *(none — widget UI)* | — |

### Learning

| Block | Allowed sources | Schema fields |
|---|---|---|
| `new-entry` | SP / manual | name, department, date, body, imageUrl |
| `oggi-presentiamo` | SP / manual | title, body, imageUrl, date |
| `polls-survey` | SP / manual | question, options (array), date |
| `sezione-welfare` | SP / manual | title, body, category, url, imageUrl |

### Productivity

| Block | Allowed sources | Schema fields |
|---|---|---|
| `procedure` | SP / manual | title, body, category, url, date |
| `sezione-progetti` | SP / manual | title, description, status (select: active/completed/on-hold), owner, date |
| `meteo` | HTTP API / manual | city, temperature (text), condition (text), icon (text) |
| `fusi-orari` | *(none — config driven)* | — |
| `multilingua` | *(none — widget UI)* | — |

### Knowledge Base

| Block | Allowed sources | Schema fields |
|---|---|---|
| `faq` | SP / manual | question, answer, category |
| `come-fare-per` | SP / manual | title, steps (textarea), category, url |
| `organigramma` | SP / HTTP API | name, role, department, email, imageUrl, parentId |
| `rubrica-colleghi` | SP / HTTP API | name, role, department, email, phone, imageUrl |
| `chi-siamo` | manual | title, body, imageUrl |
| `desc-country` / `desc-sede` / `desc-funzione` | manual | title, body, imageUrl, location |
| `motore-ricerca` | *(none — widget UI)* | — |

---

## Section 3 — UI

### PropertiesPanel — "Contenuto" tab

A third tab "Contenuto" is added to the PropertiesPanel (right sidebar), alongside existing "Proprietà" and "Stile" tabs. The tab is only rendered if the selected block's catalog entry has `contentSourceTypes !== null`.

**Tab layout:**

```
┌─ Fonte dati ──────────────────────────────────┐
│ [SharePoint] [RSS] [HTTP API] [Manuale]        │  ← segmented control
│ URL: [_________________________________________]│  ← single URL field for all external types
└───────────────────────────────────────────────┘

┌─ Dati campione (anteprima) ─────────── [+ Aggiungi] ┐
│ ┌─ Item 1 ───────────────────────── [✎] [✕] ─┐     │
│ │ Lancio del nuovo piano welfare 2026         │     │
│ │ HR · 10 giu 2026 · Mario Rossi             │     │
│ └─────────────────────────────────────────────┘     │
│ + Aggiungi news campione (dashed placeholder)       │
└─────────────────────────────────────────────────────┘
```

When `contentSource.type === 'manual'`:
- Section header changes to "Contenuto" with a "PRODUZIONE" green badge
- An info banner explains: "In modalità manuale il contenuto inserito qui è quello pubblicato in produzione"
- URL field and column mapping are hidden

### Item editor (inline form)

Clicking ✎ on an item, or "+ Aggiungi", expands an inline form built from `contentSchema`. Each field renders its corresponding input type. Required fields show a red asterisk. Saving with empty required fields shows a field-level error. The form collapses on save/cancel.

### ContentSource type selector labels

| Internal value | Label shown |
|---|---|
| `sharepoint-list` | SharePoint |
| `rss` | RSS |
| `http-api` | HTTP API |
| `manual` | Manuale |

Only the types listed in `contentSourceTypes` for that block are shown in the selector. If only one type is allowed (e.g., `countdown-lancio` only allows `manual`), the selector is hidden and the type is fixed.

---

## Section 4 — Canvas Preview Integration

`CanvasBlockPreview.jsx` gains a content-aware rendering branch:

```
if (block.props.contentItems?.length > 0)
  → render with real item data
else
  → render skeleton (existing behavior, unchanged)
```

**Per render type:**

- **News / eventi / liste**: first 2-3 items as cards: `[icon] [title] / [date · author · category]`
- **Avvisi**: colored dot + title + body (dot color: red=error, yellow=warning, blue=info)
- **Countdown**: static computed timer: `"X giorni a [title]"` from `targetDate`
- **Gallery**: thumbnail grid from `imageUrl` + caption
- **FAQ / Come fare per**: collapsed accordion rows with question + truncated answer
- **Organigramma / Rubrica**: avatar circle + name + role row

Existing theme tokens (`template.card.*`, `--theme-accent`, etc.) continue to apply to all rendered content.

---

## Section 5 — Export / Deploy Flow

No changes to the export pipeline. `buildTenantExport()` already serializes `props` for every widget. With the new fields added to `defaultProps`, `contentSource` and `contentItems` travel in the existing export JSON automatically.

**Backend behavior:**
- Receives `contentSource.type + url + params` → configures the webpart to read from the real source at publish time
- If `contentSource.type === 'manual'` → uses `contentItems` directly as published content
- `contentItems` on external-source blocks → ignored by backend (preview-only sample data)

No server-side changes required for this feature.

---

## Out of Scope

- Live data fetching from external sources inside the editor (no API calls in client)
- Authentication management for SharePoint / HTTP API sources (handled by backend at deploy)
- SharePoint column mapping UI (backend maps SP columns to schema fields using field `key` names by convention)
- `params` UI for HTTP API (field exists in data shape for future use; v1 exposes URL only)
- Image upload (imageUrl fields accept a URL string only)
- Rich text / WYSIWYG editor (textarea only in v1)
- Drag-to-reorder items (items reorder via delete + re-add in v1)
