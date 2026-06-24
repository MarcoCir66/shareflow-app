import { test, expect } from 'vitest'
import { computeDelta } from './analyticsMath.js'

test('computeDelta returns the percentage change rounded to 1 decimal', () => {
  expect(computeDelta(115, 100)).toBe(15)
  expect(computeDelta(88, 100)).toBe(-12)
  expect(computeDelta(123, 100)).toBe(23)
})

test('computeDelta returns 0 when previousValue is 0, avoiding division by zero', () => {
  expect(computeDelta(50, 0)).toBe(0)
})
