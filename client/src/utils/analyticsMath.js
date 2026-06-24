export function computeDelta(value, previousValue) {
  if (!previousValue) return 0
  return Math.round(((value - previousValue) / previousValue) * 1000) / 10
}
