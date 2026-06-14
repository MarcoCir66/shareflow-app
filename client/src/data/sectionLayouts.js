/** @type {Record<string, {label:string, columns:number, gridCols:string, widths:string[]}>} */
export const SECTION_LAYOUTS = {
  oneColumn:     { label: 'Una colonna', columns: 1, gridCols: 'grid-cols-1',         widths: ['full'] },
  twoColumn:     { label: 'Due colonne', columns: 2, gridCols: 'grid-cols-2',         widths: ['half', 'half'] },
  threeColumn:   { label: 'Tre colonne', columns: 3, gridCols: 'grid-cols-3',         widths: ['third', 'third', 'third'] },
  oneThirdLeft:  { label: '1/3 + 2/3',   columns: 2, gridCols: 'grid-cols-[1fr_2fr]', widths: ['third', 'twoThirds'] },
  oneThirdRight: { label: '2/3 + 1/3',   columns: 2, gridCols: 'grid-cols-[2fr_1fr]', widths: ['twoThirds', 'third'] },
}
