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

  it('maps eventi-corporate to Group Calendar web part', () => {
    const result = mapBlock({ blockId: 'eventi-corporate' })
    assert.ok(result)
    assert.equal(result.webPartType, '6676088b-e28e-4a90-b9cb-d0d0303cd2eb')
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
    assert.equal(result['@odata.type'], '#microsoft.graph.textWebPart')
    assert.ok(result.innerHtml.includes('Hello'))
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
    assert.equal(result.webPartType, '7f718435-ee4d-431c-bdbf-9c4ff326f46e')
    assert.ok(Array.isArray(result.data.properties.persons))
  })

  it('maps feedback-utenti to Forms web part', () => {
    const result = mapBlock({ blockId: 'feedback-utenti', props: {}, dataSource: { url: 'https://forms.office.com/r/abc' } })
    assert.ok(result)
    assert.equal(result.webPartType, 'b19b3b9e-8d13-4fec-a93c-401a091c0099')
    assert.equal(result.data.properties.formUrl, 'https://forms.office.com/r/abc')
  })

  it('maps carosello-contenuti to Highlighted Content web part', () => {
    const result = mapBlock({ blockId: 'carosello-contenuti' })
    assert.ok(result)
    assert.equal(result.webPartType, 'daf0b71c-6de8-4ef7-b511-faae7c388708')
  })

  it('maps organigramma to Org Chart web part', () => {
    const result = mapBlock({ blockId: 'organigramma' })
    assert.ok(result)
    assert.equal(result.webPartType, 'e84a8ca2-f63c-4fb9-bc0b-d8eef5ccb22b')
    assert.equal(result.data.properties.datasource, 'graph')
  })

  it('maps countdown-lancio with targetDate and label from props', () => {
    const result = mapBlock({ blockId: 'countdown-lancio', props: { targetDate: '2026-12-31', label: 'Lancio' } })
    assert.ok(result)
    assert.equal(result.webPartType, '62cac389-787f-495d-beca-e11786162ef4')
    assert.equal(result.data.properties.date, '2026-12-31')
    assert.equal(result.data.properties.message, 'Lancio')
  })

  it('maps procedure with list URL from dataSource', () => {
    const result = mapBlock({ blockId: 'procedure', dataSource: { url: 'https://shareflowit.sharepoint.com/sites/test/Lists/Procedure' } })
    assert.ok(result)
    assert.equal(result.webPartType, 'f92bf067-bc19-489e-a556-7fe95f508720')
    assert.equal(result.data.properties.webUrl, 'https://shareflowit.sharepoint.com/sites/test/Lists/Procedure')
  })

  it('maps meteo with city from props', () => {
    const result = mapBlock({ blockId: 'meteo', props: { city: 'Milano' } })
    assert.ok(result)
    assert.equal(result.webPartType, '868ac3c3-cad7-4bd6-9a1c-14dc5cc8e823')
    assert.equal(result.data.properties.city, 'Milano')
  })

  it('maps fusi-orari with timezones array from props', () => {
    const result = mapBlock({ blockId: 'fusi-orari', props: { timezones: ['Europe/Rome', 'America/New_York'] } })
    assert.ok(result)
    assert.equal(result.webPartType, '81b57906-cbed-4bb1-9823-2e3314f46f28')
    assert.deepEqual(result.data.properties.clocks, ['Europe/Rome', 'America/New_York'])
  })

  it('maps sezione-fiere to Highlighted Content (same GUID as carosello-contenuti)', () => {
    const result = mapBlock({ blockId: 'sezione-fiere' })
    assert.ok(result)
    assert.equal(result.webPartType, 'daf0b71c-6de8-4ef7-b511-faae7c388708')
  })

  it('maps sezione-mostre to Highlighted Content (same GUID as sezione-fiere)', () => {
    const result = mapBlock({ blockId: 'sezione-mostre' })
    assert.ok(result)
    assert.equal(result.webPartType, 'daf0b71c-6de8-4ef7-b511-faae7c388708')
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

  it('includes multilingua', () => {
    assert.ok(SEMANTIC_PAGE_FLAGS.includes('multilingua'))
  })

  it('mapBlock returns null for multilingua (semantic block — no WP node)', () => {
    assert.equal(mapBlock({ blockId: 'multilingua' }), null)
  })
})
