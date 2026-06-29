import crypto from 'node:crypto'
import { mapBlock } from './blockToWebpart.js'

const LAYOUT_MAP = {
  oneColumn:     { spLayout: 'oneColumn',           widths: [12] },
  twoColumn:     { spLayout: 'twoColumns',          widths: [6, 6] },
  threeColumn:   { spLayout: 'threeColumns',        widths: [4, 4, 4] },
  oneThirdLeft:  { spLayout: 'oneThirdLeftColumn',  widths: [4, 8] },
  oneThirdRight: { spLayout: 'oneThirdRightColumn', widths: [8, 4] },
  accordion:     { spLayout: 'oneColumn',           widths: [12] },
}

function hexToRgb(hex) {
  const raw = (hex || '#ffffff').replace('#', '')
  const h = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

function hexLuminance(hex) {
  if (!hex || hex.length < 4) return 1
  const [r, g, b] = hexToRgb(hex).map(c =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function sectionEmphasis(pageColor, idx) {
  if (!pageColor) return 'none'
  if (idx % 2 === 0) return 'none'
  const lum = hexLuminance(pageColor)
  if (lum < 0.35) return 'soft'
  if (lum < 0.65) return 'neutral'
  return 'none'
}

function placeholderTextNode(blockId) {
  return {
    '@odata.type': '#microsoft.graph.textWebPart',
    id: crypto.randomUUID(),
    innerHtml: `<p><em>[${blockId}]</em></p>`,
  }
}

/**
 * Converts a ShareFlow page (with sections/columns/widgets) into a
 * SharePoint Graph API canvasLayout object.
 *
 * @param {object} page - ShareFlow page with sections array
 * @returns {{ canvasLayout: object, unmappedBlocks: string[] }}
 */
export function buildCanvasLayout(page, ctx) {
  const unmappedBlocks = []
  const seenUnmapped = new Set()
  let colIdCounter = 1

  const horizontalSections = (page.sections ?? []).map((section, sIdx) => {
    const layoutInfo = LAYOUT_MAP[section.layout] ?? LAYOUT_MAP.oneColumn
    const columns = (section.columns ?? []).map((col, cIdx) => {
      const webparts = (col.widgets ?? []).reduce((acc, widget) => {
        if (widget.props?.visible === false) return acc

        const node = mapBlock(widget, ctx)
        if (!node) {
          if (!seenUnmapped.has(widget.blockId)) {
            unmappedBlocks.push(widget.blockId)
            seenUnmapped.add(widget.blockId)
          }
          return [...acc, placeholderTextNode(widget.blockId)]
        }
        return [...acc, node]
      }, [])

      return {
        id: String(colIdCounter++),
        width: layoutInfo.widths[cIdx] ?? 12,
        webparts,
      }
    })

    return {
      id: String(sIdx + 1),
      layout: layoutInfo.spLayout,
      emphasis: sectionEmphasis(ctx?.pageColor ?? null, sIdx),
      columns,
    }
  })

  return {
    canvasLayout: { horizontalSections },
    unmappedBlocks,
  }
}
