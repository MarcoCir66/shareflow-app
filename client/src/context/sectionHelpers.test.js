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
