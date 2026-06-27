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
      emphasis: 'none',
      columns,
    }
  })

  return {
    canvasLayout: { horizontalSections },
    unmappedBlocks,
  }
}
