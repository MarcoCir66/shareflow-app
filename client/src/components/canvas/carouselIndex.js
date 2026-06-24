/** Wraps `current + delta` into the range [0, length - 1]. */
export function wrapIndex(current, delta, length) {
  return ((current + delta) % length + length) % length
}
