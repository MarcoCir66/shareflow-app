import { test, expect } from 'vitest'
import { generateId } from './id.js'

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

test('returns a UUID-shaped string when crypto.randomUUID is available', () => {
  expect(generateId()).toMatch(UUID_SHAPE)
})

test('returns a UUID-shaped string when crypto.randomUUID is unavailable (insecure context)', () => {
  const original = globalThis.crypto.randomUUID
  globalThis.crypto.randomUUID = undefined
  try {
    expect(generateId()).toMatch(UUID_SHAPE)
  } finally {
    globalThis.crypto.randomUUID = original
  }
})

test('generates distinct ids across repeated calls without crypto.randomUUID', () => {
  const original = globalThis.crypto.randomUUID
  globalThis.crypto.randomUUID = undefined
  try {
    const ids = Array.from({ length: 50 }, () => generateId())
    expect(new Set(ids).size).toBe(ids.length)
  } finally {
    globalThis.crypto.randomUUID = original
  }
})
