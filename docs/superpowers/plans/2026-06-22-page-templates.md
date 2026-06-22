# Page Templates (Phase 5a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user scaffold a page instantly from a gallery of 5 pre-composed templates (Homepage Comunicazione, Portale HR, Onboarding, Employee Hub, Formazione), applied via a new reducer action whose data/payload shapes are chosen so a future Phase 5b (multi-page site bundles) extends them rather than replacing them.

**Architecture:** A new static catalog (`pageTemplates.js`) describes each template's sections using the exact `Page.sections` shape already in `configuratorReducer.js`, with no baked-in ids (ids are minted fresh at apply time, exactly like `ADD_WIDGET` already does). A new `APPLY_TEMPLATE` reducer action consumes a `{ pages: Page[], navigation?, theme? }` payload — Phase 5a always sends a single-page array and omits the other two fields; a visible, commented guard returns the state unchanged for any other shape, marking the exact spot Phase 5b extends. A new 4th sidebar tab (`TemplateGallery.jsx`) renders the catalog as a flat card grid (not grouped by category — with 5 templates across 5 categories every group would hold exactly one card, so grouping buys nothing yet) and either applies a template immediately (empty active page) or opens a confirmation dialog (`ApplyTemplateDialog.jsx`, reusing the `useFocusTrap` hook built in Phase 4) when the active page already has content.

**Tech Stack:** React 19, the existing `configuratorReducer.js`/`useConfigurator()` state management, `lucide-react` icons, i18next/react-i18next, Vitest, Playwright + `@axe-core/playwright` (already a devDependency from Phase 4).

## Global Constraints

- No backend/server changes.
- No changes to `blockCatalog.js`, `sectionLayouts.js`, or `themeTemplates.js` — this feature composes them, it does not modify them.
- A template's stored content never contains `sectionId`/`columnId`/`instanceId` — these are `crypto.randomUUID()`-generated at apply time, every time, so the same template can be applied repeatedly or to different pages without id collisions.
- The `APPLY_TEMPLATE` action payload is `{ pages: Page[], navigation?, theme? }` from the first commit. Any payload where `pages.length !== 1` or `navigation`/`theme` is present must return the state unchanged via a commented guard (Phase 5b is explicitly not implemented, but the payload shape must not change later).
- Card labels, descriptions, and category names are real, translatable content via `t(key, { defaultValue })`, exactly like `blockCatalog.js`'s `label`s are rendered by `BlockCard.jsx`/`CategoryGroup.jsx` (verified directly in source: `client/src/locales/en.json`'s `blocks.labels.*` values genuinely differ from `it.json`'s, they are not a copy) — never render a catalog's flat string directly without going through `t()`.
- All new e2e tests go in `client/tests/smoke.spec.js`, using its existing `test.beforeEach` (sets `i18nextLng` to `'it'`) and selector conventions (`getByRole`, `getByText`, scoped `.locator('main')`).
- Axe-core scans that are not scoped via `.include(selector)` must use the existing `OUT_OF_SCOPE_AXE_RULES` constant (`client/tests/smoke.spec.js`) via `.disableRules(...)`.
- Run `npx playwright test` and `npx vitest run` from `client/` for verification.

---

### Task 1: `pageTemplates.js` catalog and the `APPLY_TEMPLATE` reducer action

**Files:**
- Create: `client/src/data/pageTemplates.js`
- Modify: `client/src/context/configuratorReducer.js`
- Modify: `client/src/context/configuratorReducer.test.js`

**Interfaces:**
- Produces: `PAGE_TEMPLATE_CATEGORIES` (object: `COMMUNICATION`, `HR`, `ONBOARDING`, `EMPLOYEE_HUB`, `LEARNING`), `PAGE_TEMPLATES` (array of 5 template objects: `{ id, label, category, icon, description, defaultPageTitle: {it,en,fr,de}, sections: [{ layout, blocks: string[][] }] }`), `pageTemplateById` (object keyed by `id`) — all from `client/src/data/pageTemplates.js`. Consumed by Task 2's `TemplateGallery.jsx`.
- Produces: `ACTIONS.APPLY_TEMPLATE` and its reducer case in `configuratorReducer.js`, dispatched as `{ type: ACTIONS.APPLY_TEMPLATE, payload: { pages: [{ title, sections }], navigation: undefined, theme: undefined } }`. Consumed by Task 2.

- [ ] **Step 1: Write the failing reducer tests**

In `client/src/context/configuratorReducer.test.js`, add this import after the existing `blockById` import (line 3):

```js
import { test, expect } from 'vitest'
import { configuratorReducer, ACTIONS } from './configuratorReducer.js'
import { blockById } from '../data/blockCatalog.js'
import { pageTemplateById } from '../data/pageTemplates.js'
```

Add this helper function after `makeState` (after line 30, before the first `test(...)` call):

```js
function collectIds(sections) {
  return sections.flatMap(s => [
    s.sectionId,
    ...s.columns.flatMap(c => [c.columnId, ...c.widgets.map(w => w.instanceId)]),
  ])
}
```

Add these three tests at the end of the file (after the last existing test, `'MOVE_PAGE dropping a page onto its own descendant returns the same state'`):

```js
test('APPLY_TEMPLATE replaces the active page sections and sets its title from the template', () => {
  const state = makeState()
  const template = pageTemplateById['communication-home']
  const next = configuratorReducer(state, {
    type: ACTIONS.APPLY_TEMPLATE,
    payload: { pages: [{ title: template.defaultPageTitle, sections: template.sections }] },
  })
  expect(next.pages[0].title).toEqual(template.defaultPageTitle)
  expect(next.pages[0].sections).toHaveLength(3)
  expect(next.pages[0].sections[0].columns).toHaveLength(2)
  expect(next.pages[0].sections[0].columns[0].widgets[0].blockId).toBe('news-corporate')
  expect(next.pages[0].sections[0].columns[0].widgets[0].props).toEqual(blockById['news-corporate'].defaultProps)
  expect(next.selectedWidgetInstanceId).toBeNull()
  expect(next.selectedSectionId).toBeNull()
})

test('APPLY_TEMPLATE mints fresh, disjoint ids on every application', () => {
  const state = makeState()
  const template = pageTemplateById['communication-home']
  const payload = { pages: [{ title: template.defaultPageTitle, sections: template.sections }] }
  const first = configuratorReducer(state, { type: ACTIONS.APPLY_TEMPLATE, payload })
  const second = configuratorReducer(first, { type: ACTIONS.APPLY_TEMPLATE, payload })

  const firstIds = collectIds(first.pages[0].sections)
  const secondIds = collectIds(second.pages[0].sections)
  expect(new Set([...firstIds, ...secondIds]).size).toBe(firstIds.length + secondIds.length)
})

test('APPLY_TEMPLATE with a multi-page or navigation/theme payload returns the same state (Phase 5b not implemented)', () => {
  const state = makeState()
  const template = pageTemplateById['communication-home']
  const single = { title: template.defaultPageTitle, sections: template.sections }

  const multiPage = configuratorReducer(state, {
    type: ACTIONS.APPLY_TEMPLATE,
    payload: { pages: [single, single] },
  })
  expect(multiPage).toBe(state)

  const withNavigation = configuratorReducer(state, {
    type: ACTIONS.APPLY_TEMPLATE,
    payload: { pages: [single], navigation: [] },
  })
  expect(withNavigation).toBe(state)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd client && npx vitest run src/context/configuratorReducer.test.js`

Expected: FAILS — `Cannot find module '../data/pageTemplates.js'` (the file doesn't exist yet).

- [ ] **Step 3: Create `pageTemplates.js`**

Create `client/src/data/pageTemplates.js`:

```js
export const PAGE_TEMPLATE_CATEGORIES = {
  COMMUNICATION: 'COMMUNICATION',
  HR: 'HR',
  ONBOARDING: 'ONBOARDING',
  EMPLOYEE_HUB: 'EMPLOYEE_HUB',
  LEARNING: 'LEARNING',
}

export const PAGE_TEMPLATES = [
  {
    id: 'communication-home',
    label: 'Homepage Comunicazione',
    category: PAGE_TEMPLATE_CATEGORIES.COMMUNICATION,
    icon: 'Newspaper',
    description: 'Una homepage di comunicazione con news, avvisi, eventi e galleria multimedia.',
    defaultPageTitle: { it: 'Comunicazione', en: 'Communication', fr: 'Communication', de: 'Kommunikation' },
    sections: [
      { layout: 'twoColumn', blocks: [['news-corporate'], ['avvisi-homepage']] },
      { layout: 'oneColumn', blocks: [['eventi-corporate']] },
      { layout: 'oneColumn', blocks: [['multimedia-gallery']] },
    ],
  },
  {
    id: 'hr-portal',
    label: 'Portale HR',
    category: PAGE_TEMPLATE_CATEGORIES.HR,
    icon: 'HeartHandshake',
    description: 'Una pagina HR con welfare, nuovi assunti, organigramma e FAQ.',
    defaultPageTitle: { it: 'Risorse Umane', en: 'Human Resources', fr: 'Ressources Humaines', de: 'Personalwesen' },
    sections: [
      { layout: 'twoColumn', blocks: [['sezione-welfare'], ['new-entry']] },
      { layout: 'oneColumn', blocks: [['organigramma']] },
      { layout: 'twoColumn', blocks: [['faq'], ['rubrica-colleghi']] },
    ],
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    category: PAGE_TEMPLATE_CATEGORIES.ONBOARDING,
    icon: 'UserPlus',
    description: 'Un percorso di onboarding con procedure, FAQ e organigramma.',
    defaultPageTitle: { it: 'Onboarding', en: 'Onboarding', fr: 'Intégration', de: 'Onboarding' },
    sections: [
      { layout: 'oneColumn', blocks: [['new-entry']] },
      { layout: 'twoColumn', blocks: [['procedure'], ['come-fare-per']] },
      { layout: 'oneColumn', blocks: [['faq']] },
      { layout: 'oneColumn', blocks: [['organigramma']] },
    ],
  },
  {
    id: 'employee-hub',
    label: 'Employee Hub',
    category: PAGE_TEMPLATE_CATEGORIES.EMPLOYEE_HUB,
    icon: 'Users',
    description: 'Un hub per i dipendenti con ricerca, rubrica, sondaggi e bacheca.',
    defaultPageTitle: { it: 'Employee Hub', en: 'Employee Hub', fr: 'Espace collaborateurs', de: 'Mitarbeiter-Hub' },
    sections: [
      { layout: 'twoColumn', blocks: [['motore-ricerca'], ['rubrica-colleghi']] },
      { layout: 'oneColumn', blocks: [['polls-survey']] },
      { layout: 'oneColumn', blocks: [['bacheca-scambio']] },
    ],
  },
  {
    id: 'training',
    label: 'Formazione',
    category: PAGE_TEMPLATE_CATEGORIES.LEARNING,
    icon: 'GraduationCap',
    description: 'Una pagina di formazione con presentazioni, procedure e FAQ.',
    defaultPageTitle: { it: 'Formazione', en: 'Training', fr: 'Formation', de: 'Schulung' },
    sections: [
      { layout: 'oneColumn', blocks: [['oggi-presentiamo']] },
      { layout: 'twoColumn', blocks: [['procedure'], ['come-fare-per']] },
      { layout: 'oneColumn', blocks: [['faq']] },
    ],
  },
]

export const pageTemplateById = Object.fromEntries(PAGE_TEMPLATES.map(t => [t.id, t]))
```

- [ ] **Step 4: Add `APPLY_TEMPLATE` to `ACTIONS` and the reducer**

In `client/src/context/configuratorReducer.js`, change the `ACTIONS` object (currently lines 9-28) from:

```js
export const ACTIONS = {
  ADD_WIDGET:           'ADD_WIDGET',
  REMOVE_WIDGET:        'REMOVE_WIDGET',
  REORDER_WIDGETS:      'REORDER_WIDGETS',
  MOVE_WIDGET:          'MOVE_WIDGET',
  SELECT_WIDGET:        'SELECT_WIDGET',
  DESELECT_WIDGET:      'DESELECT_WIDGET',
  UPDATE_WIDGET_PROP:   'UPDATE_WIDGET_PROP',
  ADD_SECTION:          'ADD_SECTION',
  REMOVE_SECTION:       'REMOVE_SECTION',
  CHANGE_SECTION_LAYOUT:'CHANGE_SECTION_LAYOUT',
  SELECT_SECTION:       'SELECT_SECTION',
  ADD_PAGE:             'ADD_PAGE',
  RENAME_PAGE:          'RENAME_PAGE',
  REMOVE_PAGE:          'REMOVE_PAGE',
  SELECT_PAGE:          'SELECT_PAGE',
  MOVE_PAGE:            'MOVE_PAGE',
  SET_TENANT_META:      'SET_TENANT_META',
  EXPORT_CONFIGURATION: 'EXPORT_CONFIGURATION',
}
```

to:

```js
export const ACTIONS = {
  ADD_WIDGET:           'ADD_WIDGET',
  REMOVE_WIDGET:        'REMOVE_WIDGET',
  REORDER_WIDGETS:      'REORDER_WIDGETS',
  MOVE_WIDGET:          'MOVE_WIDGET',
  SELECT_WIDGET:        'SELECT_WIDGET',
  DESELECT_WIDGET:      'DESELECT_WIDGET',
  UPDATE_WIDGET_PROP:   'UPDATE_WIDGET_PROP',
  ADD_SECTION:          'ADD_SECTION',
  REMOVE_SECTION:       'REMOVE_SECTION',
  CHANGE_SECTION_LAYOUT:'CHANGE_SECTION_LAYOUT',
  SELECT_SECTION:       'SELECT_SECTION',
  ADD_PAGE:             'ADD_PAGE',
  RENAME_PAGE:          'RENAME_PAGE',
  REMOVE_PAGE:          'REMOVE_PAGE',
  SELECT_PAGE:          'SELECT_PAGE',
  MOVE_PAGE:            'MOVE_PAGE',
  SET_TENANT_META:      'SET_TENANT_META',
  EXPORT_CONFIGURATION: 'EXPORT_CONFIGURATION',
  APPLY_TEMPLATE:       'APPLY_TEMPLATE',
}
```

Change the `EXPORT_CONFIGURATION` case (currently lines 307-311) from:

```js
    case ACTIONS.EXPORT_CONFIGURATION:
      return {
        ...state,
        tenantConfiguration: buildTenantExport(state.pages, state.tenantConfiguration),
      }
    default:
      return state
```

to:

```js
    case ACTIONS.EXPORT_CONFIGURATION:
      return {
        ...state,
        tenantConfiguration: buildTenantExport(state.pages, state.tenantConfiguration),
      }
    case ACTIONS.APPLY_TEMPLATE: {
      const { pages, navigation, theme } = action.payload
      if (pages.length !== 1 || navigation || theme) {
        // Phase 5b: multi-page site bundles with navigation/theme — not implemented yet.
        return state
      }
      const [{ title, sections }] = pages
      const newSections = sections.map(section => ({
        sectionId: crypto.randomUUID(),
        layout: section.layout,
        columns: section.blocks.map(columnBlocks => ({
          columnId: crypto.randomUUID(),
          widgets: columnBlocks.map(blockId => ({
            instanceId: crypto.randomUUID(),
            blockId,
            props: { ...blockById[blockId].defaultProps },
          })),
        })),
      }))
      return {
        ...updateActivePageSections(state, () => newSections),
        pages: state.pages.map(p => p.pageId === state.activePageId ? { ...p, title } : p),
        selectedWidgetInstanceId: null,
        selectedSectionId: null,
      }
    }
    default:
      return state
```

(`blockById` is already imported at the top of this file from the existing `ADD_WIDGET` case — no new import needed.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd client && npx vitest run src/context/configuratorReducer.test.js`

Expected: PASSES (`60 passed` — 57 pre-existing + 3 new).

- [ ] **Step 6: Run the full unit suite to check for regressions**

Run: `cd client && npx vitest run`

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add client/src/data/pageTemplates.js client/src/context/configuratorReducer.js client/src/context/configuratorReducer.test.js
git commit -m "feat: add page template catalog and APPLY_TEMPLATE reducer action"
```

---

### Task 2: Template gallery UI, confirmation dialog, and locale strings

**Files:**
- Create: `client/src/components/sidebar-left/ApplyTemplateDialog.jsx`
- Create: `client/src/components/sidebar-left/TemplateGallery.jsx`
- Modify: `client/src/components/sidebar-left/LeftSidebar.jsx`
- Modify: `client/src/locales/it.json`, `client/src/locales/en.json`, `client/src/locales/fr.json`, `client/src/locales/de.json`
- Modify: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: `PAGE_TEMPLATES`/`pageTemplateById` from Task 1's `client/src/data/pageTemplates.js`; `ACTIONS.APPLY_TEMPLATE` from Task 1's reducer; `useFocusTrap(containerRef, { active, onEscape })` from Phase 4's `client/src/hooks/useFocusTrap.js` (unmodified).
- Produces: `<ApplyTemplateDialog template onCancel onConfirm>` — a `role="dialog"` confirmation prompt. `<TemplateGallery>` — the 4th `LeftSidebar` tab's content, no props.

`ApplyTemplateDialog.jsx` is built before `TemplateGallery.jsx` in this task specifically so `TemplateGallery.jsx` can import a component that already exists — building them in the opposite order, or in separate tasks, would leave `TemplateGallery.jsx` importing a nonexistent module partway through.

- [ ] **Step 1: Write the failing e2e tests**

In `client/tests/smoke.spec.js`, add these six tests inside `test.describe('ShareFlow configurator smoke test', ...)`, immediately after the existing `test('canvas blocks can be reordered with the keyboard', ...)` test (which ends just before `test('Contenuto tab appears for content-enabled blocks ...')`):

```js
  test('Template tab renders the page template gallery', async ({ page }) => {
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await expect(page.getByText('Homepage Comunicazione', { exact: true })).toBeVisible()
    await expect(page.getByText('Portale HR', { exact: true })).toBeVisible()
    await expect(page.getByText('Onboarding', { exact: true })).toBeVisible()
    await expect(page.getByText('Employee Hub', { exact: true })).toBeVisible()
    await expect(page.getByText('Formazione', { exact: true })).toBeVisible()
  })

  test('applying a template to the default empty Home page scaffolds it immediately', async ({ page }) => {
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByText('Homepage Comunicazione', { exact: true }).click()

    await expect(page.locator('main').getByText('News - Corporate', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('Avvisi in home page', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('Eventi - Corporate', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('Galleria multimediale', { exact: true })).toBeVisible()
  })

  test('applying a template to a non-empty page opens a confirmation dialog; cancelling leaves it untouched', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByText('Portale HR', { exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Annulla', exact: true }).click()
    await expect(dialog).not.toBeVisible()

    await expect(page.locator('main').getByText('News - Corporate', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('Sezione Welfare', { exact: true })).not.toBeVisible()
  })

  test('Escape also cancels the template confirmation dialog', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByText('Portale HR', { exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(page.locator('main').getByText('News - Corporate', { exact: true })).toBeVisible()
  })

  test('confirming the dialog applies the template, replacing existing content', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByText('Portale HR', { exact: true }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Conferma', exact: true }).click()
    await expect(dialog).not.toBeVisible()

    await expect(page.locator('main').getByText('News - Corporate', { exact: true })).not.toBeVisible()
    await expect(page.locator('main').getByText('Sezione Welfare', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('New entry', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByText('Organigramma', { exact: true })).toBeVisible()
  })

  test('Template tab and its confirmation dialog have no in-scope accessibility violations', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    await page.getByRole('button', { name: 'Template', exact: true }).click()

    const galleryResults = await new AxeBuilder({ page }).disableRules(OUT_OF_SCOPE_AXE_RULES).analyze()
    expect(galleryResults.violations).toEqual([])

    await page.getByText('Portale HR', { exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const dialogResults = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
    expect(dialogResults.violations).toEqual([])
  })

```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd client && npx playwright test -g "Template tab|template to the default|template to a non-empty|cancels the template|confirming the dialog"`

Expected: all FAIL — `page.getByRole('button', { name: 'Template', exact: true })` finds nothing yet (no 4th tab exists).

- [ ] **Step 3: Add the `templates` locale namespace to all four locale files**

In `client/src/locales/it.json`, change the end of the `blocks` block (currently lines 65-67) from:

```json
      "desc-funzione": "Sezione descrittiva Funzione"
    }
  },
  "canvas": {
```

to:

```json
      "desc-funzione": "Sezione descrittiva Funzione"
    }
  },
  "templates": {
    "tabLabel": "Template",
    "confirmTitle": "Applica template",
    "confirmBody": "Applicare '{{name}}'? Sostituirà il contenuto attuale della pagina.",
    "confirmApply": "Conferma",
    "confirmCancel": "Annulla",
    "categories": {
      "COMMUNICATION": "Comunicazione",
      "HR": "Risorse Umane",
      "ONBOARDING": "Onboarding",
      "EMPLOYEE_HUB": "Employee Hub",
      "LEARNING": "Formazione"
    },
    "labels": {
      "communication-home": "Homepage Comunicazione",
      "hr-portal": "Portale HR",
      "onboarding": "Onboarding",
      "employee-hub": "Employee Hub",
      "training": "Formazione"
    },
    "descriptions": {
      "communication-home": "Una homepage di comunicazione con news, avvisi, eventi e galleria multimedia.",
      "hr-portal": "Una pagina HR con welfare, nuovi assunti, organigramma e FAQ.",
      "onboarding": "Un percorso di onboarding con procedure, FAQ e organigramma.",
      "employee-hub": "Un hub per i dipendenti con ricerca, rubrica, sondaggi e bacheca.",
      "training": "Una pagina di formazione con presentazioni, procedure e FAQ."
    }
  },
  "canvas": {
```

In `client/src/locales/en.json`, change the same location (the end of `blocks`, before `canvas`) from:

```json
      "desc-funzione": "Function Description"
    }
  },
  "canvas": {
```

to:

```json
      "desc-funzione": "Function Description"
    }
  },
  "templates": {
    "tabLabel": "Templates",
    "confirmTitle": "Apply template",
    "confirmBody": "Apply '{{name}}'? This will replace the page's current content.",
    "confirmApply": "Confirm",
    "confirmCancel": "Cancel",
    "categories": {
      "COMMUNICATION": "Communication",
      "HR": "HR",
      "ONBOARDING": "Onboarding",
      "EMPLOYEE_HUB": "Employee Hub",
      "LEARNING": "Training"
    },
    "labels": {
      "communication-home": "Communication Homepage",
      "hr-portal": "HR Portal",
      "onboarding": "Onboarding",
      "employee-hub": "Employee Hub",
      "training": "Training"
    },
    "descriptions": {
      "communication-home": "A communication homepage with news, announcements, events and a media gallery.",
      "hr-portal": "An HR page with welfare, new hires, org chart and FAQ.",
      "onboarding": "An onboarding journey with procedures, FAQ and org chart.",
      "employee-hub": "An employee hub with search, directory, polls and a swap board.",
      "training": "A training page with spotlights, procedures and FAQ."
    }
  },
  "canvas": {
```

In `client/src/locales/fr.json`, change the same location from:

```json
      "desc-funzione": "Description fonction"
    }
  },
  "canvas": {
```

to:

```json
      "desc-funzione": "Description fonction"
    }
  },
  "templates": {
    "tabLabel": "Modèles",
    "confirmTitle": "Appliquer le modèle",
    "confirmBody": "Appliquer « {{name}} » ? Cela remplacera le contenu actuel de la page.",
    "confirmApply": "Confirmer",
    "confirmCancel": "Annuler",
    "categories": {
      "COMMUNICATION": "Communication",
      "HR": "RH",
      "ONBOARDING": "Intégration",
      "EMPLOYEE_HUB": "Espace collaborateurs",
      "LEARNING": "Formation"
    },
    "labels": {
      "communication-home": "Page d'accueil Communication",
      "hr-portal": "Portail RH",
      "onboarding": "Intégration",
      "employee-hub": "Espace collaborateurs",
      "training": "Formation"
    },
    "descriptions": {
      "communication-home": "Une page d'accueil de communication avec actualités, annonces, événements et une galerie multimédia.",
      "hr-portal": "Une page RH avec bien-être, nouvelles arrivées, organigramme et FAQ.",
      "onboarding": "Un parcours d'intégration avec procédures, FAQ et organigramme.",
      "employee-hub": "Un espace collaborateurs avec recherche, annuaire, sondages et petites annonces.",
      "training": "Une page de formation avec mises en avant, procédures et FAQ."
    }
  },
  "canvas": {
```

In `client/src/locales/de.json`, change the same location from:

```json
      "desc-funzione": "Abteilungsbeschreibung"
    }
  },
  "canvas": {
```

to:

```json
      "desc-funzione": "Abteilungsbeschreibung"
    }
  },
  "templates": {
    "tabLabel": "Vorlagen",
    "confirmTitle": "Vorlage anwenden",
    "confirmBody": "'{{name}}' anwenden? Dies ersetzt den aktuellen Inhalt der Seite.",
    "confirmApply": "Bestätigen",
    "confirmCancel": "Abbrechen",
    "categories": {
      "COMMUNICATION": "Kommunikation",
      "HR": "Personalwesen",
      "ONBOARDING": "Onboarding",
      "EMPLOYEE_HUB": "Mitarbeiter-Hub",
      "LEARNING": "Schulung"
    },
    "labels": {
      "communication-home": "Kommunikations-Startseite",
      "hr-portal": "HR-Portal",
      "onboarding": "Onboarding",
      "employee-hub": "Mitarbeiter-Hub",
      "training": "Schulung"
    },
    "descriptions": {
      "communication-home": "Eine Kommunikations-Startseite mit News, Ankündigungen, Terminen und einer Mediengalerie.",
      "hr-portal": "Eine HR-Seite mit Sozialleistungen, Neueinstellungen, Organigramm und FAQ.",
      "onboarding": "Ein Onboarding-Pfad mit Verfahren, FAQ und Organigramm.",
      "employee-hub": "Ein Mitarbeiter-Hub mit Suche, Verzeichnis, Umfragen und Tauschbörse.",
      "training": "Eine Schulungsseite mit Vorstellungen, Verfahren und FAQ."
    }
  },
  "canvas": {
```

- [ ] **Step 4: Create `ApplyTemplateDialog.jsx`**

Create `client/src/components/sidebar-left/ApplyTemplateDialog.jsx`:

```jsx
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'

export default function ApplyTemplateDialog({ template, onCancel, onConfirm }) {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef, { active: true, onEscape: onCancel })

  const label = t(`templates.labels.${template.id}`, { defaultValue: template.label })

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="apply-template-title" className="bg-slate rounded-2xl border border-slate-mid w-full max-w-sm shadow-2xl p-5">
        <h2 id="apply-template-title" className="text-white font-semibold mb-2">{t('templates.confirmTitle')}</h2>
        <p className="text-sm text-slate-light mb-4">{t('templates.confirmBody', { name: label })}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-slate-light hover:text-white transition-colors">
            {t('templates.confirmCancel')}
          </button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-sm bg-blue-electric text-navy font-semibold rounded-lg hover:bg-blue transition-colors">
            {t('templates.confirmApply')}
          </button>
        </div>
      </div>
    </div>
  )
}
```

(This mirrors `client/src/components/deploy/DeployModal.jsx`'s exact dialog wrapper pattern: same outer `fixed inset-0` overlay classes, same `useFocusTrap` usage with `active: true` and `onEscape` wired to the cancel handler, same `role="dialog"`/`aria-modal`/`aria-labelledby` triple.)

- [ ] **Step 5: Create `TemplateGallery.jsx`**

Create `client/src/components/sidebar-left/TemplateGallery.jsx`:

```jsx
import * as icons from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { PAGE_TEMPLATES } from '../../data/pageTemplates.js'
import ApplyTemplateDialog from './ApplyTemplateDialog.jsx'

function isPageEmpty(page) {
  return page.sections.every(section => section.columns.every(column => column.widgets.length === 0))
}

export default function TemplateGallery() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { t } = useTranslation()
  const [pendingTemplate, setPendingTemplate] = useState(null)

  function applyTemplate(template) {
    dispatch({
      type: ACTIONS.APPLY_TEMPLATE,
      payload: { pages: [{ title: template.defaultPageTitle, sections: template.sections }] },
    })
  }

  function handleSelect(template) {
    const activePage = state.pages.find(p => p.pageId === state.activePageId)
    if (isPageEmpty(activePage)) {
      applyTemplate(template)
    } else {
      setPendingTemplate(template)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {PAGE_TEMPLATES.map(template => {
          const Icon = icons[template.icon] ?? icons.Box
          return (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className="flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left bg-slate-mid border-slate-mid hover:border-blue-electric hover:bg-navy-light transition-all"
            >
              <Icon size={20} className="text-blue-electric flex-shrink-0" />
              <span className="text-xs font-semibold text-white">
                {t(`templates.labels.${template.id}`, { defaultValue: template.label })}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-light">
                {t(`templates.categories.${template.category}`, { defaultValue: template.category })}
              </span>
              <span className="text-xs text-slate-light leading-tight">
                {t(`templates.descriptions.${template.id}`, { defaultValue: template.description })}
              </span>
            </button>
          )
        })}
      </div>
      {pendingTemplate && (
        <ApplyTemplateDialog
          template={pendingTemplate}
          onCancel={() => setPendingTemplate(null)}
          onConfirm={() => {
            applyTemplate(pendingTemplate)
            setPendingTemplate(null)
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 6: Wire the 4th tab into `LeftSidebar.jsx`**

Replace the full content of `client/src/components/sidebar-left/LeftSidebar.jsx` with:

```jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import BlockLibrary from './BlockLibrary.jsx'
import PagesPanel from './PagesPanel.jsx'
import AppearancePanel from './AppearancePanel.jsx'
import TemplateGallery from './TemplateGallery.jsx'

export default function LeftSidebar() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('blocks')

  const TABS = [
    { id: 'blocks', label: 'Blocchi' },
    { id: 'pages', label: 'Pagine' },
    { id: 'appearance', label: 'Aspetto' },
    { id: 'templates', label: t('templates.tabLabel') },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-mid flex-shrink-0">
        {TABS.map(tabItem => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2
              ${tab === tabItem.id ? 'text-blue-electric border-blue-electric' : 'text-slate-light border-transparent hover:text-white'}`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'blocks' && <BlockLibrary />}
        {tab === 'pages' && <PagesPanel />}
        {tab === 'appearance' && <AppearancePanel />}
        {tab === 'templates' && <TemplateGallery />}
      </div>
    </div>
  )
}
```

Note the `TABS` array moves from module scope into the component body (it needs `t()`, which only exists inside the component), and the array's `.map()` callback parameter is renamed from `t` to `tabItem` — the original code used `t` as the loop variable, which would otherwise shadow `useTranslation()`'s `t` and silently break every `t(...)` call below it.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd client && npx playwright test -g "Template tab|template to the default|template to a non-empty|cancels the template|confirming the dialog"`

Expected: all PASS (`6 passed`).

- [ ] **Step 8: Run the full e2e and unit suites to check for regressions**

Run: `cd client && npx playwright test && npx vitest run`

Expected: all pass. In particular, confirm `'Aspetto tab shows the template gallery'` (an existing, unrelated test about visual theme templates) still passes — its name is similar to this task's feature but it tests a different screen (`appearance.template` = "Modello"), unaffected by this change.

- [ ] **Step 9: Commit**

```bash
git add client/src/components/sidebar-left/ApplyTemplateDialog.jsx client/src/components/sidebar-left/TemplateGallery.jsx client/src/components/sidebar-left/LeftSidebar.jsx client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json client/tests/smoke.spec.js
git commit -m "feat: add page template gallery and apply-confirmation dialog"
```

---

## Final check

After Task 2, run both suites once more from `client/`:

```bash
npx vitest run
npx playwright test
```

Expected: all Vitest tests pass (57 pre-existing + 3 new = 60), all Playwright tests pass (31 pre-existing + 6 new = 37).
