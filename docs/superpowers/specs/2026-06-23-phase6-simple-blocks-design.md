# Phase 6, sub-project 1 — simple new content blocks — design spec

**Date:** 2026-06-23
**Scope:** 9 new catalog blocks + wiring 3 of them into the existing Employee Hub page template (not a new functional phase, not an architectural change)

## Goal

Close 9 of the 17 feature gaps found when comparing ShareFlow's block catalog against Origami Connect's intranet feature list (full comparison done in a prior session turn). These 9 are the gaps that fit ShareFlow's existing catalog+content-schema pattern exactly — no new rendering logic, no section/layout model change, no server changes. The remaining 8 gaps (rich-rendering blocks, Tab/Accordion layout, Mandatory Read compliance, KPI/Analytics) are explicitly out of scope, tracked as separate future sub-projects of the broader "Phase 6" initiative.

## Section 1 — List-content blocks

Six blocks following the exact pattern of `genericListSchema`/`rassegna-stampa`-style entries already in `blockContentSchemas.js`:

| Origami feature | `id` | `category` | `icon` | `sourceTypes` |
|---|---|---|---|---|
| Contact Cards | `contatti-chiave` | `KNOWLEDGE_BASE` | `IdCard` | `['sharepoint-list', 'manual']` |
| Kudos | `kudos` | `LEARNING` | `Award` | `['manual']` |
| Anniversaries | `anniversari` | `LEARNING` | `PartyPopper` | `['manual']` |
| Quick Links Plus | `collegamenti-rapidi` | `PRODUCTIVITY` | `Link2` | `['manual']` |
| Feedback to List | `feedback-utenti` | `LEARNING` | `MessageCircleQuestion` | `['manual']` |
| LinkedIn Feed | `linkedin-feed` | `COMMUNICATION` | `Rss` | `['rss', 'manual']` |

`client/src/data/blockContentSchemas.js` — new entries in `BLOCK_CONTENT_DEFS`:

```js
'contatti-chiave': { sourceTypes: ['sharepoint-list', 'manual'], schema: [
  { key: 'name',       label: 'Nome',     type: 'text', required: true  },
  { key: 'role',       label: 'Ruolo',    type: 'text', required: false },
  { key: 'department', label: 'Reparto',  type: 'text', required: false },
  { key: 'email',      label: 'Email',    type: 'text', required: false },
  { key: 'phone',      label: 'Telefono', type: 'text', required: false },
  { key: 'imageUrl',   label: 'Foto',     type: 'url',  required: false },
]},
'kudos': { sourceTypes: ['manual'], schema: [
  { key: 'from',    label: 'Da',        type: 'text',     required: true  },
  { key: 'to',      label: 'A',         type: 'text',     required: true  },
  { key: 'message', label: 'Messaggio', type: 'textarea', required: true  },
  { key: 'date',    label: 'Data',      type: 'date',     required: false },
]},
'anniversari': { sourceTypes: ['manual'], schema: [
  { key: 'name',       label: 'Nome',      type: 'text',   required: true  },
  { key: 'type',       label: 'Tipo',      type: 'select', required: true,
    options: ['anniversario', 'compleanno'] },
  { key: 'date',       label: 'Data',      type: 'date',   required: true  },
  { key: 'department', label: 'Reparto',   type: 'text',   required: false },
  { key: 'imageUrl',   label: 'Foto',      type: 'url',    required: false },
]},
'collegamenti-rapidi': { sourceTypes: ['manual'], schema: [
  { key: 'title',       label: 'Titolo',      type: 'text', required: true  },
  { key: 'url',         label: 'Link',        type: 'url',  required: true  },
  { key: 'description', label: 'Descrizione', type: 'text', required: false },
]},
'feedback-utenti': { sourceTypes: ['manual'], schema: [
  { key: 'question', label: 'Domanda',              type: 'text',     required: true  },
  { key: 'response', label: 'Risposta di esempio',  type: 'textarea', required: false },
  { key: 'date',     label: 'Data',                 type: 'date',     required: false },
]},
'linkedin-feed': { sourceTypes: ['rss', 'manual'], schema: [
  { key: 'author',   label: 'Autore',    type: 'text',     required: false },
  { key: 'title',    label: 'Titolo',    type: 'text',     required: true  },
  { key: 'excerpt',  label: 'Estratto',  type: 'textarea', required: false },
  { key: 'url',      label: 'Link',      type: 'url',      required: false },
  { key: 'imageUrl', label: 'Immagine',  type: 'url',      required: false },
  { key: 'date',     label: 'Data',      type: 'date',     required: false },
]},
```

All six use the standard non-scoped `defaultProps`/`configurableProps` shape already used by `procedure`/`sezione-welfare`/`documenti`:

```js
defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible']
```

## Section 2 — Single-item content blocks

Three blocks following the single-item `manual`-only pattern already used by `countdown-lancio` (one configured item, not a list):

| Origami feature | `id` | `category` | `icon` |
|---|---|---|---|
| Button Link Plus | `pulsante-cta` | `PRODUCTIVITY` | `MousePointerClick` |
| Heading | `titolo-libero` | `PRODUCTIVITY` | `Heading` |
| Embed Plus | `embed-custom` | `PRODUCTIVITY` | `Code2` |

```js
'pulsante-cta': { sourceTypes: ['manual'], schema: [
  { key: 'label', label: 'Testo pulsante', type: 'text',   required: true  },
  { key: 'url',   label: 'Link',           type: 'url',    required: true  },
  { key: 'style', label: 'Stile',          type: 'select', required: false,
    options: ['primary', 'secondary'] },
]},
'titolo-libero': { sourceTypes: ['manual'], schema: [
  { key: 'text',     label: 'Testo',       type: 'text', required: true  },
  { key: 'subtitle', label: 'Sottotitolo', type: 'text', required: false },
]},
'embed-custom': { sourceTypes: ['manual'], schema: [
  { key: 'embedUrl', label: 'URL embed',     type: 'url',  required: true  },
  { key: 'height',   label: 'Altezza (px)',  type: 'text', required: false },
]},
```

Same `defaultProps`/`configurableProps` shape as Section 1. For `embed-custom`: as with the `documenti` block (prior phase), ShareFlow only configures the sample URL/height — actual iframe/script rendering happens on the deployed SharePoint site, not in the editor's own canvas. No new `CanvasBlockPreview.jsx` logic for any of these 9 blocks — all render through the existing generic fallback path.

## Section 3 — Catalog, i18n

`client/src/data/blockCatalog.js` — nine new entries in `_rawCatalog`, inserted into their respective category groups (alongside existing peers of the same category):

```js
{ id: 'contatti-chiave',      label: 'Contatti Chiave',      category: CATEGORIES.KNOWLEDGE_BASE, icon: 'IdCard',               defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
{ id: 'kudos',                label: 'Kudos',                category: CATEGORIES.LEARNING,        icon: 'Award',                defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
{ id: 'anniversari',          label: 'Anniversari',          category: CATEGORIES.LEARNING,        icon: 'PartyPopper',          defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
{ id: 'collegamenti-rapidi',  label: 'Collegamenti Rapidi',  category: CATEGORIES.PRODUCTIVITY,    icon: 'Link2',                defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
{ id: 'feedback-utenti',      label: 'Feedback Utenti',      category: CATEGORIES.LEARNING,        icon: 'MessageCircleQuestion',defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
{ id: 'linkedin-feed',        label: 'Feed LinkedIn',        category: CATEGORIES.COMMUNICATION,   icon: 'Rss',                    defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
{ id: 'pulsante-cta',         label: 'Pulsante CTA',         category: CATEGORIES.PRODUCTIVITY,    icon: 'MousePointerClick',    defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
{ id: 'titolo-libero',        label: 'Titolo Libero',        category: CATEGORIES.PRODUCTIVITY,    icon: 'Heading',              defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
{ id: 'embed-custom',         label: 'Embed Personalizzato', category: CATEGORIES.PRODUCTIVITY,    icon: 'Code2',                defaultProps: { scope: null, visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
```

`blocks.labels.*` — nine new keys in all four locale files:

| `id` | IT | EN | FR | DE |
|---|---|---|---|---|
| `contatti-chiave` | Contatti Chiave | Key Contacts | Contacts Clés | Wichtige Kontakte |
| `kudos` | Kudos | Kudos | Kudos | Kudos |
| `anniversari` | Anniversari | Anniversaries | Anniversaires | Jubiläen |
| `collegamenti-rapidi` | Collegamenti Rapidi | Quick Links | Liens Rapides | Schnellzugriffe |
| `feedback-utenti` | Feedback Utenti | User Feedback | Retours Utilisateurs | Nutzer-Feedback |
| `linkedin-feed` | Feed LinkedIn | LinkedIn Feed | Fil LinkedIn | LinkedIn-Feed |
| `pulsante-cta` | Pulsante CTA | CTA Button | Bouton CTA | CTA-Button |
| `titolo-libero` | Titolo Libero | Free Heading | Titre Libre | Freier Titel |
| `embed-custom` | Embed Personalizzato | Custom Embed | Intégration personnalisée | Benutzerdefiniertes Embed |

## Section 4 — Employee Hub wiring

`client/src/data/pageTemplates.js` — two new sections appended to `employee-hub`'s `sections` array (existing sections unchanged/unreordered, same approach as the `documenti` block's wiring into `hr-portal`/`onboarding` in the prior phase):

```js
// employee-hub — sections becomes:
sections: [
  { layout: 'twoColumn', blocks: [['motore-ricerca'], ['rubrica-colleghi']] },
  { layout: 'oneColumn', blocks: [['polls-survey']] },
  { layout: 'oneColumn', blocks: [['bacheca-scambio']] },
  { layout: 'twoColumn', blocks: [['kudos'], ['anniversari']] },
  { layout: 'oneColumn', blocks: [['contatti-chiave']] },
],
```

No change to `siteTemplates.js`: the site bundle referencing `employee-hub` by `pageTemplateId` inherits the new sections automatically (same reuse-by-reference mechanism as Phase 5b).

## Section 5 — Testing

Following the established convention for this catalog (none of the original 32 blocks have a dedicated unit test — catalog correctness is verified via e2e visibility, not isolated unit assertions):

**One e2e test** (Playwright, `client/tests/smoke.spec.js`): opens the Blocchi library and asserts all 9 new block labels are visible — catches any catalog/schema/locale wiring mistake across all 9 in a single check.

**One e2e test**: applies the "Employee Hub" page template and confirms "Kudos", "Anniversari", and "Contatti Chiave" are visible in the canvas — same pattern as the `documenti`/Portale HR check in the prior phase.

## Out of scope

- Any block requiring new `CanvasBlockPreview.jsx` rendering logic (calendar, carousel, timeline) — separate future sub-project.
- Tab/Accordion section layouts, Mandatory Read compliance, KPI/PowerBI/Analytics, AI-search, wiki-style end-user sidebar nav — separate future sub-projects per the Phase 6 decomposition.
- Wiring any of these 9 blocks into page templates other than `employee-hub` (e.g. adding Quick Links to other templates) — not requested, can be a follow-up.
- Real external integrations (an actual LinkedIn API feed, a real embed sandbox) — every block uses sample/manual data exactly like the rest of the catalog; live data sourcing is a deploy-time SharePoint concern, not ShareFlow's.
