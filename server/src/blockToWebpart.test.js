import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mapBlock, SEMANTIC_PAGE_FLAGS } from './blockToWebpart.js'

describe('mapBlock', () => {
  it('returns null for unknown blockId', () => {
    assert.equal(mapBlock({ blockId: 'non-existent-block' }), null)
  })

  it('maps news-corporate to News web part', () => {
    const result = mapBlock({ blockId: 'news-corporate', props: {}, dataSource: {} })
    assert.ok(result)
    assert.equal(result.webPartType, '8c88f208-6c77-4bdb-86a0-0c47b4316588')
    assert.ok(result.data.properties)
  })

  it('maps eventi-corporate to Events web part', () => {
    const result = mapBlock({ blockId: 'eventi-corporate' })
    assert.ok(result)
    assert.equal(result.webPartType, '20745d7d-8581-4a6c-bf26-68279bc914f0')
  })

  it('maps collegamenti-rapidi to Quick Links web part', () => {
    const result = mapBlock({ blockId: 'collegamenti-rapidi' })
    assert.ok(result)
    assert.equal(result.webPartType, 'c70391ea-0b10-4ee9-b2b4-006d3fcad0cd')
  })

  it('maps embed-custom with URL from dataSource', () => {
    const result = mapBlock({
      blockId: 'embed-custom',
      dataSource: { type: 'http-api', url: 'https://example.com/embed' },
    })
    assert.ok(result)
    assert.equal(result.data.properties.embedCode, 'https://example.com/embed')
  })

  it('maps titolo-libero to Text web part with content from props', () => {
    const result = mapBlock({
      blockId: 'titolo-libero',
      props: { content: [{ type: 'heading', text: 'Hello' }] },
    })
    assert.ok(result)
    assert.equal(result.webPartType, '1ef5ed11-ce7b-44be-bc5e-4abd55101d16')
  })

  it('returns an object with id (uuid v4) each call', () => {
    const r1 = mapBlock({ blockId: 'news-corporate' })
    const r2 = mapBlock({ blockId: 'news-corporate' })
    assert.ok(r1.id)
    assert.ok(r2.id)
    assert.notEqual(r1.id, r2.id)
  })

  it('maps contatti-chiave to People web part', () => {
    const result = mapBlock({ blockId: 'contatti-chiave', props: {} })
    assert.ok(result, 'result should not be null')
    assert.equal(result.webPartType, 'TODO-VERIFY-GUID')
    assert.ok(Array.isArray(result.data.properties.persons))
  })

  it('maps feedback-utenti to Forms web part', () => {
    const result = mapBlock({ blockId: 'feedback-utenti', props: {}, dataSource: { url: 'https://forms.office.com/r/abc' } })
    assert.ok(result)
    assert.equal(result.webPartType, 'b19b3b9e-8d13-4fec-a93c-401a091c0099')
    assert.equal(result.data.properties.formUrl, 'https://forms.office.com/r/abc')
  })
})

describe('SEMANTIC_PAGE_FLAGS', () => {
  it('exports an array', () => {
    assert.ok(Array.isArray(SEMANTIC_PAGE_FLAGS))
  })

  it('includes commenti-contenuto and like-contenuto', () => {
    assert.ok(SEMANTIC_PAGE_FLAGS.includes('commenti-contenuto'))
    assert.ok(SEMANTIC_PAGE_FLAGS.includes('like-contenuto'))
  })

  it('mapBlock returns null for semantic blocks (they are not mapped as WP nodes)', () => {
    assert.equal(mapBlock({ blockId: 'commenti-contenuto' }), null)
    assert.equal(mapBlock({ blockId: 'like-contenuto' }), null)
  })
})
