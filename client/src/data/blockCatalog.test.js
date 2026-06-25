import { test, expect } from 'vitest'
import { blockCatalog } from './blockCatalog.js'

test('every block in the catalog supports mandatoryRead, defaulting to false', () => {
  expect(blockCatalog.length).toBeGreaterThan(0)
  for (const block of blockCatalog) {
    expect(block.defaultProps).toHaveProperty('mandatoryRead', false)
    expect(block.configurableProps).toContain('mandatoryRead')
  }
})
