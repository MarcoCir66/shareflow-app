/**
 * crypto.randomUUID() requires a secure context (HTTPS or localhost) — it is
 * undefined on plain-HTTP non-localhost origins (e.g. a LAN IP), which this
 * app's internal/VPN-only deployment model explicitly anticipates. Falls
 * back to a manual RFC 4122 v4 generator in that case.
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.random() * 16 | 0
    const value = char === 'x' ? random : (random & 0x3 | 0x8)
    return value.toString(16)
  })
}
