import { test, expect } from 'vitest'
import { findWidgetLocation, mapColumn, flattenWidgets, collectMandatoryBlocks } from './sectionHelpers.js'

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
