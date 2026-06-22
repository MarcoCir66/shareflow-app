import { test, expect } from 'vitest'
import { configuratorReducer, ACTIONS } from './configuratorReducer.js'
import { blockById } from '../data/blockCatalog.js'
import { pageTemplateById } from '../data/pageTemplates.js'
import { siteTemplateById } from '../data/siteTemplates.js'

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

function collectIds(sections) {
  return sections.flatMap(s => [
    s.sectionId,
    ...s.columns.flatMap(c => [c.columnId, ...c.widgets.map(w => w.instanceId)]),
  ])
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

test('ADD_WIDGET still works when crypto.randomUUID is unavailable (insecure context, e.g. a plain-HTTP LAN origin)', () => {
  const original = globalThis.crypto.randomUUID
  globalThis.crypto.randomUUID = undefined
  try {
    const state = makeState()
    const next = configuratorReducer(state, {
      type: ACTIONS.ADD_WIDGET,
      payload: { blockId: 'faq', sectionId: 'section-1', columnId: 'col-1' },
    })
    const widgets = next.pages[0].sections[0].columns[0].widgets
    expect(widgets).toHaveLength(1)
    expect(widgets[0].instanceId).toBeTruthy()
    expect(new Set(widgets.map(w => w.instanceId)).size).toBe(widgets.length)
  } finally {
    globalThis.crypto.randomUUID = original
  }
})

test('documenti block is wired into both the hr-portal and onboarding page templates', () => {
  const hrBlocks = pageTemplateById['hr-portal'].sections.flatMap(s => s.blocks.flat())
  const onboardingBlocks = pageTemplateById['onboarding'].sections.flatMap(s => s.blocks.flat())
  expect(hrBlocks).toContain('documenti')
  expect(onboardingBlocks).toContain('documenti')
})
