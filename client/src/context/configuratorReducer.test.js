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
