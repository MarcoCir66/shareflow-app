/**
 * Builds a 7-column, Monday-first month grid.
 * Returns an array of weeks; each week is an array of 7 cells.
 * Leading/trailing cells from the previous/next month carry inMonth: false.
 */
export function getMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7 // 0 = Monday … 6 = Sunday

  const cells = []
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, inMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, inMonth: true })
  }
  let nextMonthDay = 1
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextMonthDay++, inMonth: false })
  }

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}
