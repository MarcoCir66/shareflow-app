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

  it('replaces unmapped blocks with placeholder text nodes', () => {
    const page = makePage('oneColumn', [
      { blockId: 'kudos' },
      { blockId: 'news-corporate' },
    ])
    const { canvasLayout } = buildCanvasLayout(page)
    const webparts = canvasLayout.horizontalSections[0].columns[0].webparts
    assert.equal(webparts.length, 2)
    // first = placeholder for unmapped 'kudos'
    assert.equal(webparts[0]['@odata.type'], '#microsoft.graph.textWebPart')
    // second = real news-corporate webpart
    assert.equal(webparts[1].webPartType, '8c88f208-6c77-4bdb-86a0-0c47b4316588')
  })

  it('returns empty horizontalSections for a page with no sections', () => {
    const { canvasLayout } = buildCanvasLayout({ sections: [] })
    assert.deepEqual(canvasLayout.horizontalSections, [])
  })

  it('silently skips commenti-contenuto — no placeholder, not in unmappedBlocks', () => {
    const page = makePage('oneColumn', [
      { blockId: 'commenti-contenuto' },
      { blockId: 'news-corporate', props: {} },
    ])
    const { canvasLayout, unmappedBlocks } = buildCanvasLayout(page)
    assert.equal(unmappedBlocks.includes('commenti-contenuto'), false)
    const webparts = canvasLayout.horizontalSections[0].columns[0].webparts
    assert.equal(webparts.length, 1, 'only news-corporate should produce a WP node')
    assert.equal(webparts[0].webPartType, '8c88f208-6c77-4bdb-86a0-0c47b4316588')
  })

  it('silently skips like-contenuto — no placeholder, not in unmappedBlocks', () => {
    const page = makePage('oneColumn', [{ blockId: 'like-contenuto' }])
    const { canvasLayout, unmappedBlocks } = buildCanvasLayout(page)
    assert.equal(unmappedBlocks.includes('like-contenuto'), false)
    assert.equal(canvasLayout.horizontalSections[0].columns[0].webparts.length, 0)
  })

  it('returns pageFlags.commentsEnabled true when commenti-contenuto is present', () => {
    const page = makePage('oneColumn', [{ blockId: 'commenti-contenuto' }])
    const { pageFlags } = buildCanvasLayout(page)
    assert.equal(pageFlags.commentsEnabled, true)
    assert.equal(pageFlags.reactionsEnabled, false)
  })

  it('returns pageFlags.reactionsEnabled true when like-contenuto is present', () => {
    const page = makePage('oneColumn', [{ blockId: 'like-contenuto' }])
    const { pageFlags } = buildCanvasLayout(page)
    assert.equal(pageFlags.commentsEnabled, false)
    assert.equal(pageFlags.reactionsEnabled, true)
  })

  it('returns pageFlags with both false when neither semantic block is present', () => {
    const page = makePage('oneColumn', [{ blockId: 'news-corporate', props: {} }])
    const { pageFlags } = buildCanvasLayout(page)
    assert.equal(pageFlags.commentsEnabled, false)
    assert.equal(pageFlags.reactionsEnabled, false)
  })

  it('returns pageFlags.mlpEnabled true when multilingua block is present', () => {
    const page = makePage('oneColumn', [{ blockId: 'multilingua' }])
    const { pageFlags } = buildCanvasLayout(page)
    assert.equal(pageFlags.mlpEnabled, true)
    assert.equal(pageFlags.commentsEnabled, false)
  })

  it('returns pageFlags.mlpEnabled false when multilingua is absent', () => {
    const page = makePage('oneColumn', [{ blockId: 'news-corporate', props: {} }])
    const { pageFlags } = buildCanvasLayout(page)
    assert.equal(pageFlags.mlpEnabled, false)
  })

  it('silently skips multilingua — no placeholder, not in unmappedBlocks, produces no WP node', () => {
    const page = makePage('oneColumn', [
      { blockId: 'multilingua' },
      { blockId: 'news-corporate', props: {} },
    ])
    const { canvasLayout, unmappedBlocks } = buildCanvasLayout(page)
    assert.equal(unmappedBlocks.includes('multilingua'), false)
    const webparts = canvasLayout.horizontalSections[0].columns[0].webparts
    assert.equal(webparts.length, 1)
    assert.equal(webparts[0].webPartType, '8c88f208-6c77-4bdb-86a0-0c47b4316588')
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

  it('dark pageColor (#15140f): all sections none (SP dark mode uses bodyBackground for none)', () => {
    const { canvasLayout } = buildCanvasLayout(twoSections, { pageColor: '#15140f' })
    for (const s of canvasLayout.horizontalSections) assert.equal(s.emphasis, 'none')
  })

  it('mid-tone pageColor (#b0b0b0): all sections neutral', () => {
    const { canvasLayout } = buildCanvasLayout(twoSections, { pageColor: '#b0b0b0' })
    for (const s of canvasLayout.horizontalSections) assert.equal(s.emphasis, 'neutral')
  })

  it('light pageColor (#ffffff): all sections none', () => {
    const { canvasLayout } = buildCanvasLayout(twoSections, { pageColor: '#ffffff' })
    for (const s of canvasLayout.horizontalSections) assert.equal(s.emphasis, 'none')
  })
})
