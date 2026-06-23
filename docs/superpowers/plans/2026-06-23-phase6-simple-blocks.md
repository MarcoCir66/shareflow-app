# Phase 6 Sub-Project 1: Simple New Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 9 new content blocks to ShareFlow's catalog (closing 9 of the 17 gaps found versus Origami Connect's feature list) and wire 3 of them into the existing Employee Hub page template.

**Architecture:** Pure data-layer addition, identical in shape to the `documenti` block added in the prior phase: 9 new catalog entries, 9 new content-schema entries (reusing existing source-type constants), 9 new locale keys per language, and 2 new sections appended to one existing page template's static data. No component, reducer, or rendering logic changes — every block renders through `CanvasBlockPreview.jsx`'s existing generic fallback path.

**Tech Stack:** React 19, i18next/react-i18next, Vitest, Playwright.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-23-phase6-simple-blocks-design.md`.
- No `CanvasBlockPreview.jsx` changes — none of the 9 blocks may be added to that file's `EVENT_IDS`/`MEDIA_IDS`/`PERSON_IDS` special-case sets.
- No `siteTemplates.js` changes — the site bundle referencing `employee-hub` inherits the new sections automatically via its existing `pageTemplateId` reference.
- No per-block unit tests — matches this catalog's established convention (none of the original 32 blocks, nor the `documenti` block added in the prior phase, have one).
- All `defaultProps`/`configurableProps` use the standard non-scoped shape: `{ scope: null, visible: true, commentsEnabled: false, likesEnabled: false }`, `configurableProps: ['visible']`.
- All 9 lucide-react icon names (`IdCard`, `Award`, `PartyPopper`, `Link2`, `MessageCircleQuestion`, `Rss`, `MousePointerClick`, `Heading`, `Code2`) were verified against the installed `lucide-react` package before this plan was written — use these exact names, not `Linkedin` (confirmed absent from this package version).
- The two new sections in `employee-hub` are appended as the LAST two entries in its `sections` array — its 3 existing sections are not reordered or modified.
- Run `npx vitest run` and `npx playwright test` from `client/` for verification.

---

### Task 1: 9 new blocks — catalog, schema, template wiring, i18n, tests

**Files:**
- Modify: `client/src/data/blockContentSchemas.js`
- Modify: `client/src/data/blockCatalog.js`
- Modify: `client/src/data/pageTemplates.js`
- Modify: `client/src/locales/it.json`, `client/src/locales/en.json`, `client/src/locales/fr.json`, `client/src/locales/de.json`
- Test: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: `SP_MANUAL` (existing constant in `blockContentSchemas.js`, line 54: `const SP_MANUAL = ['sharepoint-list', 'manual']`); `CATEGORIES.KNOWLEDGE_BASE`/`LEARNING`/`PRODUCTIVITY`/`COMMUNICATION` (existing exports in `blockCatalog.js`).
- Produces: catalog entries `blockById['contatti-chiave']`, `blockById['kudos']`, `blockById['anniversari']`, `blockById['collegamenti-rapidi']`, `blockById['feedback-utenti']`, `blockById['linkedin-feed']`, `blockById['pulsante-cta']`, `blockById['titolo-libero']`, `blockById['embed-custom']`. `pageTemplateById['employee-hub'].sections` gains 2 more entries containing block ids `'kudos'`, `'anniversari'`, `'contatti-chiave'`. No other task/file depends on this work.

- [ ] **Step 1: Write the failing e2e tests**

In `client/tests/smoke.spec.js`, insert this test immediately after the `'search filters the block library'` test (which currently ends at line 34) and before the `'clicking a block adds it to the canvas and shows its properties'` test (which currently starts at line 36):

```js
  test('all 9 Phase 6 sub-project 1 blocks are visible in the block library', async ({ page }) => {
    await expect(page.getByText('Contatti Chiave', { exact: true })).toBeVisible()
    await expect(page.getByText('Kudos', { exact: true })).toBeVisible()
    await expect(page.getByText('Anniversari', { exact: true })).toBeVisible()
    await expect(page.getByText('Collegamenti Rapidi', { exact: true })).toBeVisible()
    await expect(page.getByText('Feedback Utenti', { exact: true })).toBeVisible()
    await expect(page.getByText('Feed LinkedIn', { exact: true })).toBeVisible()
    await expect(page.getByText('Pulsante CTA', { exact: true })).toBeVisible()
    await expect(page.getByText('Titolo Libero', { exact: true })).toBeVisible()
    await expect(page.getByText('Embed Personalizzato', { exact: true })).toBeVisible()
  })

```

In the same file, insert this test immediately after the `'applying the HR Portal template includes the Documenti block'` test (which currently ends at line 318) and before the `'Template tab and its confirmation dialog have no in-scope accessibility violations'` test (which currently starts at line 320):

```js
  test('applying the Employee Hub template includes Kudos, Anniversari and Contatti Chiave', async ({ page }) => {
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByText('Employee Hub', { exact: true }).click()

    await expect(page.locator('main').getByText('Kudos', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('Anniversari', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('Contatti Chiave', { exact: true })).toBeVisible()
  })

```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd client && npx playwright test -g "Phase 6 sub-project 1 blocks|Kudos, Anniversari and Contatti Chiave"`

Expected: both FAIL — none of the 9 blocks exist in the catalog yet, and `employee-hub` does not have the new sections yet.

- [ ] **Step 3: Add the 9 content schema entries**

In `client/src/data/blockContentSchemas.js`, insert this block into `BLOCK_CONTENT_DEFS` immediately after the `'bacheca-scambio'` entry (which currently ends at line 113 with `},`) and before the `'sezione-fiere'` entry (which currently starts at line 114):

```js
  'linkedin-feed':     {
    sourceTypes: ['rss', 'manual'],
    schema: [
      { key: 'author',   label: 'Autore',    type: 'text',     required: false },
      { key: 'title',    label: 'Titolo',    type: 'text',     required: true  },
      { key: 'excerpt',  label: 'Estratto',  type: 'textarea', required: false },
      { key: 'url',      label: 'Link',      type: 'url',      required: false },
      { key: 'imageUrl', label: 'Immagine',  type: 'url',      required: false },
      { key: 'date',     label: 'Data',      type: 'date',     required: false },
    ],
  },
```

Insert this block immediately after the `'sezione-welfare'` entry (which currently ends at line 164 with `},`) and before the `// ── Productivity ──` comment (which currently starts at line 165):

```js
  'kudos':             {
    sourceTypes: ['manual'],
    schema: [
      { key: 'from',    label: 'Da',        type: 'text',     required: true  },
      { key: 'to',      label: 'A',         type: 'text',     required: true  },
      { key: 'message', label: 'Messaggio', type: 'textarea', required: true  },
      { key: 'date',    label: 'Data',      type: 'date',     required: false },
    ],
  },
  'anniversari':       {
    sourceTypes: ['manual'],
    schema: [
      { key: 'name',       label: 'Nome',      type: 'text',   required: true  },
      { key: 'type',       label: 'Tipo',      type: 'select', required: true,
        options: ['anniversario', 'compleanno'] },
      { key: 'date',       label: 'Data',      type: 'date',   required: true  },
      { key: 'department', label: 'Reparto',   type: 'text',   required: false },
      { key: 'imageUrl',   label: 'Foto',      type: 'url',    required: false },
    ],
  },
  'feedback-utenti':   {
    sourceTypes: ['manual'],
    schema: [
      { key: 'question', label: 'Domanda',             type: 'text',     required: true  },
      { key: 'response', label: 'Risposta di esempio', type: 'textarea', required: false },
      { key: 'date',     label: 'Data',                type: 'date',     required: false },
    ],
  },
```

Insert this block immediately after the `'meteo'` entry (which currently ends at line 186 with `},`) and before the `// ── Knowledge Base ──` comment (which currently starts at line 187):

```js
  'collegamenti-rapidi': {
    sourceTypes: ['manual'],
    schema: [
      { key: 'title',       label: 'Titolo',      type: 'text', required: true  },
      { key: 'url',         label: 'Link',        type: 'url',  required: true  },
      { key: 'description', label: 'Descrizione', type: 'text', required: false },
    ],
  },
  'pulsante-cta':      {
    sourceTypes: ['manual'],
    schema: [
      { key: 'label', label: 'Testo pulsante', type: 'text',   required: true  },
      { key: 'url',   label: 'Link',           type: 'url',    required: true  },
      { key: 'style', label: 'Stile',          type: 'select', required: false,
        options: ['primary', 'secondary'] },
    ],
  },
  'titolo-libero':     {
    sourceTypes: ['manual'],
    schema: [
      { key: 'text',     label: 'Testo',       type: 'text', required: true  },
      { key: 'subtitle', label: 'Sottotitolo', type: 'text', required: false },
    ],
  },
  'embed-custom':      {
    sourceTypes: ['manual'],
    schema: [
      { key: 'embedUrl', label: 'URL embed',    type: 'url',  required: true  },
      { key: 'height',   label: 'Altezza (px)', type: 'text', required: false },
    ],
  },
```

Insert this block immediately after the `'rubrica-colleghi'` entry (which currently ends at line 226 with `},`) and before the `'documenti'` entry (which currently starts at line 227):

```js
  'contatti-chiave':   {
    sourceTypes: ['sharepoint-list', 'manual'],
    schema: [
      { key: 'name',       label: 'Nome',     type: 'text', required: true  },
      { key: 'role',       label: 'Ruolo',    type: 'text', required: false },
      { key: 'department', label: 'Reparto',  type: 'text', required: false },
      { key: 'email',      label: 'Email',    type: 'text', required: false },
      { key: 'phone',      label: 'Telefono', type: 'text', required: false },
      { key: 'imageUrl',   label: 'Foto',     type: 'url',  required: false },
    ],
  },
```

- [ ] **Step 4: Add the 9 catalog entries**

In `client/src/data/blockCatalog.js`, insert this line into `_rawCatalog` immediately after the `'bacheca-scambio'` entry (line 51) and before the `// ── LEARNING ──` comment (line 52):

```js
  { id: 'linkedin-feed',       label: 'Feed LinkedIn',              category: CATEGORIES.COMMUNICATION, icon: 'Rss',           defaultProps: { scope: null,        visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
```

Insert these lines immediately after the `'sezione-welfare'` entry (line 56) and before the `// ── PRODUCTIVITY ──` comment (line 57):

```js
  { id: 'kudos',                label: 'Kudos',                      category: CATEGORIES.LEARNING, icon: 'Award',              defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'anniversari',          label: 'Anniversari',                category: CATEGORIES.LEARNING, icon: 'PartyPopper',        defaultProps: { scope: null,       visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'feedback-utenti',      label: 'Feedback Utenti',            category: CATEGORIES.LEARNING, icon: 'MessageCircleQuestion', defaultProps: { scope: null,    visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
```

Insert these lines immediately after the `'multilingua'` entry (line 62) and before the `// ── KNOWLEDGE BASE ──` comment (line 63):

```js
  { id: 'collegamenti-rapidi',  label: 'Collegamenti Rapidi',        category: CATEGORIES.PRODUCTIVITY, icon: 'Link2',           defaultProps: { scope: null,      visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'pulsante-cta',         label: 'Pulsante CTA',               category: CATEGORIES.PRODUCTIVITY, icon: 'MousePointerClick', defaultProps: { scope: null,    visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'titolo-libero',        label: 'Titolo Libero',              category: CATEGORIES.PRODUCTIVITY, icon: 'Heading',         defaultProps: { scope: null,      visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
  { id: 'embed-custom',         label: 'Embed Personalizzato',       category: CATEGORIES.PRODUCTIVITY, icon: 'Code2',           defaultProps: { scope: null,      visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
```

Insert this line immediately after the `'rubrica-colleghi'` entry (line 68) and before the `'documenti'` entry (line 69):

```js
  { id: 'contatti-chiave',      label: 'Contatti Chiave',            category: CATEGORIES.KNOWLEDGE_BASE, icon: 'IdCard',        defaultProps: { scope: null,      visible: true, commentsEnabled: false, likesEnabled: false }, configurableProps: ['visible'] },
```

- [ ] **Step 5: Wire 3 of the blocks into the `employee-hub` page template**

In `client/src/data/pageTemplates.js`, change the `employee-hub` entry's `sections` array (currently lines 59-63):

```js
    sections: [
      { layout: 'twoColumn', blocks: [['motore-ricerca'], ['rubrica-colleghi']] },
      { layout: 'oneColumn', blocks: [['polls-survey']] },
      { layout: 'oneColumn', blocks: [['bacheca-scambio']] },
    ],
```

to:

```js
    sections: [
      { layout: 'twoColumn', blocks: [['motore-ricerca'], ['rubrica-colleghi']] },
      { layout: 'oneColumn', blocks: [['polls-survey']] },
      { layout: 'oneColumn', blocks: [['bacheca-scambio']] },
      { layout: 'twoColumn', blocks: [['kudos'], ['anniversari']] },
      { layout: 'oneColumn', blocks: [['contatti-chiave']] },
    ],
```

- [ ] **Step 6: Add the locale keys to all four locale files**

In `client/src/locales/it.json`, insert this line immediately after the `"bacheca-scambio"` line (currently line 52) and before the `"new-entry"` line (currently line 53):

```json
      "linkedin-feed": "Feed LinkedIn",
```

Insert these lines immediately after the `"sezione-welfare"` line (currently line 56) and before the `"procedure"` line (currently line 57):

```json
      "kudos": "Kudos",
      "anniversari": "Anniversari",
      "feedback-utenti": "Feedback Utenti",
```

Insert these lines immediately after the `"multilingua"` line (currently line 61) and before the `"motore-ricerca"` line (currently line 62):

```json
      "collegamenti-rapidi": "Collegamenti Rapidi",
      "pulsante-cta": "Pulsante CTA",
      "titolo-libero": "Titolo Libero",
      "embed-custom": "Embed Personalizzato",
```

Insert this line immediately after the `"rubrica-colleghi"` line (currently line 66) and before the `"documenti"` line (currently line 67):

```json
      "contatti-chiave": "Contatti Chiave",
```

In `client/src/locales/en.json`, at the same 4 positions (after `"bacheca-scambio"`, after `"sezione-welfare"`, after `"multilingua"`, after `"rubrica-colleghi"`):

```json
      "linkedin-feed": "LinkedIn Feed",
```
```json
      "kudos": "Kudos",
      "anniversari": "Anniversaries",
      "feedback-utenti": "User Feedback",
```
```json
      "collegamenti-rapidi": "Quick Links",
      "pulsante-cta": "CTA Button",
      "titolo-libero": "Free Heading",
      "embed-custom": "Custom Embed",
```
```json
      "contatti-chiave": "Key Contacts",
```

In `client/src/locales/fr.json`, at the same 4 positions:

```json
      "linkedin-feed": "Fil LinkedIn",
```
```json
      "kudos": "Kudos",
      "anniversari": "Anniversaires",
      "feedback-utenti": "Retours Utilisateurs",
```
```json
      "collegamenti-rapidi": "Liens Rapides",
      "pulsante-cta": "Bouton CTA",
      "titolo-libero": "Titre Libre",
      "embed-custom": "Intégration personnalisée",
```
```json
      "contatti-chiave": "Contacts Clés",
```

In `client/src/locales/de.json`, at the same 4 positions:

```json
      "linkedin-feed": "LinkedIn-Feed",
```
```json
      "kudos": "Kudos",
      "anniversari": "Jubiläen",
      "feedback-utenti": "Nutzer-Feedback",
```
```json
      "collegamenti-rapidi": "Schnellzugriffe",
      "pulsante-cta": "CTA-Button",
      "titolo-libero": "Freier Titel",
      "embed-custom": "Benutzerdefiniertes Embed",
```
```json
      "contatti-chiave": "Wichtige Kontakte",
```

- [ ] **Step 7: Run the new tests to verify they pass**

Run: `cd client && npx playwright test -g "Phase 6 sub-project 1 blocks|Kudos, Anniversari and Contatti Chiave"`

Expected: both PASS.

- [ ] **Step 8: Run both full suites to check for regressions**

Run:
```bash
cd client && npx vitest run
npx playwright test
```

Expected: all pass — Vitest count is the pre-existing count (this task adds no unit tests); Playwright count is the pre-existing count plus 2. No other test's assertions change, since no existing section in `employee-hub` was reordered or removed, and no other template's data changed.

- [ ] **Step 9: Commit**

```bash
git add client/src/data/blockContentSchemas.js client/src/data/blockCatalog.js client/src/data/pageTemplates.js client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json client/tests/smoke.spec.js
git commit -m "feat: add 9 Phase 6 blocks closing Origami feature gaps, wire 3 into Employee Hub"
```

---

## Final check

After Task 1, run both suites once more from `client/`:

```bash
npx vitest run
npx playwright test
```

Expected: all Vitest tests pass (unchanged count from before this plan), all Playwright tests pass (pre-existing count + 2).
