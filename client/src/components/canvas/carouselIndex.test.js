import { describe, test, expect } from 'vitest'
import { wrapIndex } from './carouselIndex.js'

describe('wrapIndex', () => {
  test('wraps backward past the first index to the last', () => {
    expect(wrapIndex(0, -1, 3)).toBe(2)
  })

  test('wraps forward past the last index to the first', () => {
    expect(wrapIndex(2, 1, 3)).toBe(0)
  })

  test('moves within bounds without wrapping', () => {
    expect(wrapIndex(1, 1, 3)).toBe(2)
  })
})
