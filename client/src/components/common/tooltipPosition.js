/** Computes a fixed-position anchor to the right of an element, vertically centered. */
export function computeTooltipPosition(rect, offset = 8) {
  return {
    top: rect.top + rect.height / 2,
    left: rect.right + offset,
  }
}
