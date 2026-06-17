export function t2(field, lang) {
  if (field == null) return ''
  if (typeof field === 'string') return field
  if (typeof field !== 'object') return String(field)
  return field[lang] ?? field.it ?? ''
}
