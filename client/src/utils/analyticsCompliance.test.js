import { test, expect } from 'vitest'
import { hashToCompletionPercent } from './analyticsCompliance.js'

test('hashToCompletionPercent is deterministic for the same input', () => {
  expect(hashToCompletionPercent('w1')).toBe(hashToCompletionPercent('w1'))
})

test('hashToCompletionPercent stays within the 40-95 range for many inputs', () => {
  for (let i = 0; i < 200; i++) {
    const pct = hashToCompletionPercent(`instance-${i}`)
    expect(pct).toBeGreaterThanOrEqual(40)
    expect(pct).toBeLessThanOrEqual(95)
  }
})

test('hashToCompletionPercent differs across most distinct inputs', () => {
  const values = new Set(Array.from({ length: 50 }, (_, i) => hashToCompletionPercent(`instance-${i}`)))
  expect(values.size).toBeGreaterThan(10)
})
