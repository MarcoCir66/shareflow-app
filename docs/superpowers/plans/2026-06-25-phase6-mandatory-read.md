# Phase 6, Sub-Project 5 — Mandatory Read / Compliance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an author mark any block as "lettura obbligatoria" (mandatory read); show a mock acknowledgment banner for it in Anteprima; add a 4th "Compliance" tab to the existing Analytics view that lists every block actually marked across the real configurator state, with a mocked-but-deterministic completion percentage.

**Architecture:** Entirely mock and editor-only, like the rest of ShareFlow — no SPFx/webhook integration, no server changes, no real per-user persistence. The only real data is which blocks the author marked (read from live configurator state via a new pure helper); the completion percentage is a deterministic hash, not a real measurement.

**Tech Stack:** React 19, Vite, react-i18next, Recharts (already a dependency since sub-project 4), Vitest, Playwright + @axe-core/playwright.

## Global Constraints

- No new dependencies. No server-side changes. No new persistence (no localStorage, no IndexedDB) — every mock value resets on reload.
- `mandatoryRead` defaults to `false` and is added to **every** block in `blockCatalog.js` (49 entries today), not a curated subset.
- The Compliance tab reads real `state.pages` via `useConfigurator()` — it must never show fixture data unrelated to what the author actually configured.
- No fake "site" or "audience" breakdown anywhere in this feature — the only real dimension is page title.
- Every new i18n key is added to all 4 locale files (`it.json`, `en.json`, `fr.json`, `de.json`) in the same commit that introduces it. A key missing from even one file is a real bug (it happened once already in sub-project 4 — `navbar.analytics`).
- All new pure logic gets a Vitest test; no DOM rendering is unit-tested in this codebase (Vitest runs in plain Node) — UI/interaction is Playwright e2e only.

---

## Task 1: Data model — `mandatoryRead` prop and `collectMandatoryBlocks` helper

**Files:**
- Modify: `client/src/data/blockCatalog.js` (lines 32–86, the `_rawCatalog` array)
- Create: `client/src/data/blockCatalog.test.js`
- Modify: `client/src/context/sectionHelpers.js`
- Modify: `client/src/context/sectionHelpers.test.js`
- Modify: `client/src/locales/it.json`, `en.json`, `fr.json`, `de.json` (the `props` namespace)
- Modify: `client/tests/smoke.spec.js`

**Interfaces:**
- Produces: `mandatoryRead: false` in every block's `defaultProps`, `'mandatoryRead'` in every block's `configurableProps` — consumed automatically by the existing properties panel (no panel code changes needed, see below) and by Task 2's banner.
- Produces: `collectMandatoryBlocks(pages, lang)` in `sectionHelpers.js`, returning `Array<{instanceId: string, blockId: string, pageId: string, pageTitle: string}>` — consumed by Task 3's `AnalyticsCompliance.jsx`.

### Why no Properties Panel code change is needed

`PropertiesPanel.jsx` already renders a generic `ToggleField` for every entry in `block.configurableProps` that isn't `'scope'` (see `client/src/components/sidebar-right/PropertiesPanel.jsx:100-118`):

```jsx
{block.configurableProps.map(key => {
  if (key === 'scope') { /* ScopeSelector */ }
  return (
    <ToggleField
      key={key}
      label={t(`props.${key}`, { defaultValue: key })}
      value={widget.props[key]}
      onChange={v => updateProp(key, v)}
    />
  )
})}
```

Adding `'mandatoryRead'` to `configurableProps` makes this toggle appear automatically, labeled via the new `props.mandatoryRead` i18n key (Step 4 below). No changes to `PropertiesPanel.jsx` or `ToggleField.jsx` are needed.

- [ ] **Step 1: Replace `blockCatalog.js`'s `_rawCatalog` array with the `mandatoryRead`-augmented version**

Replace lines 32–86 of `client/src/data/blockCatalog.js` (the `_rawCatalog` array, from `/** @type ... */` through the closing `]`) with:

```js
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
```

This content was generated by a verified scratch transform (every one of the 49 original entries gained exactly `, mandatoryRead: false` before its `defaultProps`' closing `}` and `, 'mandatoryRead'` before its `configurableProps`' closing `]`, with no other characters changed) and double-checked by diffing against the original file. Do not hand-edit further — paste this block verbatim.

- [ ] **Step 2: Write the catalog-completeness test**

Create `client/src/data/blockCatalog.test.js`:

```js
import { test, expect } from 'vitest'
import { blockCatalog } from './blockCatalog.js'

test('every block in the catalog supports mandatoryRead, defaulting to false', () => {
  expect(blockCatalog.length).toBeGreaterThan(0)
  for (const block of blockCatalog) {
    expect(block.defaultProps).toHaveProperty('mandatoryRead', false)
    expect(block.configurableProps).toContain('mandatoryRead')
  }
})
```

- [ ] **Step 3: Run the test to verify it passes**

Run: `cd client && npx vitest run src/data/blockCatalog.test.js`
Expected: PASS (1 test). If it fails, re-check Step 1's pasted block for a typo in one entry — every block must have both additions.

- [ ] **Step 4: Add the `props.mandatoryRead` i18n key to all 4 locale files**

In `client/src/locales/it.json`, inside the `"props"` object, after the `"likesEnabled": "Like abilitati",` line, add:
```json
    "mandatoryRead": "Lettura obbligatoria",
```

In `client/src/locales/en.json`, inside `"props"`, after `"likesEnabled": "Likes enabled",`:
```json
    "mandatoryRead": "Mandatory read",
```

In `client/src/locales/fr.json`, inside `"props"`, after `"likesEnabled": "J'aime activés",`:
```json
    "mandatoryRead": "Lecture obligatoire",
```

In `client/src/locales/de.json`, inside `"props"`, after `"likesEnabled": "Likes aktiviert",`:
```json
    "mandatoryRead": "Pflichtlektüre",
```

After editing, verify each file is still valid JSON:

Run: `cd client && node -e "JSON.parse(require('fs').readFileSync('src/locales/it.json'))" && node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json'))" && node -e "JSON.parse(require('fs').readFileSync('src/locales/fr.json'))" && node -e "JSON.parse(require('fs').readFileSync('src/locales/de.json'))"`
Expected: no output, exit code 0 (each `JSON.parse` throws on invalid JSON, which would print a SyntaxError and a non-zero exit).

- [ ] **Step 5: Add `collectMandatoryBlocks` to `sectionHelpers.js`**

In `client/src/context/sectionHelpers.js`, add the import at the top (after the existing file-level comment, before the first `export function`):

```js
import { t2 } from '../utils/localizedText.js'
```

Then append at the end of the file (after `flattenWidgets`):

```js

/**
 * Returns {instanceId, blockId, pageId, pageTitle} for every widget across
 * every page (not just the active one) whose props.mandatoryRead is true.
 */
export function collectMandatoryBlocks(pages, lang) {
  const result = []
  for (const page of pages) {
    for (const section of page.sections) {
      for (const column of section.columns) {
        for (const widget of column.widgets) {
          if (widget.props.mandatoryRead === true) {
            result.push({
              instanceId: widget.instanceId,
              blockId: widget.blockId,
              pageId: page.pageId,
              pageTitle: t2(page.title, lang),
            })
          }
        }
      }
    }
  }
  return result
}
```

- [ ] **Step 6: Write the failing tests for `collectMandatoryBlocks`**

Append to `client/src/context/sectionHelpers.test.js`:

```js
import { collectMandatoryBlocks } from './sectionHelpers.js'

function makePage(overrides = {}) {
  return {
    pageId: 'page-home',
    title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' },
    slug: 'home',
    parentId: null,
    sections: [],
    ...overrides,
  }
}

test('collectMandatoryBlocks returns an empty array when no widget is marked', () => {
  const pages = [makePage({
    sections: [{ sectionId: 's1', layout: 'oneColumn', columns: [
      { columnId: 'c1', widgets: [{ instanceId: 'w1', blockId: 'faq', props: { mandatoryRead: false } }] },
    ] }],
  })]
  expect(collectMandatoryBlocks(pages, 'it')).toEqual([])
})

test('collectMandatoryBlocks finds a marked widget in a grid section column', () => {
  const pages = [makePage({
    sections: [{ sectionId: 's1', layout: 'oneColumn', columns: [
      { columnId: 'c1', widgets: [{ instanceId: 'w1', blockId: 'faq', props: { mandatoryRead: true } }] },
    ] }],
  })]
  expect(collectMandatoryBlocks(pages, 'it')).toEqual([
    { instanceId: 'w1', blockId: 'faq', pageId: 'page-home', pageTitle: 'Home' },
  ])
})

test('collectMandatoryBlocks finds a marked widget in an accordion panel (same columns field)', () => {
  const pages = [makePage({
    sections: [{
      sectionId: 's1',
      layout: 'accordion',
      columns: [
        { columnId: 'panel-1', label: { it: 'Pannello 1', en: 'Panel 1', fr: 'Panneau 1', de: 'Panel 1' }, expanded: false, widgets: [{ instanceId: 'w1', blockId: 'procedure', props: { mandatoryRead: true } }] },
        { columnId: 'panel-2', label: { it: 'Pannello 2', en: 'Panel 2', fr: 'Panneau 2', de: 'Panel 2' }, expanded: false, widgets: [] },
      ],
    }],
  })]
  expect(collectMandatoryBlocks(pages, 'it')).toEqual([
    { instanceId: 'w1', blockId: 'procedure', pageId: 'page-home', pageTitle: 'Home' },
  ])
})

test('collectMandatoryBlocks collects marked widgets scattered across multiple pages', () => {
  const pages = [
    makePage({
      pageId: 'page-home',
      title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' },
      sections: [{ sectionId: 's1', layout: 'oneColumn', columns: [
        { columnId: 'c1', widgets: [{ instanceId: 'w1', blockId: 'faq', props: { mandatoryRead: true } }] },
      ] }],
    }),
    makePage({
      pageId: 'page-hr',
      title: { it: 'HR', en: 'HR', fr: 'RH', de: 'HR' },
      sections: [{ sectionId: 's2', layout: 'oneColumn', columns: [
        { columnId: 'c2', widgets: [
          { instanceId: 'w2', blockId: 'procedure', props: { mandatoryRead: true } },
          { instanceId: 'w3', blockId: 'documenti', props: { mandatoryRead: false } },
        ] },
      ] }],
    }),
  ]
  expect(collectMandatoryBlocks(pages, 'it')).toEqual([
    { instanceId: 'w1', blockId: 'faq', pageId: 'page-home', pageTitle: 'Home' },
    { instanceId: 'w2', blockId: 'procedure', pageId: 'page-hr', pageTitle: 'HR' },
  ])
})
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd client && npx vitest run src/context/sectionHelpers.test.js`
Expected: PASS (8 tests total — 4 pre-existing + 4 new).

- [ ] **Step 8: Add an e2e test confirming the toggle appears and works**

Append inside the `test.describe('ShareFlow configurator smoke test', ...)` block in `client/tests/smoke.spec.js`, near the existing `'toggling Visibile off dims the block...'` test:

```js
  test('a "Lettura obbligatoria" toggle is available on any block and can be turned on', async ({ page }) => {
    await page.getByText('FAQ', { exact: true }).first().click()
    await page.locator('main').getByText('FAQ', { exact: true }).click()

    const mandatoryRow = page.locator('div', { hasText: 'Lettura obbligatoria' }).filter({ has: page.locator('button') }).last()
    await expect(mandatoryRow).toBeVisible()
    await mandatoryRow.locator('button').click()
    await expect(page.getByText('Instance ID')).toBeVisible()
  })
```

- [ ] **Step 9: Run the e2e test**

Run: `cd client && npx playwright test -g "Lettura obbligatoria.*toggle is available"`
Expected: PASS (1 test).

- [ ] **Step 10: Run the full unit suite to confirm no regressions**

Run: `cd client && npx vitest run`
Expected: all tests pass (pre-existing count + 5 new: 1 in `blockCatalog.test.js`, 4 in `sectionHelpers.test.js`).

- [ ] **Step 11: Commit**

```bash
git add client/src/data/blockCatalog.js client/src/data/blockCatalog.test.js client/src/context/sectionHelpers.js client/src/context/sectionHelpers.test.js client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json client/tests/smoke.spec.js
git commit -m "feat: add mandatoryRead prop to all blocks and collectMandatoryBlocks helper"
```

---

## Task 2: Preview banner

**Files:**
- Create: `client/src/components/canvas/MandatoryReadBanner.jsx`
- Modify: `client/src/components/canvas/CanvasColumn.jsx`
- Modify: `client/src/locales/it.json`, `en.json`, `fr.json`, `de.json` (the `canvas` namespace)
- Modify: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: `widget.props.mandatoryRead` (Task 1).
- Produces: `MandatoryReadBanner` component, `{widget}` props, no other task depends on its internals.

- [ ] **Step 1: Verify the icons used exist in the installed `lucide-react` version**

Run: `cd client && node -e "const i=require('lucide-react'); console.log(!!i.BookOpenCheck, !!i.CheckCircle2)"`
Expected: `true true` (already confirmed during planning — re-run here only if `lucide-react` was upgraded since).

- [ ] **Step 2: Create `MandatoryReadBanner.jsx`**

Create `client/src/components/canvas/MandatoryReadBanner.jsx`:

```jsx
import { useState } from 'react'
import { BookOpenCheck, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function MandatoryReadBanner({ widget }) {
  const { t } = useTranslation()
  const [confirmed, setConfirmed] = useState(false)

  if (widget.props.mandatoryRead !== true) return null

  return (
    <div
      className={`flex items-center gap-2 mb-2 px-3 py-2 rounded-lg border text-xs font-medium ${
        confirmed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'
      }`}
    >
      {confirmed ? <CheckCircle2 size={14} /> : <BookOpenCheck size={14} />}
      <span>{t('canvas.mandatoryReadBanner')}</span>
      <label className="ml-auto flex items-center gap-1.5 cursor-pointer">
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
        {t('canvas.mandatoryReadConfirm')}
      </label>
    </div>
  )
}
```

- [ ] **Step 3: Wire it into `CanvasColumn.jsx`'s readOnly branch**

In `client/src/components/canvas/CanvasColumn.jsx`, add the import (after the existing `CanvasBlockPreview` import):

```js
import MandatoryReadBanner from './MandatoryReadBanner.jsx'
```

Replace this block (current lines 17-25):

```jsx
          return (
            <div key={widget.instanceId} className="mb-3">
              <CanvasBlockPreview
                block={block}
                width={widthHint}
                contentItems={widget.props.contentItems ?? []}
              />
            </div>
          )
```

with:

```jsx
          return (
            <div key={widget.instanceId} className="mb-3">
              <MandatoryReadBanner widget={widget} />
              <CanvasBlockPreview
                block={block}
                width={widthHint}
                contentItems={widget.props.contentItems ?? []}
              />
            </div>
          )
```

Do not touch the non-readOnly branch (lines 30-60) — the editor canvas never shows this banner, only the properties-panel toggle from Task 1.

- [ ] **Step 4: Add the banner's i18n keys to all 4 locale files**

In `client/src/locales/it.json`, inside `"canvas"`, after `"carouselGoToSlide": "Vai alla slide {{n}}"` (the last key before the closing `}` — check the exact trailing key, it may differ slightly; add as the new last key before the closing brace, with a trailing comma on the previous line):

```json
    "mandatoryReadBanner": "Lettura obbligatoria",
    "mandatoryReadConfirm": "Ho letto e compreso"
```

In `client/src/locales/en.json`, inside `"canvas"`, as the new last key (after `"carouselGoToSlide": "Go to slide {{n}}"`):

```json
    "mandatoryReadBanner": "Mandatory read",
    "mandatoryReadConfirm": "I have read and understood"
```

In `client/src/locales/fr.json`, inside `"canvas"`, as the new last key (after `"carouselGoToSlide": "Aller à la diapositive {{n}}"`):

```json
    "mandatoryReadBanner": "Lecture obligatoire",
    "mandatoryReadConfirm": "J'ai lu et compris"
```

In `client/src/locales/de.json`, inside `"canvas"`, as the new last key (after `"carouselGoToSlide": "Zu Folie {{n}} wechseln"`):

```json
    "mandatoryReadBanner": "Pflichtlektüre",
    "mandatoryReadConfirm": "Ich habe gelesen und verstanden"
```

Run the same JSON-validity check as Task 1 Step 4 against all 4 files.

- [ ] **Step 5: Add the e2e test**

Append inside the `'ShareFlow configurator smoke test'` describe block in `client/tests/smoke.spec.js`, near the Preview tests:

```js
  test('a block marked Lettura obbligatoria shows a banner and checkbox in Anteprima, with no persistence after reload', async ({ page, context }) => {
    await page.getByText('FAQ', { exact: true }).first().click()
    await page.locator('main').getByText('FAQ', { exact: true }).click()
    const mandatoryRow = page.locator('div', { hasText: 'Lettura obbligatoria' }).filter({ has: page.locator('button') }).last()
    await mandatoryRow.locator('button').click()

    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(localStorage.getItem('shareflow-preview') || 'null')
        return s?.pages?.some(p => p.sections?.some(sec => sec.columns?.some(col => col.widgets?.some(w => w.props?.mandatoryRead === true))))
      } catch { return false }
    })

    const [previewPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'Anteprima', exact: true }).click(),
    ])
    await previewPage.waitForLoadState('domcontentloaded')

    await expect(previewPage.getByText('Lettura obbligatoria', { exact: true })).toBeVisible()
    const checkbox = previewPage.getByRole('checkbox')
    await expect(checkbox).not.toBeChecked()
    await checkbox.check()
    await expect(checkbox).toBeChecked()

    await previewPage.reload()
    await expect(previewPage.getByRole('checkbox')).not.toBeChecked()
  })
```

- [ ] **Step 6: Run the e2e test**

Run: `cd client && npx playwright test -g "shows a banner and checkbox in Anteprima"`
Expected: PASS (1 test).

- [ ] **Step 7: Run the full unit + e2e suites to confirm no regressions**

Run: `cd client && npx vitest run && npx playwright test`
Expected: all unit tests pass; e2e suite passes except the 1 known pre-existing deploy-flow timeout failure (re-verify this is still the only pre-existing failure — do not assume the historical "2 known failures" count without rechecking, per the lesson recorded from sub-project 4).

- [ ] **Step 8: Commit**

```bash
git add client/src/components/canvas/MandatoryReadBanner.jsx client/src/components/canvas/CanvasColumn.jsx client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json client/tests/smoke.spec.js
git commit -m "feat: show a mock mandatory-read banner in Anteprima for marked blocks"
```

---

## Task 3: Compliance dashboard (4th Analytics tab)

**Files:**
- Create: `client/src/utils/analyticsCompliance.js`
- Create: `client/src/utils/analyticsCompliance.test.js`
- Create: `client/src/components/analytics/AnalyticsCompliance.jsx`
- Modify: `client/src/components/analytics/AnalyticsView.jsx`
- Modify: `client/src/locales/it.json`, `en.json`, `fr.json`, `de.json` (the `analytics` namespace)
- Modify: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: `collectMandatoryBlocks(pages, lang)` (Task 1), `useConfigurator()` (existing hook), `blockById` (existing, `client/src/data/blockCatalog.js`), `KpiCard` and `RankedTable` (existing, `client/src/components/analytics/`).
- Produces: `hashToCompletionPercent(instanceId): number` (40–95 inclusive, deterministic) — no other task depends on it, but its determinism is what Task 4's e2e test relies on implicitly (a re-render must not change the displayed percentage).

- [ ] **Step 1: Write the failing test for `hashToCompletionPercent`**

Create `client/src/utils/analyticsCompliance.test.js`:

```js
import { test, expect } from 'vitest'
import { hashToCompletionPercent } from './analyticsCompliance.js'

test('hashToCompletionPercent is deterministic for the same input', () => {
  expect(hashToCompletionPercent('w1')).toBe(hashToCompletionPercent('w1'))
})

test('hashToCompletionPercent stays within the 40-95 range for many inputs', () => {
  for (let i = 0; i < 200; i++) {
    const pct = hashToCompletionPercent(`instance-${i}`)
    expect(pct).toBeGreaterThanOrEqual(40)
    expect(pct).toBeLessThanOrEqual(95)
  }
})

test('hashToCompletionPercent differs across most distinct inputs', () => {
  const values = new Set(Array.from({ length: 50 }, (_, i) => hashToCompletionPercent(`instance-${i}`)))
  expect(values.size).toBeGreaterThan(10)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && npx vitest run src/utils/analyticsCompliance.test.js`
Expected: FAIL with "Failed to resolve import" or "hashToCompletionPercent is not a function" (the module doesn't exist yet).

- [ ] **Step 3: Implement `hashToCompletionPercent`**

Create `client/src/utils/analyticsCompliance.js`:

```js
/**
 * Deterministic mock completion percentage for a widget instance, in the
 * 40-95 range (avoids suspicious-looking 0%/100% values). Same instanceId
 * always yields the same percentage; no Math.random.
 */
export function hashToCompletionPercent(instanceId) {
  let hash = 0
  for (let i = 0; i < instanceId.length; i++) {
    hash = (hash * 31 + instanceId.charCodeAt(i)) % 1000003
  }
  return 40 + (hash % 56)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd client && npx vitest run src/utils/analyticsCompliance.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Add the Compliance i18n keys to all 4 locale files**

In `client/src/locales/it.json`, inside `"analytics"`, as the new last key(s) before the closing `}` (after `"growing": "Contenuti in crescita"` — add a trailing comma to that line):

```json
    "tabCompliance": "Compliance",
    "complianceKpiCount": "Contenuti obbligatori",
    "complianceKpiAvg": "Completamento medio",
    "complianceKpiLate": "In ritardo",
    "complianceChartTitle": "Completamento medio per pagina",
    "complianceTableTitle": "Stato di completamento",
    "colPage": "Pagina",
    "colBlock": "Blocco",
    "colCompletion": "Completamento",
    "complianceEmpty": "Nessun contenuto marcato come lettura obbligatoria"
```

In `client/src/locales/en.json`, inside `"analytics"`, after `"growing": "Growing content"`:

```json
    "tabCompliance": "Compliance",
    "complianceKpiCount": "Mandatory content",
    "complianceKpiAvg": "Average completion",
    "complianceKpiLate": "Behind schedule",
    "complianceChartTitle": "Average completion by page",
    "complianceTableTitle": "Completion status",
    "colPage": "Page",
    "colBlock": "Block",
    "colCompletion": "Completion",
    "complianceEmpty": "No content marked as mandatory read"
```

In `client/src/locales/fr.json`, inside `"analytics"`, after `"growing": "Contenus en hausse"`:

```json
    "tabCompliance": "Conformité",
    "complianceKpiCount": "Contenus obligatoires",
    "complianceKpiAvg": "Achèvement moyen",
    "complianceKpiLate": "En retard",
    "complianceChartTitle": "Achèvement moyen par page",
    "complianceTableTitle": "État d'achèvement",
    "colPage": "Page",
    "colBlock": "Bloc",
    "colCompletion": "Achèvement",
    "complianceEmpty": "Aucun contenu marqué comme lecture obligatoire"
```

In `client/src/locales/de.json`, inside `"analytics"`, after `"growing": "Wachsende Inhalte"`:

```json
    "tabCompliance": "Compliance",
    "complianceKpiCount": "Pflichtinhalte",
    "complianceKpiAvg": "Durchschnittliche Abschlussrate",
    "complianceKpiLate": "Im Rückstand",
    "complianceChartTitle": "Durchschnittliche Abschlussrate pro Seite",
    "complianceTableTitle": "Abschlussstatus",
    "colPage": "Seite",
    "colBlock": "Block",
    "colCompletion": "Abschluss",
    "complianceEmpty": "Keine Inhalte als Pflichtlektüre markiert"
```

Run the same JSON-validity check as Task 1 Step 4 against all 4 files.

- [ ] **Step 6: Create `AnalyticsCompliance.jsx`**

Create `client/src/components/analytics/AnalyticsCompliance.jsx`:

```jsx
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { collectMandatoryBlocks } from '../../context/sectionHelpers.js'
import { hashToCompletionPercent } from '../../utils/analyticsCompliance.js'
import { blockById } from '../../data/blockCatalog.js'
import { useLang } from '../../hooks/useLang.js'
import KpiCard from './KpiCard.jsx'
import RankedTable from './RankedTable.jsx'

export default function AnalyticsCompliance({ pages }) {
  const { t } = useTranslation()
  const lang = useLang()

  const items = useMemo(() => {
    return collectMandatoryBlocks(pages, lang).map(item => ({
      ...item,
      blockLabel: t(`blocks.labels.${item.blockId}`, { defaultValue: blockById[item.blockId]?.label ?? item.blockId }),
      completion: hashToCompletionPercent(item.instanceId),
    }))
  }, [pages, lang, t])

  if (items.length === 0) {
    return (
      <div className="bg-surface-card rounded-xl border border-slate-mid p-8 text-center text-slate-light text-sm">
        {t('analytics.complianceEmpty')}
      </div>
    )
  }

  const avgCompletion = Math.round(items.reduce((sum, i) => sum + i.completion, 0) / items.length)
  const lateCount = items.filter(i => i.completion < 50).length

  const tableRows = [...items]
    .sort((a, b) => a.completion - b.completion)
    .map(i => ({ page: i.pageTitle, block: i.blockLabel, completion: `${i.completion}%` }))

  const tableColumns = [
    { key: 'page', label: t('analytics.colPage') },
    { key: 'block', label: t('analytics.colBlock') },
    { key: 'completion', label: t('analytics.colCompletion') },
  ]

  const byPage = new Map()
  for (const item of items) {
    if (!byPage.has(item.pageTitle)) byPage.set(item.pageTitle, [])
    byPage.get(item.pageTitle).push(item.completion)
  }
  const chartData = [...byPage.entries()].map(([name, values]) => ({
    name,
    value: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t('analytics.complianceKpiCount')} value={items.length} showComparison={false} />
        <KpiCard label={t('analytics.complianceKpiAvg')} value={avgCompletion} showComparison={false} formatter={v => `${v}%`} />
        <KpiCard label={t('analytics.complianceKpiLate')} value={lateCount} showComparison={false} />
      </div>

      <div className="bg-surface-card rounded-xl border border-slate-mid p-4">
        <h3 className="text-sm font-semibold text-navy mb-3">{t('analytics.complianceChartTitle')}</h3>
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" stroke="#8899AA" fontSize={12} domain={[0, 100]} />
            <YAxis type="category" dataKey="name" stroke="#8899AA" fontSize={12} width={140} />
            <Tooltip />
            <Bar dataKey="value" fill="#0078D4" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <RankedTable title={t('analytics.complianceTableTitle')} rows={tableRows} columns={tableColumns} />
    </div>
  )
}
```

- [ ] **Step 7: Wire the 4th tab into `AnalyticsView.jsx`**

In `client/src/components/analytics/AnalyticsView.jsx`, the current full content is:

```jsx
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getAnalyticsData, PERIODS } from '../../data/analyticsMockData.js'
import AnalyticsFilterBar from './AnalyticsFilterBar.jsx'
import AnalyticsOverview from './AnalyticsOverview.jsx'
import AnalyticsSites from './AnalyticsSites.jsx'
import AnalyticsContent from './AnalyticsContent.jsx'

const TABS = ['overview', 'sites', 'content']

export default function AnalyticsView({ onClose }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('overview')
  const [period, setPeriod] = useState(PERIODS[0])
  const [showComparison, setShowComparison] = useState(false)

  const data = getAnalyticsData(period)

  return (
    <main className="overflow-y-auto bg-surface" style={{ height: 'calc(100vh - 3.5rem)', marginTop: '3.5rem' }}>
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

        {activeTab === 'overview' && <AnalyticsOverview data={data} showComparison={showComparison} />}
        {activeTab === 'sites' && <AnalyticsSites data={data} />}
        {activeTab === 'content' && <AnalyticsContent data={data} />}
      </div>
    </main>
  )
}
```

Replace it entirely with:

```jsx
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { getAnalyticsData, PERIODS } from '../../data/analyticsMockData.js'
import AnalyticsFilterBar from './AnalyticsFilterBar.jsx'
import AnalyticsOverview from './AnalyticsOverview.jsx'
import AnalyticsSites from './AnalyticsSites.jsx'
import AnalyticsContent from './AnalyticsContent.jsx'
import AnalyticsCompliance from './AnalyticsCompliance.jsx'

const TABS = ['overview', 'sites', 'content', 'compliance']

export default function AnalyticsView({ onClose }) {
  const { t } = useTranslation()
  const { state } = useConfigurator()
  const [activeTab, setActiveTab] = useState('overview')
  const [period, setPeriod] = useState(PERIODS[0])
  const [showComparison, setShowComparison] = useState(false)

  const data = getAnalyticsData(period)

  return (
    <main className="overflow-y-auto bg-surface" style={{ height: 'calc(100vh - 3.5rem)', marginTop: '3.5rem' }}>
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

        {activeTab !== 'compliance' && (
          <div className="mb-4">
            <AnalyticsFilterBar
              period={period}
              onPeriodChange={setPeriod}
              showComparison={showComparison}
              onToggleComparison={setShowComparison}
            />
          </div>
        )}

        {activeTab === 'overview' && <AnalyticsOverview data={data} showComparison={showComparison} />}
        {activeTab === 'sites' && <AnalyticsSites data={data} />}
        {activeTab === 'content' && <AnalyticsContent data={data} />}
        {activeTab === 'compliance' && <AnalyticsCompliance pages={state.pages} />}
      </div>
    </main>
  )
}
```

- [ ] **Step 8: Add e2e tests for the Compliance tab**

Append inside the Analytics-related tests in `client/tests/smoke.spec.js` (near `'switching Analytics tabs shows the Sites and Content dashboards'`):

```js
  test('Compliance tab shows an empty state when no block is marked mandatory', async ({ page }) => {
    await page.getByRole('button', { name: 'Analytics' }).click()
    await page.getByRole('button', { name: 'Compliance', exact: true }).click()
    await expect(page.getByText('Nessun contenuto marcato come lettura obbligatoria', { exact: true })).toBeVisible()
  })

  test('marking a block mandatory makes it appear in the Compliance tab with a plausible percentage', async ({ page }) => {
    await page.getByText('FAQ', { exact: true }).first().click()
    await page.locator('main').getByText('FAQ', { exact: true }).click()
    const mandatoryRow = page.locator('div', { hasText: 'Lettura obbligatoria' }).filter({ has: page.locator('button') }).last()
    await mandatoryRow.locator('button').click()

    await page.getByRole('button', { name: 'Analytics' }).click()
    await page.getByRole('button', { name: 'Compliance', exact: true }).click()

    const table = page.locator('div', { hasText: 'Stato di completamento' }).last()
    await expect(table.getByText('FAQ', { exact: true })).toBeVisible()
    await expect(table.getByText(/^\d{1,3}%$/)).toBeVisible()
  })
```

- [ ] **Step 9: Run the new e2e tests**

Run: `cd client && npx playwright test -g "Compliance tab"`
Expected: PASS (2 tests).

- [ ] **Step 10: Run the full unit + e2e suites to confirm no regressions**

Run: `cd client && npx vitest run && npx playwright test`
Expected: all unit tests pass; e2e suite passes except the 1 known pre-existing deploy-flow timeout failure (re-verify, don't assume).

- [ ] **Step 11: Commit**

```bash
git add client/src/utils/analyticsCompliance.js client/src/utils/analyticsCompliance.test.js client/src/components/analytics/AnalyticsCompliance.jsx client/src/components/analytics/AnalyticsView.jsx client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json client/tests/smoke.spec.js
git commit -m "feat: add Compliance tab to Analytics, driven by real mandatoryRead state"
```

---

## Task 4: Full end-to-end integration test + accessibility

**Files:**
- Modify: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: everything from Tasks 1-3. No new production code in this task — it only adds test coverage that spans the full feature in one flow, which the per-task tests (Tasks 1-3) deliberately did not attempt (each task tested only its own slice).

- [ ] **Step 1: Write the full-pipeline e2e test**

Append inside the `'ShareFlow configurator smoke test'` describe block in `client/tests/smoke.spec.js`:

```js
  test('end-to-end: marking a block mandatory shows the banner in Anteprima and the item in Compliance', async ({ page, context }) => {
    // Mark "Procedure" as mandatory read
    await page.getByText('Procedure', { exact: true }).first().click()
    await page.locator('main').getByText('Procedure', { exact: true }).click()
    const mandatoryRow = page.locator('div', { hasText: 'Lettura obbligatoria' }).filter({ has: page.locator('button') }).last()
    await mandatoryRow.locator('button').click()

    // Anteprima shows the banner
    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(localStorage.getItem('shareflow-preview') || 'null')
        return s?.pages?.some(p => p.sections?.some(sec => sec.columns?.some(col => col.widgets?.some(w => w.props?.mandatoryRead === true))))
      } catch { return false }
    })
    const [previewPage] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'Anteprima', exact: true }).click(),
    ])
    await previewPage.waitForLoadState('domcontentloaded')
    await expect(previewPage.getByText('Lettura obbligatoria', { exact: true })).toBeVisible()
    await previewPage.close()

    // Compliance tab shows the same block
    await page.getByRole('button', { name: 'Analytics' }).click()
    await page.getByRole('button', { name: 'Compliance', exact: true }).click()
    const table = page.locator('div', { hasText: 'Stato di completamento' }).last()
    await expect(table.getByText('Procedure', { exact: true })).toBeVisible()
  })
```

- [ ] **Step 2: Add the a11y test for the Compliance tab**

Append immediately after, in the same describe block:

```js
  test('Compliance tab has no in-scope accessibility violations', async ({ page }) => {
    await page.getByRole('button', { name: 'Analytics' }).click()
    await page.getByRole('button', { name: 'Compliance', exact: true }).click()

    const results = await new AxeBuilder({ page }).disableRules(OUT_OF_SCOPE_AXE_RULES).analyze()
    expect(results.violations).toEqual([])
  })
```

- [ ] **Step 3: Run both new tests**

Run: `cd client && npx playwright test -g "end-to-end: marking a block mandatory|Compliance tab has no in-scope"`
Expected: PASS (2 tests).

- [ ] **Step 4: Run the complete unit + e2e suite**

Run: `cd client && npx vitest run && npx playwright test`
Expected: all unit tests pass; e2e suite passes except the 1 known pre-existing deploy-flow timeout failure — re-verify this by rerunning that specific test 3-5 times in isolation (per the stale-baseline lesson from sub-project 4, do not just copy forward a number from memory).

Run: `cd client && npx playwright test -g "deploy flow completes end-to-end" --repeat-each=3`
Record the actual pass/fail count for the final report.

- [ ] **Step 5: Run a full production build to confirm no build-time regressions**

Run: `cd client && npm run build`
Expected: clean build, no errors.

- [ ] **Step 6: Commit**

```bash
git add client/tests/smoke.spec.js
git commit -m "test: add full mandatory-read pipeline e2e test and Compliance a11y coverage"
```

---

## Self-Review

**Spec coverage:**
- Section 1 (data model) → Task 1. ✅
- Section 2 (preview banner) → Task 2. ✅
- Section 3 (Compliance dashboard, including the no-fake-audience constraint, empty state, hidden filter bar) → Task 3. ✅
- Section 4 (i18n in all 4 locales, Vitest for pure logic, Playwright e2e, axe-core a11y, no real persistence/SPFx/RBAC) → spread across Tasks 1-4, explicit out-of-scope items are simply never built. ✅

**Placeholder scan:** no "TBD"/"TODO"/"similar to Task N" patterns; every code step has complete, literal code; every locale addition shows the exact translated strings for all 4 languages.

**Type consistency:** `collectMandatoryBlocks(pages, lang)` (Task 1) is called identically in Task 3's `AnalyticsCompliance.jsx`. `hashToCompletionPercent(instanceId)` (Task 3) signature matches its one call site. `MandatoryReadBanner({widget})` (Task 2) matches its one call site in `CanvasColumn.jsx`. `RankedTable`/`KpiCard` are used with the exact prop shapes confirmed by reading their current source during planning — no invented props.

---

## Execution Choice

Plan complete and saved to `docs/superpowers/plans/2026-06-25-phase6-mandatory-read.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. Used for all 4 prior Phase 6 sub-projects.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
