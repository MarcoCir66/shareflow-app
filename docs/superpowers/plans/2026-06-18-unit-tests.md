# Unit Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add unit test coverage for the configurator reducer + its pure helpers (client) and the provisioning job state machine (server) — the two pieces of ShareFlow logic with the highest behavioral risk and the lowest existing test coverage.

**Architecture:** Two independent tracks. The client gets a new unit test runner (Vitest, reusing the existing `vite.config.js` with no changes needed) plus three new test files colocated with their source. The server gets new tests appended to its existing `node:test` suite, plus one small production change (`STEP_DELAY_MS` becomes overridable via an env var so lifecycle tests run in milliseconds instead of seconds).

**Tech Stack:** Vitest (client, new), `node:test` + `node:assert/strict` (server, already in use — no new framework).

## Global Constraints

- Client unit tests use Vitest only; no other test framework is introduced. Source: spec Part 1.
- Server unit tests continue using `node:test` + `node:assert/strict` — no new framework. Source: spec Context.
- No coverage tooling or enforced coverage thresholds in this sub-project. Source: spec Out of Scope.
- No unit tests for React components (`ConfiguratorContext.jsx` or any UI component) — reducer/helpers and the provisioning job state machine only. Source: spec Out of Scope.
- `STEP_DELAY_MS` becomes overridable via `PROVISIONING_STEP_DELAY_MS`; the production default remains 900ms when the env var is unset. Source: spec Part 2.
- No test covers the Graph-failure error path in `provisioningJobs.js` — decided during brainstorming as disproportionate to add via an experimental Node API (`mock.module()`, requires `--experimental-test-module-mocks`) or a dependency-injection refactor done solely to enable one test. Source: spec Part 2 correction.

---

### Task 1: Vitest setup + `sectionHelpers` tests

**Files:**
- Modify: `client/package.json` (add `vitest` devDependency, add `test:unit` script)
- Create: `client/src/context/sectionHelpers.test.js`

**Interfaces:**
- Consumes: `findWidgetLocation(sections, instanceId)`, `mapColumn(sections, sectionId, columnId, updateFn)`, `flattenWidgets(sections)` — all already exported from `client/src/context/sectionHelpers.js`. No signatures change.
- Produces: nothing new for later tasks (this task only adds tests for already-existing exports). Confirms the Vitest harness (`npm run test:unit`) works before Tasks 2-4 add to it.

- [ ] **Step 1: Install Vitest and add the test:unit script**

```bash
cd "client" && npm install -D vitest
```

Open `client/package.json`. The current `scripts` block is:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test:e2e": "playwright test"
  },
```

Replace it with:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test:e2e": "playwright test",
    "test:unit": "vitest run"
  },
```

(`vitest run` runs once and exits — plain `vitest` watches by default, which would hang in non-interactive use.)

- [ ] **Step 2: Write the failing test**

Create `client/src/context/sectionHelpers.test.js`:

```js
import { test, expect } from 'vitest'
import { findWidgetLocation, mapColumn, flattenWidgets } from './sectionHelpers.js'

test('findWidgetLocation returns the section/column ids containing the widget', () => {
  const sections = [{ sectionId: 's1', columns: [{ columnId: 'c1', widgets: [{ instanceId: 'w1' }] }] }]
  expect(findWidgetLocation(sections, 'w1')).toEqual({ sectionId: 's1', columnId: 'c1' })
})

test('findWidgetLocation returns null when the widget is not found', () => {
  const sections = [{ sectionId: 's1', columns: [{ columnId: 'c1', widgets: [] }] }]
  expect(findWidgetLocation(sections, 'missing')).toBeNull()
})

test('mapColumn applies updateFn only to the targeted column', () => {
  const sections = [{ sectionId: 's1', columns: [
    { columnId: 'c1', widgets: [] },
    { columnId: 'c2', widgets: [] },
  ] }]
  const result = mapColumn(sections, 's1', 'c2', col => ({ ...col, widgets: [{ instanceId: 'w1' }] }))
  expect(result[0].columns[0].widgets).toEqual([])
  expect(result[0].columns[1].widgets).toEqual([{ instanceId: 'w1' }])
})

test('mapColumn returns sections unchanged when the section is not found', () => {
  const sections = [{ sectionId: 's1', columns: [{ columnId: 'c1', widgets: [] }] }]
  const result = mapColumn(sections, 'missing', 'c1', col => ({ ...col, widgets: [{ instanceId: 'w1' }] }))
  expect(result).toEqual(sections)
})

test('flattenWidgets flattens columns into a single array with recomputed order', () => {
  const sections = [{ sectionId: 's1', columns: [
    { columnId: 'c1', widgets: [{ instanceId: 'w1', order: 5 }] },
    { columnId: 'c2', widgets: [{ instanceId: 'w2', order: 9 }] },
  ] }]
  const result = flattenWidgets(sections)
  expect(result.map(w => w.instanceId)).toEqual(['w1', 'w2'])
  expect(result.map(w => w.order)).toEqual([0, 1])
})
```

- [ ] **Step 3: Run the tests**

Run: `cd "client" && npm run test:unit`
Expected: PASS — 5 tests passing. (This is a new test runner, so there's no prior "RED" state to compare against — `sectionHelpers.js`'s functions already exist and are correct, so the first run should pass directly.)

- [ ] **Step 4: Commit**

```bash
git add client/package.json client/package-lock.json client/src/context/sectionHelpers.test.js
git commit -m "test(client): add Vitest and sectionHelpers unit tests"
```

---

### Task 2: `pageHelpers` tests

**Files:**
- Create: `client/src/context/pageHelpers.test.js`

**Interfaces:**
- Consumes: `slugify`, `uniqueSlug`, `hasChildren`, `getSubtreeEndIndex`, `moveSubtree`, `resolveParentAtDepth`, `buildTenantExport` — all already exported from `client/src/context/pageHelpers.js`. No signatures change.
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the tests**

Create `client/src/context/pageHelpers.test.js`:

```js
import { test, expect } from 'vitest'
import {
  slugify, uniqueSlug, hasChildren, getSubtreeEndIndex, moveSubtree, resolveParentAtDepth, buildTenantExport,
} from './pageHelpers.js'

test('slugify lowercases, trims, and collapses non-alphanumeric runs into hyphens', () => {
  expect(slugify('  Hello World!! ')).toBe('hello-world')
})

test('slugify returns "pagina" for a title with no alphanumeric characters', () => {
  expect(slugify('!!!')).toBe('pagina')
})

test('uniqueSlug returns the base slug when there is no collision', () => {
  const pages = [{ pageId: 'p1', slug: 'home' }]
  expect(uniqueSlug(pages, 'about')).toBe('about')
})

test('uniqueSlug appends -2, -3 until the slug is free', () => {
  const pages = [{ pageId: 'p1', slug: 'home' }, { pageId: 'p2', slug: 'home-2' }]
  expect(uniqueSlug(pages, 'home')).toBe('home-3')
})

test('uniqueSlug excludes the given pageId from collision checks', () => {
  const pages = [{ pageId: 'p1', slug: 'home' }]
  expect(uniqueSlug(pages, 'home', 'p1')).toBe('home')
})

test('hasChildren returns true when a page has parentId pointing to the given id', () => {
  const pages = [{ pageId: 'p1', parentId: null }, { pageId: 'p2', parentId: 'p1' }]
  expect(hasChildren(pages, 'p1')).toBe(true)
})

test('hasChildren returns false for a leaf page', () => {
  const pages = [{ pageId: 'p1', parentId: null }, { pageId: 'p2', parentId: 'p1' }]
  expect(hasChildren(pages, 'p2')).toBe(false)
})

test('getSubtreeEndIndex returns the index itself for a page with no descendants', () => {
  const pages = [{ pageId: 'p1', parentId: null }, { pageId: 'p2', parentId: null }]
  expect(getSubtreeEndIndex(pages, 0)).toBe(0)
})

test('getSubtreeEndIndex returns the last index of a nested subtree', () => {
  const pages = [
    { pageId: 'p1', parentId: null },
    { pageId: 'p2', parentId: 'p1' },
    { pageId: 'p3', parentId: 'p2' },
    { pageId: 'p4', parentId: null },
  ]
  expect(getSubtreeEndIndex(pages, 0)).toBe(2)
})

test('moveSubtree moves a subtree to sit after the target page', () => {
  const pages = [
    { pageId: 'p1', parentId: null },
    { pageId: 'p2', parentId: null },
    { pageId: 'p3', parentId: null },
  ]
  const result = moveSubtree(pages, 'p1', 'p3')
  expect(result.map(p => p.pageId)).toEqual(['p2', 'p3', 'p1'])
})

test('moveSubtree returns the same array when dropped on its own descendant', () => {
  const pages = [
    { pageId: 'p1', parentId: null },
    { pageId: 'p2', parentId: 'p1' },
  ]
  const result = moveSubtree(pages, 'p1', 'p2')
  expect(result).toBe(pages)
})

test('moveSubtree returns the same array when activeId or overId is not found', () => {
  const pages = [{ pageId: 'p1', parentId: null }]
  expect(moveSubtree(pages, 'missing', 'p1')).toBe(pages)
})

test('resolveParentAtDepth returns null at depth 0', () => {
  const pages = [{ pageId: 'p1', parentId: null }]
  expect(resolveParentAtDepth(pages, 0, 0)).toBeNull()
})

test('resolveParentAtDepth finds the nearest preceding page at depth - 1', () => {
  const pages = [
    { pageId: 'p1', parentId: null },
    { pageId: 'p2', parentId: 'p1' },
    { pageId: 'p3', parentId: null },
  ]
  expect(resolveParentAtDepth(pages, 2, 1)).toBe('p1')
})

test('buildTenantExport attaches pages, navigation, and a flattened widgets array', () => {
  const pages = [
    {
      pageId: 'page-home',
      title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' },
      slug: 'home',
      parentId: null,
      sections: [{
        sectionId: 's1',
        layout: 'oneColumn',
        columns: [{ columnId: 'c1', widgets: [{ instanceId: 'w1', blockId: 'news-corporate', props: {} }] }],
      }],
    },
  ]
  const tenantConfiguration = {
    tenantId: null,
    siteName: { it: 'Test', en: 'Test', fr: 'Test', de: 'Test' },
    siteUrl: '',
    widgets: [],
    theme: { templateId: 'corporate-classic', accentColor: null },
  }
  const result = buildTenantExport(pages, tenantConfiguration)
  expect(result.pages).toHaveLength(1)
  expect(result.pages[0].widgets).toHaveLength(1)
  expect(result.navigation).toEqual([{ pageId: 'page-home', title: pages[0].title, slug: 'home', children: [] }])
  expect(result.widgets).toEqual([{ instanceId: 'w1', blockId: 'news-corporate', props: {}, order: 0 }])
})
```

- [ ] **Step 2: Run the tests**

Run: `cd "client" && npm run test:unit`
Expected: PASS — 20 tests passing (5 from Task 1 + 15 new).

- [ ] **Step 3: Commit**

```bash
git add client/src/context/pageHelpers.test.js
git commit -m "test(client): add pageHelpers unit tests"
```

---

### Task 3: `configuratorReducer` tests — widget, section, and selection actions

**Files:**
- Create: `client/src/context/configuratorReducer.test.js`

**Interfaces:**
- Consumes: `configuratorReducer(state, action)`, `ACTIONS` — both exported from `client/src/context/configuratorReducer.js`. `blockById` exported from `client/src/data/blockCatalog.js` (used as a fixture source, not modified).
- Produces: the test file this task creates is extended by Task 4 (which appends more tests to the same file) — keep the `makeState` helper exported-in-spirit by leaving it as a plain top-level function in this file so Task 4 can add to the same file using it.

This task covers: `ADD_WIDGET`, `REMOVE_WIDGET`, `REORDER_WIDGETS`, `MOVE_WIDGET`, `SELECT_WIDGET`, `DESELECT_WIDGET`, `UPDATE_WIDGET_PROP`, `ADD_SECTION`, `SELECT_SECTION`, `SELECT_PAGE`, `SET_TENANT_META`, `EXPORT_CONFIGURATION`. Task 4 covers the remaining, more complex actions (`CHANGE_SECTION_LAYOUT`, `REMOVE_SECTION`, `ADD_PAGE`, `RENAME_PAGE`, `REMOVE_PAGE`, `MOVE_PAGE`).

- [ ] **Step 1: Write the tests**

Create `client/src/context/configuratorReducer.test.js`:

```js
import { test, expect } from 'vitest'
import { configuratorReducer, ACTIONS } from './configuratorReducer.js'
import { blockById } from '../data/blockCatalog.js'

function makeState(overrides = {}) {
  return {
    pages: [
      {
        pageId: 'page-home',
        title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' },
        slug: 'home',
        parentId: null,
        sections: [
          { sectionId: 'section-1', layout: 'oneColumn', columns: [{ columnId: 'col-1', widgets: [] }] },
        ],
      },
    ],
    activePageId: 'page-home',
    selectedWidgetInstanceId: null,
    selectedSectionId: null,
    tenantConfiguration: {
      tenantId: null,
      siteName: { it: 'Test', en: 'Test', fr: 'Test', de: 'Test' },
      siteUrl: '',
      widgets: [],
      theme: { templateId: 'corporate-classic', accentColor: null },
    },
    ...overrides,
  }
}

test('ADD_WIDGET appends a widget with the block defaultProps to the last column of the last section', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.ADD_WIDGET, payload: { blockId: 'news-corporate' } })
  const widgets = next.pages[0].sections[0].columns[0].widgets
  expect(widgets).toHaveLength(1)
  expect(widgets[0].blockId).toBe('news-corporate')
  expect(widgets[0].props).toEqual(blockById['news-corporate'].defaultProps)
})

test('ADD_WIDGET respects an explicit sectionId/columnId', () => {
  const state = makeState({
    pages: [{
      pageId: 'page-home', title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, slug: 'home', parentId: null,
      sections: [
        { sectionId: 'section-a', layout: 'oneColumn', columns: [{ columnId: 'col-a', widgets: [] }] },
        { sectionId: 'section-b', layout: 'oneColumn', columns: [{ columnId: 'col-b', widgets: [] }] },
      ],
    }],
  })
  const next = configuratorReducer(state, {
    type: ACTIONS.ADD_WIDGET,
    payload: { blockId: 'news-corporate', sectionId: 'section-a', columnId: 'col-a' },
  })
  expect(next.pages[0].sections[0].columns[0].widgets).toHaveLength(1)
  expect(next.pages[0].sections[1].columns[0].widgets).toHaveLength(0)
})

test('ADD_WIDGET with an unknown blockId returns the same state', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.ADD_WIDGET, payload: { blockId: 'does-not-exist' } })
  expect(next).toBe(state)
})

test('REMOVE_WIDGET removes the widget and clears selection if it was selected', () => {
  const state = makeState({ selectedWidgetInstanceId: 'w1' })
  state.pages[0].sections[0].columns[0].widgets = [{ instanceId: 'w1', blockId: 'news-corporate', props: {} }]
  const next = configuratorReducer(state, { type: ACTIONS.REMOVE_WIDGET, payload: { instanceId: 'w1' } })
  expect(next.pages[0].sections[0].columns[0].widgets).toEqual([])
  expect(next.selectedWidgetInstanceId).toBeNull()
})

test('REMOVE_WIDGET with an unknown instanceId returns the same state', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.REMOVE_WIDGET, payload: { instanceId: 'missing' } })
  expect(next).toBe(state)
})

test('REORDER_WIDGETS reorders widgets within a column', () => {
  const state = makeState()
  state.pages[0].sections[0].columns[0].widgets = [
    { instanceId: 'w1', blockId: 'a', props: {} },
    { instanceId: 'w2', blockId: 'b', props: {} },
  ]
  const next = configuratorReducer(state, {
    type: ACTIONS.REORDER_WIDGETS,
    payload: { activeId: 'w1', overId: 'w2', sectionId: 'section-1', columnId: 'col-1' },
  })
  expect(next.pages[0].sections[0].columns[0].widgets.map(w => w.instanceId)).toEqual(['w2', 'w1'])
})

test('MOVE_WIDGET relocates a widget to a different column', () => {
  const state = makeState({
    pages: [{
      pageId: 'page-home', title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, slug: 'home', parentId: null,
      sections: [
        { sectionId: 'section-a', layout: 'oneColumn', columns: [{ columnId: 'col-a', widgets: [{ instanceId: 'w1', blockId: 'news-corporate', props: {} }] }] },
        { sectionId: 'section-b', layout: 'oneColumn', columns: [{ columnId: 'col-b', widgets: [] }] },
      ],
    }],
  })
  const next = configuratorReducer(state, {
    type: ACTIONS.MOVE_WIDGET,
    payload: { instanceId: 'w1', toSectionId: 'section-b', toColumnId: 'col-b' },
  })
  expect(next.pages[0].sections[0].columns[0].widgets).toEqual([])
  expect(next.pages[0].sections[1].columns[0].widgets[0].instanceId).toBe('w1')
})

test('MOVE_WIDGET to the widget\'s current column returns the same state', () => {
  const state = makeState()
  state.pages[0].sections[0].columns[0].widgets = [{ instanceId: 'w1', blockId: 'news-corporate', props: {} }]
  const next = configuratorReducer(state, {
    type: ACTIONS.MOVE_WIDGET,
    payload: { instanceId: 'w1', toSectionId: 'section-1', toColumnId: 'col-1' },
  })
  expect(next).toBe(state)
})

test('SELECT_WIDGET sets selectedWidgetInstanceId and clears selectedSectionId', () => {
  const state = makeState({ selectedSectionId: 'section-1' })
  const next = configuratorReducer(state, { type: ACTIONS.SELECT_WIDGET, payload: { instanceId: 'w1' } })
  expect(next.selectedWidgetInstanceId).toBe('w1')
  expect(next.selectedSectionId).toBeNull()
})

test('DESELECT_WIDGET clears both selections', () => {
  const state = makeState({ selectedWidgetInstanceId: 'w1', selectedSectionId: 'section-1' })
  const next = configuratorReducer(state, { type: ACTIONS.DESELECT_WIDGET })
  expect(next.selectedWidgetInstanceId).toBeNull()
  expect(next.selectedSectionId).toBeNull()
})

test('UPDATE_WIDGET_PROP updates a single prop on the targeted widget', () => {
  const state = makeState()
  state.pages[0].sections[0].columns[0].widgets = [{ instanceId: 'w1', blockId: 'news-corporate', props: { visible: true } }]
  const next = configuratorReducer(state, {
    type: ACTIONS.UPDATE_WIDGET_PROP,
    payload: { instanceId: 'w1', key: 'visible', value: false },
  })
  expect(next.pages[0].sections[0].columns[0].widgets[0].props.visible).toBe(false)
})

test('UPDATE_WIDGET_PROP with an unknown instanceId returns the same state', () => {
  const state = makeState()
  const next = configuratorReducer(state, {
    type: ACTIONS.UPDATE_WIDGET_PROP,
    payload: { instanceId: 'missing', key: 'visible', value: false },
  })
  expect(next).toBe(state)
})

test('ADD_SECTION appends a new section with empty columns matching the layout and selects it', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.ADD_SECTION, payload: { layout: 'twoColumn' } })
  const sections = next.pages[0].sections
  expect(sections).toHaveLength(2)
  expect(sections[1].layout).toBe('twoColumn')
  expect(sections[1].columns).toHaveLength(2)
  expect(next.selectedSectionId).toBe(sections[1].sectionId)
  expect(next.selectedWidgetInstanceId).toBeNull()
})

test('SELECT_SECTION sets selectedSectionId and clears selectedWidgetInstanceId', () => {
  const state = makeState({ selectedWidgetInstanceId: 'w1' })
  const next = configuratorReducer(state, { type: ACTIONS.SELECT_SECTION, payload: { sectionId: 'section-1' } })
  expect(next.selectedSectionId).toBe('section-1')
  expect(next.selectedWidgetInstanceId).toBeNull()
})

test('SELECT_PAGE switches activePageId and clears selections', () => {
  const state = makeState({
    pages: [
      { pageId: 'page-home', title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, slug: 'home', parentId: null, sections: [] },
      { pageId: 'page-about', title: { it: 'About', en: 'About', fr: 'About', de: 'About' }, slug: 'about', parentId: null, sections: [] },
    ],
    selectedWidgetInstanceId: 'w1',
    selectedSectionId: 'section-1',
  })
  const next = configuratorReducer(state, { type: ACTIONS.SELECT_PAGE, payload: { pageId: 'page-about' } })
  expect(next.activePageId).toBe('page-about')
  expect(next.selectedWidgetInstanceId).toBeNull()
  expect(next.selectedSectionId).toBeNull()
})

test('SET_TENANT_META merges the payload into tenantConfiguration', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.SET_TENANT_META, payload: { siteUrl: 'https://example.com' } })
  expect(next.tenantConfiguration.siteUrl).toBe('https://example.com')
  expect(next.tenantConfiguration.theme).toEqual(state.tenantConfiguration.theme)
})

test('EXPORT_CONFIGURATION rebuilds tenantConfiguration via buildTenantExport', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.EXPORT_CONFIGURATION })
  expect(Array.isArray(next.tenantConfiguration.pages)).toBe(true)
  expect(next.tenantConfiguration.navigation).toEqual([
    { pageId: 'page-home', title: state.pages[0].title, slug: 'home', children: [] },
  ])
})
```

- [ ] **Step 2: Run the tests**

Run: `cd "client" && npm run test:unit`
Expected: PASS — 37 tests passing (20 from Tasks 1-2 + 17 new).

- [ ] **Step 3: Commit**

```bash
git add client/src/context/configuratorReducer.test.js
git commit -m "test(client): add configuratorReducer tests for widget/section/selection actions"
```

---

### Task 4: `configuratorReducer` tests — page actions and remaining guards

**Files:**
- Modify: `client/src/context/configuratorReducer.test.js` (append to the file Task 3 created)

**Interfaces:**
- Consumes: same `configuratorReducer`/`ACTIONS` as Task 3, plus the `makeState` helper Task 3 defined at the top of the same file.
- Produces: nothing new for later tasks — this completes reducer coverage.

This task covers the remaining action types: `CHANGE_SECTION_LAYOUT`, `REMOVE_SECTION`, `ADD_PAGE`, `RENAME_PAGE`, `REMOVE_PAGE`, `MOVE_PAGE`.

- [ ] **Step 1: Append the tests**

Open `client/src/context/configuratorReducer.test.js` (created in Task 3) and append the following at the end of the file:

```js

test('CHANGE_SECTION_LAYOUT increasing columns appends empty columns', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.CHANGE_SECTION_LAYOUT, payload: { sectionId: 'section-1', layout: 'threeColumn' } })
  const section = next.pages[0].sections[0]
  expect(section.layout).toBe('threeColumn')
  expect(section.columns).toHaveLength(3)
  expect(section.columns[0].widgets).toEqual([])
})

test('CHANGE_SECTION_LAYOUT decreasing columns redistributes overflow widgets into the last kept column', () => {
  const state = makeState({
    pages: [{
      pageId: 'page-home', title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, slug: 'home', parentId: null,
      sections: [{
        sectionId: 'section-1',
        layout: 'threeColumn',
        columns: [
          { columnId: 'col-1', widgets: [{ instanceId: 'w1', blockId: 'a', props: {} }] },
          { columnId: 'col-2', widgets: [{ instanceId: 'w2', blockId: 'b', props: {} }] },
          { columnId: 'col-3', widgets: [{ instanceId: 'w3', blockId: 'c', props: {} }] },
        ],
      }],
    }],
  })
  const next = configuratorReducer(state, { type: ACTIONS.CHANGE_SECTION_LAYOUT, payload: { sectionId: 'section-1', layout: 'oneColumn' } })
  const section = next.pages[0].sections[0]
  expect(section.columns).toHaveLength(1)
  expect(section.columns[0].widgets.map(w => w.instanceId)).toEqual(['w1', 'w2', 'w3'])
})

test('REMOVE_SECTION removes an empty section when more than one section exists', () => {
  const state = makeState({
    pages: [{
      pageId: 'page-home', title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, slug: 'home', parentId: null,
      sections: [
        { sectionId: 'section-1', layout: 'oneColumn', columns: [{ columnId: 'col-1', widgets: [] }] },
        { sectionId: 'section-2', layout: 'oneColumn', columns: [{ columnId: 'col-2', widgets: [] }] },
      ],
    }],
    selectedSectionId: 'section-2',
  })
  const next = configuratorReducer(state, { type: ACTIONS.REMOVE_SECTION, payload: { sectionId: 'section-2' } })
  expect(next.pages[0].sections).toHaveLength(1)
  expect(next.selectedSectionId).toBeNull()
})

test('REMOVE_SECTION on a non-empty section returns the same state', () => {
  const state = makeState({
    pages: [{
      pageId: 'page-home', title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, slug: 'home', parentId: null,
      sections: [
        { sectionId: 'section-1', layout: 'oneColumn', columns: [{ columnId: 'col-1', widgets: [{ instanceId: 'w1', blockId: 'a', props: {} }] }] },
        { sectionId: 'section-2', layout: 'oneColumn', columns: [{ columnId: 'col-2', widgets: [] }] },
      ],
    }],
  })
  const next = configuratorReducer(state, { type: ACTIONS.REMOVE_SECTION, payload: { sectionId: 'section-1' } })
  expect(next).toBe(state)
})

test('REMOVE_SECTION on the last remaining section returns the same state', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.REMOVE_SECTION, payload: { sectionId: 'section-1' } })
  expect(next).toBe(state)
})

test('ADD_PAGE with parentId null appends a top-level page and selects it', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.ADD_PAGE, payload: { parentId: null } })
  expect(next.pages).toHaveLength(2)
  const newPage = next.pages[1]
  expect(newPage.parentId).toBeNull()
  expect(newPage.slug).toBe('nuova-pagina')
  expect(next.activePageId).toBe(newPage.pageId)
})

test('ADD_PAGE with a parentId inserts the new page immediately after the parent subtree', () => {
  const state = makeState({
    pages: [
      { pageId: 'page-home', title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, slug: 'home', parentId: null, sections: [] },
      { pageId: 'page-about', title: { it: 'About', en: 'About', fr: 'About', de: 'About' }, slug: 'about', parentId: null, sections: [] },
    ],
  })
  const next = configuratorReducer(state, { type: ACTIONS.ADD_PAGE, payload: { parentId: 'page-home' } })
  expect(next.pages).toHaveLength(3)
  expect(next.pages[1].parentId).toBe('page-home')
  expect(next.pages[2].pageId).toBe('page-about')
})

test('ADD_PAGE with an unknown parentId returns the same state', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.ADD_PAGE, payload: { parentId: 'does-not-exist' } })
  expect(next).toBe(state)
})

test('RENAME_PAGE updates the title for the given language and recomputes the slug from the Italian title', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.RENAME_PAGE, payload: { pageId: 'page-home', lang: 'it', title: 'Pagina Principale' } })
  expect(next.pages[0].title.it).toBe('Pagina Principale')
  expect(next.pages[0].slug).toBe('pagina-principale')
})

test('RENAME_PAGE normalizes a legacy string title into the multilingual shape before updating', () => {
  const state = makeState({
    pages: [{ pageId: 'page-home', title: 'Home', slug: 'home', parentId: null, sections: [] }],
  })
  const next = configuratorReducer(state, { type: ACTIONS.RENAME_PAGE, payload: { pageId: 'page-home', lang: 'en', title: 'Main Page' } })
  expect(next.pages[0].title).toEqual({ it: 'Home', en: 'Main Page', fr: 'Home', de: 'Home' })
})

test('RENAME_PAGE appends a numeric suffix when the new slug collides with another page', () => {
  const state = makeState({
    pages: [
      { pageId: 'page-home', title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, slug: 'home', parentId: null, sections: [] },
      { pageId: 'page-other', title: { it: 'Altra', en: 'Other', fr: 'Autre', de: 'Andere' }, slug: 'altra', parentId: null, sections: [] },
    ],
  })
  const next = configuratorReducer(state, { type: ACTIONS.RENAME_PAGE, payload: { pageId: 'page-other', lang: 'it', title: 'Home' } })
  expect(next.pages[1].slug).toBe('home-2')
})

test('RENAME_PAGE with a blank title (after trim) returns the same state', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.RENAME_PAGE, payload: { pageId: 'page-home', lang: 'it', title: '   ' } })
  expect(next).toBe(state)
})

test('REMOVE_PAGE removes a leaf page and switches activePageId if it was active', () => {
  const state = makeState({
    pages: [
      { pageId: 'page-home', title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, slug: 'home', parentId: null, sections: [] },
      { pageId: 'page-about', title: { it: 'About', en: 'About', fr: 'About', de: 'About' }, slug: 'about', parentId: null, sections: [] },
    ],
    activePageId: 'page-about',
  })
  const next = configuratorReducer(state, { type: ACTIONS.REMOVE_PAGE, payload: { pageId: 'page-about' } })
  expect(next.pages).toHaveLength(1)
  expect(next.activePageId).toBe('page-home')
})

test('REMOVE_PAGE on the only remaining page returns the same state', () => {
  const state = makeState()
  const next = configuratorReducer(state, { type: ACTIONS.REMOVE_PAGE, payload: { pageId: 'page-home' } })
  expect(next).toBe(state)
})

test('REMOVE_PAGE on a page with children returns the same state', () => {
  const state = makeState({
    pages: [
      { pageId: 'page-home', title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' }, slug: 'home', parentId: null, sections: [] },
      { pageId: 'page-child', title: { it: 'Figlia', en: 'Child', fr: 'Enfant', de: 'Kind' }, slug: 'figlia', parentId: 'page-home', sections: [] },
    ],
  })
  const next = configuratorReducer(state, { type: ACTIONS.REMOVE_PAGE, payload: { pageId: 'page-home' } })
  expect(next).toBe(state)
})

test('MOVE_PAGE reorders pages and resolves the new parentId from the target depth', () => {
  const state = makeState({
    pages: [
      { pageId: 'page-a', title: { it: 'A', en: 'A', fr: 'A', de: 'A' }, slug: 'a', parentId: null, sections: [] },
      { pageId: 'page-b', title: { it: 'B', en: 'B', fr: 'B', de: 'B' }, slug: 'b', parentId: null, sections: [] },
      { pageId: 'page-c', title: { it: 'C', en: 'C', fr: 'C', de: 'C' }, slug: 'c', parentId: null, sections: [] },
    ],
  })
  const next = configuratorReducer(state, { type: ACTIONS.MOVE_PAGE, payload: { activeId: 'page-c', overId: 'page-a', depth: 0 } })
  expect(next.pages.map(p => p.pageId)).toEqual(['page-c', 'page-a', 'page-b'])
  expect(next.pages[0].parentId).toBeNull()
})

test('MOVE_PAGE dropping a page onto its own descendant returns the same state', () => {
  const state = makeState({
    pages: [
      { pageId: 'page-a', title: { it: 'A', en: 'A', fr: 'A', de: 'A' }, slug: 'a', parentId: null, sections: [] },
      { pageId: 'page-a-child', title: { it: 'AC', en: 'AC', fr: 'AC', de: 'AC' }, slug: 'a-child', parentId: 'page-a', sections: [] },
    ],
  })
  const next = configuratorReducer(state, { type: ACTIONS.MOVE_PAGE, payload: { activeId: 'page-a', overId: 'page-a-child', depth: 0 } })
  expect(next).toBe(state)
})
```

- [ ] **Step 2: Run the tests**

Run: `cd "client" && npm run test:unit`
Expected: PASS — 54 tests passing (37 from Tasks 1-3 + 17 new).

- [ ] **Step 3: Run the full client unit suite once more, standalone, to confirm the final count**

Run: `cd "client" && npm run test:unit`
Expected: PASS — 54 tests, 0 failures. This is the complete client unit test suite for this sub-project.

- [ ] **Step 4: Commit**

```bash
git add client/src/context/configuratorReducer.test.js
git commit -m "test(client): add configuratorReducer tests for page actions and remaining guards"
```

---

### Task 5: Provisioning job state machine tests (server)

**Files:**
- Modify: `server/src/provisioningJobs.js:7-8`
- Modify: `server/src/provisioningJobs.test.js`

**Interfaces:**
- Consumes: `createJob(tenantConfiguration)`, `getJob(id)` — already exported from `server/src/provisioningJobs.js`, signatures unchanged. `loadJob(id)` from `server/src/jobStore.js`, signature unchanged.
- Produces: `STEP_DELAY_MS` (internal, not exported) now reads `process.env.PROVISIONING_STEP_DELAY_MS` at module load, defaulting to `900` when unset. No exported interface changes.

- [ ] **Step 1: Make the step delay overridable**

Open `server/src/provisioningJobs.js`. Replace:

```js
const STEP_COUNT = 6
const STEP_DELAY_MS = 900
```

with:

```js
const STEP_COUNT = 6
const STEP_DELAY_MS = Number(process.env.PROVISIONING_STEP_DELAY_MS ?? 900)
```

- [ ] **Step 2: Run the existing unit suite to confirm no regression**

Run: `cd "server" && npm test`
Expected: PASS — 22 tests passing (same as before this task; the env var is unset in this run, so `STEP_DELAY_MS` is still 900 and nothing observable changes).

- [ ] **Step 3: Set the reduced delay in the test file, before any other import**

Open `server/src/provisioningJobs.test.js`. The current top of the file is:

```js
import os from 'node:os'
import path from 'node:path'
process.env.JOBS_DB_PATH = path.join(os.tmpdir(), `provisioning-jobs-test-${process.pid}.db`)

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSiteName } from './provisioningJobs.js'
```

Replace it with:

```js
import os from 'node:os'
import path from 'node:path'
process.env.JOBS_DB_PATH = path.join(os.tmpdir(), `provisioning-jobs-test-${process.pid}.db`)
process.env.PROVISIONING_STEP_DELAY_MS = '5'

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSiteName, createJob, getJob } from './provisioningJobs.js'
import { loadJob } from './jobStore.js'
```

(Both env vars must be set before `provisioningJobs.js` is imported anywhere, including transitively — it reads `JOBS_DB_PATH` via its `jobStore.js` import and `PROVISIONING_STEP_DELAY_MS` directly, both at module-load time.)

- [ ] **Step 4: Run the tests to confirm the existing resolveSiteName tests still pass with the new imports**

Run: `cd "server" && npm test`
Expected: PASS — 22 tests passing (the new imports are unused so far; this just confirms nothing broke from the import change itself).

- [ ] **Step 5: Append the lifecycle tests**

Open `server/src/provisioningJobs.test.js` and append the following at the end of the file:

```js

test('createJob returns a running job at step 0 and persists it immediately', () => {
  const job = createJob({ siteName: 'Acme Corp', widgets: [] })
  assert.equal(job.status, 'running')
  assert.equal(job.currentStep, 0)
  assert.equal(job.totalSteps, 6)
  assert.deepEqual(job.tenantConfiguration, { siteName: 'Acme Corp', widgets: [] })
  const persisted = loadJob(job.id)
  assert.equal(persisted.status, 'running')
})

test('a job created without Graph configured reaches done with a generated siteUrl', { timeout: 2000 }, async () => {
  const job = createJob({ siteName: 'Acme Corp', widgets: [] })
  await new Promise(resolve => {
    const interval = setInterval(() => {
      if (getJob(job.id).status !== 'running') {
        clearInterval(interval)
        resolve()
      }
    }, 5)
  })
  const finished = getJob(job.id)
  assert.equal(finished.status, 'done')
  assert.equal(finished.result.siteUrl, 'https://contoso.sharepoint.com/sites/acme-corp')
})

test('getJob returns the in-memory job while it is still active', () => {
  const job = createJob({ siteName: 'Live Co', widgets: [] })
  assert.equal(getJob(job.id), job)
})

// Appending a unique query string forces Node's ESM loader to evaluate a fresh
// module instance (fresh `jobs` Map), while the unchanged `./jobStore.js` import
// inside it still resolves to the already-loaded singleton (same SQLite
// connection) — this simulates "a different server process" without needing to
// spawn one, exercising getJob's real post-restart fallback to loadJob.
test('getJob falls back to loadJob (SQLite) when the in-memory map does not have the job', { timeout: 2000 }, async () => {
  const job = createJob({ siteName: 'Restart Co', widgets: [] })
  const fresh = await import(`./provisioningJobs.js?fresh=${Date.now()}`)
  const recovered = fresh.getJob(job.id)
  assert.ok(recovered, 'expected the job to be recoverable from SQLite after the in-memory map is reset')
  assert.equal(recovered.tenantConfiguration.siteName, 'Restart Co')
  assert.equal(recovered.status, 'running')
})
```

- [ ] **Step 6: Run the tests**

Run: `cd "server" && npm test`
Expected: PASS — 26 tests passing (22 from before this task + 4 new).

- [ ] **Step 7: Run the full e2e suite to confirm no regression**

Run: `cd "client" && npm run test:e2e`
Expected: All 24 tests pass — `STEP_DELAY_MS` defaults to 900ms in this run (the e2e Playwright `webServer` config does not set `PROVISIONING_STEP_DELAY_MS`), so the real provisioning flow's timing is unchanged.

- [ ] **Step 8: Commit**

```bash
git add server/src/provisioningJobs.js server/src/provisioningJobs.test.js
git commit -m "test(server): add provisioning job state machine lifecycle tests"
```

---

## Self-Review Notes

**Spec coverage:**
- Vitest setup for the client → Task 1 ✅
- `sectionHelpers` direct tests → Task 1 ✅
- `pageHelpers` direct tests → Task 2 ✅
- Reducer: one test per action type + complex-logic/guard edge cases → Tasks 3-4 ✅ (all 18 `ACTIONS` keys covered: `ADD_WIDGET`, `REMOVE_WIDGET`, `REORDER_WIDGETS`, `MOVE_WIDGET`, `SELECT_WIDGET`, `DESELECT_WIDGET`, `UPDATE_WIDGET_PROP`, `ADD_SECTION`, `REMOVE_SECTION`, `CHANGE_SECTION_LAYOUT`, `SELECT_SECTION`, `ADD_PAGE`, `RENAME_PAGE`, `REMOVE_PAGE`, `SELECT_PAGE`, `MOVE_PAGE`, `SET_TENANT_META`, `EXPORT_CONFIGURATION`)
- `STEP_DELAY_MS` env-var override → Task 5 ✅
- Provisioning job lifecycle (`createJob`, happy-path completion, `getJob` in-memory, `getJob` SQLite fallback) → Task 5 ✅
- Graph-failure error path intentionally omitted, per the spec's Part 2 correction — no task adds it ✅
- No coverage tooling, no React component tests, no changes to `STEP_COUNT`/step sequence — consistent with Out of Scope, no task touches these ✅

**Type/interface consistency:** `makeState` is defined once in Task 3 and reused verbatim in Task 4 (same file). `ACTIONS`/`configuratorReducer` import paths match the real file (`./configuratorReducer.js`). `createJob`/`getJob`/`loadJob` signatures in Task 5's tests match their actual current implementations (verified directly against `server/src/provisioningJobs.js` and `server/src/jobStore.js`).

**No placeholders:** all steps contain literal file contents, exact test code, and exact commands; the query-string ESM cache-busting technique used in Task 5 was verified to work on this project's Node version before being included in this plan.
