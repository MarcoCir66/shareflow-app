import { test, expect } from 'vitest'
import { TOUR_STEPS } from './tourSteps.js'

const VALID_POSITIONS = ['top', 'bottom', 'left', 'right']

test('TOUR_STEPS has exactly 5 entries', () => {
  expect(TOUR_STEPS).toHaveLength(5)
})

test('every step has required fields', () => {
  for (const step of TOUR_STEPS) {
    expect(typeof step.id).toBe('string')
    expect(step.id.length).toBeGreaterThan(0)
    expect(typeof step.targetSelector).toBe('string')
    expect(VALID_POSITIONS).toContain(step.popoverPosition)
  }
})

test('step ids are unique', () => {
  const ids = TOUR_STEPS.map(s => s.id)
  expect(new Set(ids).size).toBe(ids.length)
})

test('targetSelector matches data-tour id convention', () => {
  for (const step of TOUR_STEPS) {
    expect(step.targetSelector).toBe(`[data-tour="${step.id}"]`)
  }
})

test('steps are in expected order', () => {
  const ids = TOUR_STEPS.map(s => s.id)
  expect(ids).toEqual([
    'block-library',
    'canvas',
    'properties-panel',
    'preview-btn',
    'deploy-btn',
  ])
})
