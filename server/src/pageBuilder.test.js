import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildCanvasLayout } from './pageBuilder.js'

const makePage = (layout, blocks) => ({
  sections: [{
    sectionId: 's1',
    layout,
    columns: [{ columnId: 'c1', widgets: blocks }],
  }],
})

describe('buildCanvasLayout', () => {
  it('returns canvasLayout with one horizontalSection per ShareFlow section', () => {
    const page = makePage('oneColumn', [{ blockId: 'news-corporate', props: {} }])
    const { canvasLayout } = buildCanvasLayout(page)
    assert.equal(canvasLayout.horizontalSections.length, 1)
  })

  it('maps oneColumn layout to SharePoint oneColumn', () => {
    const page = makePage('oneColumn', [{ blockId: 'titolo-libero', props: {} }])
    const { canvasLayout } = buildCanvasLayout(page)
    assert.equal(canvasLayout.horizontalSections[0].layout, 'oneColumn')
    assert.equal(canvasLayout.horizontalSections[0].columns[0].width, 12)
  })

  it('maps twoColumn layout to twoColumns with width 6 each', () => {
    const page = {
      sections: [{
        sectionId: 's1',
        layout: 'twoColumn',
        columns: [
          { columnId: 'c1', widgets: [{ blockId: 'news-corporate' }] },
          { columnId: 'c2', widgets: [{ blockId: 'titolo-libero' }] },
        ],
      }],
    }
    const { canvasLayout } = buildCanvasLayout(page)
    const section = canvasLayout.horizontalSections[0]
    assert.equal(section.layout, 'twoColumns')
    assert.equal(section.columns[0].width, 6)
    assert.equal(section.columns[1].width, 6)
  })

  it('collects unmapped blocks by blockId', () => {
    const page = makePage('oneColumn', [
      { blockId: 'news-corporate' },
      { blockId: 'kudos' },
      { blockId: 'anniversari' },
    ])
    const { unmappedBlocks } = buildCanvasLayout(page)
    assert.deepEqual(unmappedBlocks.sort(), ['anniversari', 'kudos'])
  })

  it('skips unmapped blocks in the layout', () => {
    const page = makePage('oneColumn', [
      { blockId: 'kudos' },
      { blockId: 'news-corporate' },
    ])
    const { canvasLayout } = buildCanvasLayout(page)
    const webparts = canvasLayout.horizontalSections[0].columns[0].webparts
    assert.equal(webparts.length, 1)
    assert.equal(webparts[0].webPartType, '8c88f208-6c77-4bdb-86a0-0c47b4316588')
  })

  it('returns empty horizontalSections for a page with no sections', () => {
    const { canvasLayout } = buildCanvasLayout({ sections: [] })
    assert.deepEqual(canvasLayout.horizontalSections, [])
  })
})

describe('buildCanvasLayout section emphasis', () => {
  const twoSections = {
    sections: [
      { sectionId: 's1', layout: 'oneColumn', columns: [{ columnId: 'c1', widgets: [] }] },
      { sectionId: 's2', layout: 'oneColumn', columns: [{ columnId: 'c2', widgets: [] }] },
    ],
  }

  it('all none when no pageColor in ctx', () => {
    const { canvasLayout } = buildCanvasLayout(twoSections)
    for (const s of canvasLayout.horizontalSections) assert.equal(s.emphasis, 'none')
  })

  it('all none when ctx.pageColor is null', () => {
    const { canvasLayout } = buildCanvasLayout(twoSections, { pageColor: null })
    for (const s of canvasLayout.horizontalSections) assert.equal(s.emphasis, 'none')
  })

  it('dark pageColor (#15140f): even sections none, odd sections soft', () => {
    const { canvasLayout } = buildCanvasLayout(twoSections, { pageColor: '#15140f' })
    assert.equal(canvasLayout.horizontalSections[0].emphasis, 'none')
    assert.equal(canvasLayout.horizontalSections[1].emphasis, 'soft')
  })

  it('mid-tone pageColor (#b0b0b0): even sections none, odd sections neutral', () => {
    const { canvasLayout } = buildCanvasLayout(twoSections, { pageColor: '#b0b0b0' })
    assert.equal(canvasLayout.horizontalSections[0].emphasis, 'none')
    assert.equal(canvasLayout.horizontalSections[1].emphasis, 'neutral')
  })

  it('light pageColor (#ffffff): all sections none', () => {
    const { canvasLayout } = buildCanvasLayout(twoSections, { pageColor: '#ffffff' })
    for (const s of canvasLayout.horizontalSections) assert.equal(s.emphasis, 'none')
  })
})
