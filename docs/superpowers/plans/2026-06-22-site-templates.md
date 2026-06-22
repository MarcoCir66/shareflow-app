# Site Templates (Phase 5b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user provision an entire site in one click from a gallery of 5 site bundles, each combining 2 of Phase 5a's existing page templates into a page hierarchy plus a visual theme, applied as a single atomic action that replaces the whole site.

**Architecture:** A new static catalog (`siteTemplates.js`) composes existing page templates by reference (`pageTemplateId` + `parentIndex`, no content duplication). The `APPLY_TEMPLATE` reducer action gains a multi-page branch that mints fresh ids for every page/section/column/widget, resolves `parentIndex` into real `parentId` values, and replaces `tenantConfiguration.theme` wholesale when a theme is given. Page navigation requires no new code: it is already the page hierarchy (`parentId`), already rendered live by `CanvasTopNav.jsx`/`MegaMenuPanel.jsx`. `TemplateGallery.jsx` gains a Pagina/Sito mode toggle; `ApplyTemplateDialog.jsx` gains a `kind` prop selecting page- vs. site-specific copy.

**Tech Stack:** React 19, the existing `configuratorReducer.js`/`useConfigurator()` state management, `lucide-react` icons, i18next/react-i18next, Vitest, Playwright + `@axe-core/playwright`.

## Global Constraints

- No changes to `blockCatalog.js`, `sectionLayouts.js`, `themeTemplates.js`, or `pageTemplates.js` — this feature composes them, it does not modify them.
- The `APPLY_TEMPLATE` payload is `{ pages: Page[], theme? }` — no `navigation` field. Page navigation is already the `parentId` hierarchy; it needs no new representation.
- A site bundle never stores any real `pageId`/`sectionId`/`columnId`/`instanceId` — `pageId` is minted fresh per page at apply time (`crypto.randomUUID()`), and each page's `sections` are expanded fresh via the same `expandTemplateSections` helper Phase 5a's single-page branch uses.
- Applying a multi-page payload **replaces every existing page** — it is never a merge/append.
- When a `theme` is given, it **replaces** `tenantConfiguration.theme` wholesale (not a field-by-field merge) — a previously-customized `accentColor` must not survive under a different bundle's theme.
- Slugs for newly-minted pages are built via the existing `uniqueSlug(pages, baseSlug, excludePageId = null)` / `slugify(title)` helpers from `client/src/context/pageHelpers.js`, already imported in `configuratorReducer.js`.
- All new e2e tests go in `client/tests/smoke.spec.js`, using its existing `test.beforeEach` (sets `i18nextLng` to `'it'`) and selector conventions (`getByRole`, `getByText`, scoped `.locator('main')`).
- Axe-core scans not scoped via `.include(selector)` use the existing `OUT_OF_SCOPE_AXE_RULES` constant via `.disableRules(...)`.
- Run `npx vitest run` and `npx playwright test` from `client/` for verification.

---

### Task 1: `siteTemplates.js` catalog and the `APPLY_TEMPLATE` multi-page reducer branch

**Files:**
- Create: `client/src/data/siteTemplates.js`
- Modify: `client/src/context/configuratorReducer.js`
- Modify: `client/src/context/configuratorReducer.test.js`

**Interfaces:**
- Produces: `SITE_TEMPLATES` (array of 5 entries: `{ id, label, category, icon, description, themeId, pages: [{ pageTemplateId, parentIndex }] }`), `siteTemplateById` (object keyed by `id`) — from `client/src/data/siteTemplates.js`. Consumed by Task 2's `TemplateGallery.jsx`.
- Consumes: `pageTemplateById`, `PAGE_TEMPLATE_CATEGORIES` from Phase 5a's `client/src/data/pageTemplates.js` (already exist, unchanged).
- Produces: the reducer's multi-page `APPLY_TEMPLATE` branch, dispatched as `{ type: ACTIONS.APPLY_TEMPLATE, payload: { pages: [{ title, sections, parentIndex }, ...], theme?: { templateId, accentColor } } }`. Consumed by Task 2.

- [ ] **Step 1: Write the failing reducer tests**

In `client/src/context/configuratorReducer.test.js`, add this import after the existing `pageTemplateById` import (line 4):

```js
import { siteTemplateById } from '../data/siteTemplates.js'
```

Replace the existing test `'APPLY_TEMPLATE with a multi-page or navigation/theme payload returns the same state (Phase 5b not implemented)'` (currently the last test in the file, lines 419-435) — its premise is now false, since this task makes multi-page payloads work — with:

```js
test('APPLY_TEMPLATE with an empty pages array returns the same state', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.APPLY_TEMPLATE, payload: { pages: [] } })
  expect(next).toBe(state)
})

test('APPLY_TEMPLATE with a multi-page payload replaces the entire site and resolves parentIndex into real parentId', () => {
  const state = makeState()
  const bundle = siteTemplateById['hr-site']
  const pages = bundle.pages.map(({ pageTemplateId, parentIndex }) => ({
    title: pageTemplateById[pageTemplateId].defaultPageTitle,
    sections: pageTemplateById[pageTemplateId].sections,
    parentIndex,
  }))
  const next = configuratorReducer(state, { type: ACTIONS.APPLY_TEMPLATE, payload: { pages } })

  expect(next.pages).toHaveLength(2)
  expect(next.pages[0].parentId).toBeNull()
  expect(next.pages[1].parentId).toBe(next.pages[0].pageId)
  expect(next.activePageId).toBe(next.pages[0].pageId)
  expect(next.pages[0].title).toEqual(pageTemplateById['hr-portal'].defaultPageTitle)
  expect(next.pages[1].title).toEqual(pageTemplateById['onboarding'].defaultPageTitle)
})

test('APPLY_TEMPLATE with a multi-page payload and a theme replaces tenantConfiguration.theme wholesale', () => {
  const state = makeState({
    tenantConfiguration: {
      tenantId: null,
      siteName: { it: 'Test', en: 'Test', fr: 'Test', de: 'Test' },
      siteUrl: '',
      widgets: [],
      theme: { templateId: 'corporate-classic', accentColor: '#ff0000' },
    },
  })
  const bundle = siteTemplateById['hr-site']
  const pages = bundle.pages.map(({ pageTemplateId, parentIndex }) => ({
    title: pageTemplateById[pageTemplateId].defaultPageTitle,
    sections: pageTemplateById[pageTemplateId].sections,
    parentIndex,
  }))
  const next = configuratorReducer(state, {
    type: ACTIONS.APPLY_TEMPLATE,
    payload: { pages, theme: { templateId: bundle.themeId, accentColor: null } },
  })
  expect(next.tenantConfiguration.theme).toEqual({ templateId: 'modern-light', accentColor: null })
})

test('APPLY_TEMPLATE with multi-page payloads mints fully disjoint ids across applications', () => {
  const state = makeState()
  const toPages = (bundleId) => {
    const bundle = siteTemplateById[bundleId]
    return bundle.pages.map(({ pageTemplateId, parentIndex }) => ({
      title: pageTemplateById[pageTemplateId].defaultPageTitle,
      sections: pageTemplateById[pageTemplateId].sections,
      parentIndex,
    }))
  }
  const first = configuratorReducer(state, { type: ACTIONS.APPLY_TEMPLATE, payload: { pages: toPages('hr-site') } })
  const second = configuratorReducer(first, { type: ACTIONS.APPLY_TEMPLATE, payload: { pages: toPages('onboarding-site') } })

  const firstIds = [...first.pages.map(p => p.pageId), ...collectIds(first.pages.flatMap(p => p.sections))]
  const secondIds = [...second.pages.map(p => p.pageId), ...collectIds(second.pages.flatMap(p => p.sections))]
  expect(new Set([...firstIds, ...secondIds]).size).toBe(firstIds.length + secondIds.length)
})

test('APPLY_TEMPLATE with a single-page payload only replaces the active page when the site has multiple pages', () => {
  const state = makeState({
    pages: [
      { pageId: 'page-home', title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, slug: 'home', parentId: null, sections: [] },
      { pageId: 'page-about', title: { it: 'About', en: 'About', fr: 'About', de: 'About' }, slug: 'about', parentId: null, sections: [] },
    ],
    activePageId: 'page-about',
  })
  const template = pageTemplateById['communication-home']
  const next = configuratorReducer(state, {
    type: ACTIONS.APPLY_TEMPLATE,
    payload: { pages: [{ title: template.defaultPageTitle, sections: template.sections }] },
  })
  expect(next.pages).toHaveLength(2)
  expect(next.pages[0]).toEqual(state.pages[0])
  expect(next.pages[1].title).toEqual(template.defaultPageTitle)
})

test('APPLY_TEMPLATE with a multi-page payload gives each new page a distinct slug', () => {
  const state = makeState()
  const bundle = siteTemplateById['hr-site']
  const pages = bundle.pages.map(({ pageTemplateId, parentIndex }) => ({
    title: pageTemplateById[pageTemplateId].defaultPageTitle,
    sections: pageTemplateById[pageTemplateId].sections,
    parentIndex,
  }))
  const next = configuratorReducer(state, { type: ACTIONS.APPLY_TEMPLATE, payload: { pages } })
  const slugs = next.pages.map(p => p.slug)
  expect(new Set(slugs).size).toBe(slugs.length)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd client && npx vitest run src/context/configuratorReducer.test.js`

Expected: FAILS — `Cannot find module '../data/siteTemplates.js'` (the file doesn't exist yet), and the replaced test's old assertions are gone so there's nothing to fail on for it specifically, but the new tests fail to even load.

- [ ] **Step 3: Create `siteTemplates.js`**

Create `client/src/data/siteTemplates.js`:

```js
import { PAGE_TEMPLATE_CATEGORIES } from './pageTemplates.js'

export const SITE_TEMPLATES = [
  {
    id: 'communication-site',
    label: 'Comunicazione Corporate',
    category: PAGE_TEMPLATE_CATEGORIES.COMMUNICATION,
    icon: 'Newspaper',
    description: 'Un sito di comunicazione corporate con homepage news e una sezione formazione collegata.',
    themeId: 'corporate-classic',
    pages: [
      { pageTemplateId: 'communication-home', parentIndex: null },
      { pageTemplateId: 'training', parentIndex: 0 },
    ],
  },
  {
    id: 'hr-site',
    label: 'Portale HR',
    category: PAGE_TEMPLATE_CATEGORIES.HR,
    icon: 'HeartHandshake',
    description: 'Un sito HR con portale risorse umane e percorso di onboarding collegato.',
    themeId: 'modern-light',
    pages: [
      { pageTemplateId: 'hr-portal', parentIndex: null },
      { pageTemplateId: 'onboarding', parentIndex: 0 },
    ],
  },
  {
    id: 'onboarding-site',
    label: 'Percorso Onboarding',
    category: PAGE_TEMPLATE_CATEGORIES.ONBOARDING,
    icon: 'UserPlus',
    description: 'Un sito di onboarding con percorso guidato e portale HR collegato.',
    themeId: 'vibrant-color',
    pages: [
      { pageTemplateId: 'onboarding', parentIndex: null },
      { pageTemplateId: 'hr-portal', parentIndex: 0 },
    ],
  },
  {
    id: 'employee-hub-site',
    label: 'Employee Hub',
    category: PAGE_TEMPLATE_CATEGORIES.EMPLOYEE_HUB,
    icon: 'Users',
    description: 'Un sito hub dipendenti con ricerca, rubrica e una sezione comunicazione collegata.',
    themeId: 'dark-glass',
    pages: [
      { pageTemplateId: 'employee-hub', parentIndex: null },
      { pageTemplateId: 'communication-home', parentIndex: 0 },
    ],
  },
  {
    id: 'training-site',
    label: 'Centro Formazione',
    category: PAGE_TEMPLATE_CATEGORIES.LEARNING,
    icon: 'GraduationCap',
    description: 'Un sito di formazione con un percorso di onboarding collegato.',
    themeId: 'vibrant-color',
    pages: [
      { pageTemplateId: 'training', parentIndex: null },
      { pageTemplateId: 'onboarding', parentIndex: 0 },
    ],
  },
]

export const siteTemplateById = Object.fromEntries(SITE_TEMPLATES.map(t => [t.id, t]))
```

- [ ] **Step 4: Implement the multi-page `APPLY_TEMPLATE` branch in the reducer**

In `client/src/context/configuratorReducer.js`, add this helper function right after `updateActivePageSections` (after its closing brace, currently line 46, before `export const initialState` on line 48):

```js
function expandTemplateSections(sections) {
  return sections.map(section => ({
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
}
```

Replace the current `ACTIONS.APPLY_TEMPLATE` case (currently lines 313-338) from:

```js
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
        ...state,
        pages: state.pages.map(p => p.pageId === state.activePageId ? { ...p, title, sections: newSections } : p),
        selectedWidgetInstanceId: null,
        selectedSectionId: null,
      }
    }
```

to:

```js
    case ACTIONS.APPLY_TEMPLATE: {
      const { pages, theme } = action.payload
      if (pages.length === 0) return state

      if (pages.length === 1) {
        const [{ title, sections }] = pages
        return {
          ...state,
          pages: state.pages.map(p =>
            p.pageId === state.activePageId ? { ...p, title, sections: expandTemplateSections(sections) } : p
          ),
          selectedWidgetInstanceId: null,
          selectedSectionId: null,
        }
      }

      // Phase 5b: multi-page site bundle — replaces the entire site.
      const pageIds = pages.map(() => crypto.randomUUID())
      const newPages = pages.reduce((acc, { title, sections, parentIndex }, i) => {
        const baseTitle = title.it ?? Object.values(title)[0]
        acc.push({
          pageId: pageIds[i],
          title,
          slug: uniqueSlug(acc, slugify(baseTitle)),
          parentId: parentIndex == null ? null : pageIds[parentIndex],
          sections: expandTemplateSections(sections),
        })
        return acc
      }, [])

      return {
        ...state,
        pages: newPages,
        activePageId: pageIds[pages.findIndex(p => p.parentIndex == null)],
        tenantConfiguration: theme
          ? { ...state.tenantConfiguration, theme }
          : state.tenantConfiguration,
        selectedWidgetInstanceId: null,
        selectedSectionId: null,
      }
    }
```

(`slugify`/`uniqueSlug` are already imported at the top of this file from `./pageHelpers.js` — no new import needed.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd client && npx vitest run src/context/configuratorReducer.test.js`

Expected: PASSES (60 pre-existing minus the 1 replaced test, plus 6 new = 65).

- [ ] **Step 6: Run the full unit suite to check for regressions**

Run: `cd client && npx vitest run`

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add client/src/data/siteTemplates.js client/src/context/configuratorReducer.js client/src/context/configuratorReducer.test.js
git commit -m "feat: add site template catalog and multi-page APPLY_TEMPLATE branch"
```

---

### Task 2: Pagina/Sito gallery toggle, site-aware confirmation dialog, and locale strings

**Files:**
- Modify: `client/src/components/sidebar-left/TemplateGallery.jsx`
- Modify: `client/src/components/sidebar-left/ApplyTemplateDialog.jsx`
- Modify: `client/src/locales/it.json`, `client/src/locales/en.json`, `client/src/locales/fr.json`, `client/src/locales/de.json`
- Modify: `client/tests/smoke.spec.js`

**Interfaces:**
- Consumes: `SITE_TEMPLATES`, `siteTemplateById` from Task 1's `client/src/data/siteTemplates.js`; `pageTemplateById` from Phase 5a's `client/src/data/pageTemplates.js` (already imported by `TemplateGallery.jsx`'s sibling files; this task adds the import to `TemplateGallery.jsx` itself); `ACTIONS.APPLY_TEMPLATE` from Task 1's reducer.
- Produces: `<ApplyTemplateDialog template kind onCancel onConfirm>` — `kind` is `'page' | 'site'` (default `'page'`), selecting which locale keys to read. `TemplateGallery`'s Pagina/Sito toggle is internal UI state, no new exported interface.

- [ ] **Step 1: Write the failing e2e tests**

In `client/tests/smoke.spec.js`, add these six tests immediately after the existing `test('Template tab and its confirmation dialog have no in-scope accessibility violations', ...)` test (which ends at line 325), immediately before `test('Contenuto tab appears for content-enabled blocks ...')` (line 327):

```js
  test('Sito mode in the Template tab renders the site bundle gallery', async ({ page }) => {
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByRole('button', { name: 'Sito', exact: true }).click()
    await expect(page.getByText('Comunicazione Corporate', { exact: true })).toBeVisible()
    await expect(page.getByText('Portale HR', { exact: true })).toBeVisible()
    await expect(page.getByText('Percorso Onboarding', { exact: true })).toBeVisible()
    await expect(page.getByText('Employee Hub', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Centro Formazione', { exact: true })).toBeVisible()
  })

  test('applying a site bundle to the pristine default site scaffolds the whole site immediately', async ({ page }) => {
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByRole('button', { name: 'Sito', exact: true }).click()
    await page.getByText('Portale HR', { exact: true }).click()

    const canvas = page.locator('main')
    await expect(canvas.getByText('SharePoint Communication Site — Risorse Umane')).toBeVisible()
    const rootTab = canvas.getByRole('button', { name: 'Risorse Umane', exact: true })
    await expect(rootTab).toBeVisible()
    await expect(rootTab.locator('svg')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Onboarding', exact: true })).toBeVisible()
    await expect(page.locator('main nav').locator('..')).toHaveClass(/bg-white/)
  })

  test('applying a site bundle to a non-empty site opens a confirmation dialog; cancelling leaves it untouched', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByRole('button', { name: 'Sito', exact: true }).click()
    await page.getByText('Portale HR', { exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText("Sostituire l'intero sito con 'Portale HR'?")
    await dialog.getByRole('button', { name: 'Annulla', exact: true }).click()
    await expect(dialog).not.toBeVisible()

    await expect(page.locator('main').getByText('News - Corporate', { exact: true })).toBeVisible()
    await expect(page.locator('main').getByRole('button', { name: 'Risorse Umane', exact: true })).not.toBeVisible()
  })

  test('Escape also cancels the site bundle confirmation dialog', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByRole('button', { name: 'Sito', exact: true }).click()
    await page.getByText('Portale HR', { exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(page.locator('main').getByText('News - Corporate', { exact: true })).toBeVisible()
  })

  test('confirming the site bundle dialog replaces the entire site, including the theme', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByRole('button', { name: 'Sito', exact: true }).click()
    await page.getByText('Portale HR', { exact: true }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Conferma', exact: true }).click()
    await expect(dialog).not.toBeVisible()

    const canvas = page.locator('main')
    await expect(canvas.getByText('News - Corporate', { exact: true })).not.toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Risorse Umane', exact: true })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Onboarding', exact: true })).toBeVisible()
    await expect(page.locator('main nav').locator('..')).toHaveClass(/bg-white/)
  })

  test('Sito mode and its confirmation dialog have no in-scope accessibility violations', async ({ page }) => {
    await page.getByText('News - Corporate', { exact: true }).click()
    await page.getByRole('button', { name: 'Template', exact: true }).click()
    await page.getByRole('button', { name: 'Sito', exact: true }).click()

    const galleryResults = await new AxeBuilder({ page }).disableRules(OUT_OF_SCOPE_AXE_RULES).analyze()
    expect(galleryResults.violations).toEqual([])

    await page.getByText('Portale HR', { exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const dialogResults = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
    expect(dialogResults.violations).toEqual([])
  })

```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd client && npx playwright test -g "Sito mode|site bundle"`

Expected: all FAIL — `page.getByRole('button', { name: 'Sito', exact: true })` finds nothing yet (no toggle exists).

- [ ] **Step 3: Add the new `templates` locale keys to all four locale files**

In `client/src/locales/it.json`, change the `templates` block (currently lines 68-95) from:

```json
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
```

to:

```json
  "templates": {
    "tabLabel": "Template",
    "modePage": "Pagina",
    "modeSite": "Sito",
    "confirmTitle": "Applica template",
    "confirmBody": "Applicare '{{name}}'? Sostituirà il contenuto attuale della pagina.",
    "confirmBodySite": "Sostituire l'intero sito con '{{name}}'? Tutte le pagine attuali verranno eliminate e sostituite, e il tema cambierà. Questa azione non può essere annullata.",
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
    },
    "siteLabels": {
      "communication-site": "Comunicazione Corporate",
      "hr-site": "Portale HR",
      "onboarding-site": "Percorso Onboarding",
      "employee-hub-site": "Employee Hub",
      "training-site": "Centro Formazione"
    },
    "siteDescriptions": {
      "communication-site": "Un sito di comunicazione corporate con homepage news e una sezione formazione collegata.",
      "hr-site": "Un sito HR con portale risorse umane e percorso di onboarding collegato.",
      "onboarding-site": "Un sito di onboarding con percorso guidato e portale HR collegato.",
      "employee-hub-site": "Un sito hub dipendenti con ricerca, rubrica e una sezione comunicazione collegata.",
      "training-site": "Un sito di formazione con un percorso di onboarding collegato."
    }
  },
```

In `client/src/locales/en.json`, change the `templates` block's matching lines the same way, with this content for the new/changed keys (the `tabLabel`/`confirmBody`/`confirmApply`/`confirmCancel`/`categories`/`labels`/`descriptions` keys stay exactly as they already are):

```json
    "modePage": "Page",
    "modeSite": "Site",
    "confirmBodySite": "Replace the entire site with '{{name}}'? All current pages will be deleted and replaced, and the theme will change. This action cannot be undone.",
```
```json
    "siteLabels": {
      "communication-site": "Corporate Communication",
      "hr-site": "HR Portal",
      "onboarding-site": "Onboarding Journey",
      "employee-hub-site": "Employee Hub",
      "training-site": "Training Center"
    },
    "siteDescriptions": {
      "communication-site": "A corporate communication site with a news homepage and a linked training section.",
      "hr-site": "An HR site with an HR portal and a linked onboarding journey.",
      "onboarding-site": "An onboarding site with a guided journey and a linked HR portal.",
      "employee-hub-site": "An employee hub site with search, directory and a linked communication section.",
      "training-site": "A training site with a linked onboarding journey."
    }
```

In `client/src/locales/fr.json`:

```json
    "modePage": "Page",
    "modeSite": "Site",
    "confirmBodySite": "Remplacer tout le site par « {{name}} » ? Toutes les pages actuelles seront supprimées et remplacées, et le thème changera. Cette action est irréversible.",
```
```json
    "siteLabels": {
      "communication-site": "Communication Corporate",
      "hr-site": "Portail RH",
      "onboarding-site": "Parcours d'intégration",
      "employee-hub-site": "Espace collaborateurs",
      "training-site": "Centre de formation"
    },
    "siteDescriptions": {
      "communication-site": "Un site de communication corporate avec une page d'accueil actualités et une section formation liée.",
      "hr-site": "Un site RH avec un portail RH et un parcours d'intégration lié.",
      "onboarding-site": "Un site d'intégration avec un parcours guidé et un portail RH lié.",
      "employee-hub-site": "Un site espace collaborateurs avec recherche, annuaire et une section communication liée.",
      "training-site": "Un site de formation avec un parcours d'intégration lié."
    }
```

In `client/src/locales/de.json`:

```json
    "modePage": "Seite",
    "modeSite": "Website",
    "confirmBodySite": "Die gesamte Website durch '{{name}}' ersetzen? Alle aktuellen Seiten werden gelöscht und ersetzt, und das Design ändert sich. Diese Aktion kann nicht rückgängig gemacht werden.",
```
```json
    "siteLabels": {
      "communication-site": "Unternehmenskommunikation",
      "hr-site": "HR-Portal",
      "onboarding-site": "Onboarding-Pfad",
      "employee-hub-site": "Mitarbeiter-Hub",
      "training-site": "Schulungszentrum"
    },
    "siteDescriptions": {
      "communication-site": "Eine Unternehmenskommunikations-Website mit einer News-Startseite und einem verlinkten Schulungsbereich.",
      "hr-site": "Eine HR-Website mit einem HR-Portal und einem verlinkten Onboarding-Pfad.",
      "onboarding-site": "Eine Onboarding-Website mit einem geführten Pfad und einem verlinkten HR-Portal.",
      "employee-hub-site": "Eine Mitarbeiter-Hub-Website mit Suche, Verzeichnis und einem verlinkten Kommunikationsbereich.",
      "training-site": "Eine Schulungswebsite mit einem verlinkten Onboarding-Pfad."
    }
```

(Insert each language's new keys in the same position as the IT example: `modePage`/`modeSite` right after `tabLabel`, `confirmBodySite` right after `confirmBody`, `siteLabels`/`siteDescriptions` right after `descriptions`, before the block's closing brace.)

- [ ] **Step 4: Add the `kind` prop to `ApplyTemplateDialog.jsx`**

Replace the full content of `client/src/components/sidebar-left/ApplyTemplateDialog.jsx` with:

```jsx
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'

export default function ApplyTemplateDialog({ template, kind = 'page', onCancel, onConfirm }) {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef, { active: true, onEscape: onCancel })

  const labelKey = kind === 'site' ? `templates.siteLabels.${template.id}` : `templates.labels.${template.id}`
  const label = t(labelKey, { defaultValue: template.label })
  const bodyKey = kind === 'site' ? 'templates.confirmBodySite' : 'templates.confirmBody'

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="apply-template-title" className="bg-slate rounded-2xl border border-slate-mid w-full max-w-sm shadow-2xl p-5">
        <h2 id="apply-template-title" className="text-white font-semibold mb-2">{t('templates.confirmTitle')}</h2>
        <p className="text-sm text-slate-light mb-4">{t(bodyKey, { name: label })}</p>
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

- [ ] **Step 5: Add the Pagina/Sito mode toggle to `TemplateGallery.jsx`**

Replace the full content of `client/src/components/sidebar-left/TemplateGallery.jsx` with:

```jsx
import * as icons from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { PAGE_TEMPLATES, pageTemplateById } from '../../data/pageTemplates.js'
import { SITE_TEMPLATES } from '../../data/siteTemplates.js'
import ApplyTemplateDialog from './ApplyTemplateDialog.jsx'

function isPageEmpty(page) {
  return page.sections.every(section => section.columns.every(column => column.widgets.length === 0))
}

export default function TemplateGallery() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { t } = useTranslation()
  const [mode, setMode] = useState('page')
  const [pendingTemplate, setPendingTemplate] = useState(null)

  function applyPageTemplate(template) {
    dispatch({
      type: ACTIONS.APPLY_TEMPLATE,
      payload: { pages: [{ title: template.defaultPageTitle, sections: template.sections }] },
    })
  }

  function applySiteTemplate(siteTemplate) {
    const pages = siteTemplate.pages.map(({ pageTemplateId, parentIndex }) => ({
      title: pageTemplateById[pageTemplateId].defaultPageTitle,
      sections: pageTemplateById[pageTemplateId].sections,
      parentIndex,
    }))
    dispatch({
      type: ACTIONS.APPLY_TEMPLATE,
      payload: { pages, theme: { templateId: siteTemplate.themeId, accentColor: null } },
    })
  }

  function isSiteEmpty() {
    return state.pages.length === 1 && isPageEmpty(state.pages[0])
  }

  function handleSelect(template) {
    if (mode === 'page') {
      const activePage = state.pages.find(p => p.pageId === state.activePageId)
      if (isPageEmpty(activePage)) {
        applyPageTemplate(template)
      } else {
        setPendingTemplate(template)
      }
    } else {
      if (isSiteEmpty()) {
        applySiteTemplate(template)
      } else {
        setPendingTemplate(template)
      }
    }
  }

  const catalog = mode === 'page' ? PAGE_TEMPLATES : SITE_TEMPLATES
  const labelNamespace = mode === 'page' ? 'labels' : 'siteLabels'
  const descriptionNamespace = mode === 'page' ? 'descriptions' : 'siteDescriptions'

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode('page')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${mode === 'page' ? 'bg-blue-electric text-navy' : 'bg-slate-mid text-slate-light hover:text-white'}`}
        >
          {t('templates.modePage')}
        </button>
        <button
          onClick={() => setMode('site')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${mode === 'site' ? 'bg-blue-electric text-navy' : 'bg-slate-mid text-slate-light hover:text-white'}`}
        >
          {t('templates.modeSite')}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {catalog.map(template => {
          const Icon = icons[template.icon] ?? icons.Box
          return (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className="flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left bg-slate-mid border-slate-mid hover:border-blue-electric hover:bg-navy-light transition-all"
            >
              <Icon size={20} className="text-blue-electric flex-shrink-0" />
              <span className="text-xs font-semibold text-white">
                {t(`templates.${labelNamespace}.${template.id}`, { defaultValue: template.label })}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-light">
                {t(`templates.categories.${template.category}`, { defaultValue: template.category })}
              </span>
              <span className="text-xs text-slate-light leading-tight">
                {t(`templates.${descriptionNamespace}.${template.id}`, { defaultValue: template.description })}
              </span>
            </button>
          )
        })}
      </div>
      {pendingTemplate && (
        <ApplyTemplateDialog
          template={pendingTemplate}
          kind={mode}
          onCancel={() => setPendingTemplate(null)}
          onConfirm={() => {
            if (mode === 'page') applyPageTemplate(pendingTemplate)
            else applySiteTemplate(pendingTemplate)
            setPendingTemplate(null)
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd client && npx playwright test -g "Sito mode|site bundle"`

Expected: all PASS (6 passed).

- [ ] **Step 7: Run the full e2e and unit suites to check for regressions**

Run: `cd client && npx playwright test && npx vitest run`

Expected: all pass. In particular, confirm the existing Phase 5a Template-tab tests (`'Template tab renders the page template gallery'`, `'applying a template to the default empty Home page scaffolds it immediately'`, and the others through `'Template tab and its confirmation dialog have no in-scope accessibility violations'`) still pass unchanged — they exercise `mode === 'page'`, the toggle's default, so they need no edits.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/sidebar-left/TemplateGallery.jsx client/src/components/sidebar-left/ApplyTemplateDialog.jsx client/src/locales/it.json client/src/locales/en.json client/src/locales/fr.json client/src/locales/de.json client/tests/smoke.spec.js
git commit -m "feat: add site bundle gallery mode and site-aware confirmation dialog"
```

---

## Final check

After Task 2, run both suites once more from `client/`:

```bash
npx vitest run
npx playwright test
```

Expected: all Vitest tests pass (59 pre-existing minus 1 replaced plus 6 new = 65 from Task 1, no further change in Task 2), all Playwright tests pass (37 pre-existing + 6 new = 43).
