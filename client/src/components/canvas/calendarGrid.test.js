import { describe, test, expect } from 'vitest'
import { getMonthGrid } from './calendarGrid.js'

describe('getMonthGrid', () => {
  test('a month starting on Monday has no leading padding (June 2026)', () => {
    const weeks = getMonthGrid(2026, 5) // month is 0-indexed: 5 = June
    expect(weeks).toHaveLength(5)
    expect(weeks[0]).toEqual([
      { day: 1, inMonth: true }, { day: 2, inMonth: true }, { day: 3, inMonth: true },
      { day: 4, inMonth: true }, { day: 5, inMonth: true }, { day: 6, inMonth: true }, { day: 7, inMonth: true },
    ])
    expect(weeks[4]).toEqual([
      { day: 29, inMonth: true }, { day: 30, inMonth: true },
      { day: 1, inMonth: false }, { day: 2, inMonth: false }, { day: 3, inMonth: false },
      { day: 4, inMonth: false }, { day: 5, inMonth: false },
    ])
  })

  test('a leap-year February has 3 days of leading padding (February 2024)', () => {
    const weeks = getMonthGrid(2024, 1) // month is 0-indexed: 1 = February
    expect(weeks).toHaveLength(5)
    expect(weeks[0]).toEqual([
      { day: 29, inMonth: false }, { day: 30, inMonth: false }, { day: 31, inMonth: false },
      { day: 1, inMonth: true }, { day: 2, inMonth: true }, { day: 3, inMonth: true }, { day: 4, inMonth: true },
    ])
    expect(weeks[4]).toEqual([
      { day: 26, inMonth: true }, { day: 27, inMonth: true }, { day: 28, inMonth: true }, { day: 29, inMonth: true },
      { day: 1, inMonth: false }, { day: 2, inMonth: false }, { day: 3, inMonth: false },
    ])
  })
})
