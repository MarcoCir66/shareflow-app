import { test, expect } from 'vitest'
import { validateSpUrl } from './spUrl.js'

test('accetta URL .sharepoint.com con https', () => {
  expect(validateSpUrl('https://contoso.sharepoint.com')).toBe(true)
})

test('accetta URL con path dopo il dominio', () => {
  expect(validateSpUrl('https://contoso.sharepoint.com/sites/intranet')).toBe(true)
})

test('rifiuta URL senza https', () => {
  expect(validateSpUrl('http://contoso.sharepoint.com')).toBe(false)
})

test('rifiuta URL senza .sharepoint.com', () => {
  expect(validateSpUrl('https://contoso.example.com')).toBe(false)
})

test('rifiuta stringa vuota', () => {
  expect(validateSpUrl('')).toBe(false)
})

test('rifiuta undefined / null', () => {
  expect(validateSpUrl(null)).toBe(false)
  expect(validateSpUrl(undefined)).toBe(false)
})
