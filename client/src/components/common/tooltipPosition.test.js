import { describe, test, expect } from 'vitest'
import { computeTooltipPosition } from './tooltipPosition.js'

describe('computeTooltipPosition', () => {
  test('anchors to the right of the rect, vertically centered, with the default 8px offset', () => {
    const rect = { top: 100, height: 40, right: 250 }
    expect(computeTooltipPosition(rect)).toEqual({ top: 120, left: 258 })
  })

  test('respects a custom offset', () => {
    const rect = { top: 0, height: 20, right: 50 }
    expect(computeTooltipPosition(rect, 16)).toEqual({ top: 10, left: 66 })
  })
})
