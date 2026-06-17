export function t2(field, lang) {
  if (!field || typeof field === 'string') return field ?? ''
  return field[lang] ?? field.it ?? ''
}
