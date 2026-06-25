/**
 * Deterministic mock completion percentage for a widget instance, in the
 * 40-95 range (avoids suspicious-looking 0%/100% values). Same instanceId
 * always yields the same percentage; no Math.random.
 */
export function hashToCompletionPercent(instanceId) {
  let hash = 0
  for (let i = 0; i < instanceId.length; i++) {
    hash = (hash * 31 + instanceId.charCodeAt(i)) % 1000003
  }
  return 40 + (hash % 56)
}
