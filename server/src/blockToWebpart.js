import crypto from 'node:crypto'

// Native SharePoint web part type GUIDs.
// Verify via: GET /beta/sites/{id}/pages/{pageId}?$expand=canvasLayout
const WP = {
  NEWS:               '8c88f208-6c77-4bdb-86a0-0c47b4316588',
  EVENTS:             '20745d7d-8581-4a6c-bf26-68279bc914f0',
  QUICK_LINKS:        'c70391ea-0b10-4ee9-b2b4-006d3fcad0cd',
  TEXT:               '1ef5ed11-ce7b-44be-bc5e-4abd55101d16',
  BUTTON:             '0f087d7f-520e-42b7-89c0-1b892b68ca60',
  EMBED:              '490d7c76-1824-45b2-9de3-676421c997fa',
  DOCUMENT_LIBRARY:   'c9335c66-4e64-4c0c-a53b-63e1a32a7a5e',
  HIGHLIGHTED_CONTENT:'e377ea37-9047-43b9-8cdb-a761be2f8e09',
  FORMS:              'b19b3b9e-8d13-4fec-a93c-401a091c0099',
  STREAM:             '275c0095-a77e-4f6d-a2a0-6a7626911518',
  SEARCH_BOX:         '8f94f9ea-6fba-4aba-90f6-b21bdba5a0bd',
}

function node(webPartType, title, properties) {
  return {
    id: crypto.randomUUID(),
    innerHtml: '',
    webPartType,
    data: { dataVersion: '1.0', title, properties },
  }
}

function newsMapper(block) {
  const url = block.dataSource?.url ?? ''
  return node(WP.NEWS, 'News', {
    layoutId: 'FeaturedNews',
    dataProviderId: 'news',
    emptyStateHelpItemsCount: '1',
    showPublishDate: true,
    showChrome: true,
    newsDataSourceProp: url ? 4 : 1, // 4 = custom list, 1 = site news
    webUrl: url,
  })
}

function eventsMapper(block) {
  const url = block.dataSource?.url ?? ''
  const isCalendar = block.blockId === 'calendario-eventi'
  return node(WP.EVENTS, 'Events', {
    layoutId: isCalendar ? 'MonthView' : 'Filmstrip',
    dataProviderId: 'events',
    webUrl: url,
    showChrome: true,
  })
}

function textMapper(block) {
  const text = block.props?.content?.[0]?.text ?? block.props?.title ?? block.blockId
  return node(WP.TEXT, 'Text', {
    text: `<p>${text}</p>`,
    spaceBeforeSection: 3,
  })
}

function quickLinksMapper(block) {
  const items = (block.props?.items ?? []).map(item => ({
    title: item.label ?? item.title ?? '',
    url: item.url ?? '#',
  }))
  return node(WP.QUICK_LINKS, 'Quick Links', {
    items,
    layoutId: 'List',
    shouldShowThumbnail: true,
  })
}

function buttonMapper(block) {
  return node(WP.BUTTON, 'Button', {
    text: block.props?.label ?? 'Link',
    url: block.props?.url ?? '#',
    alignment: 'left',
  })
}

function embedMapper(block) {
  const url = block.dataSource?.url ?? block.props?.url ?? ''
  return node(WP.EMBED, 'Embed', {
    embedCode: url,
    cachedEmbedCode: url,
    shouldScaleWidth: true,
  })
}

function documentLibraryMapper(block) {
  const url = block.dataSource?.url ?? ''
  return node(WP.DOCUMENT_LIBRARY, 'Documents', {
    selectedDocumentLibraryTitle: 'Documents',
    webUrl: url,
    listUrl: url,
    showDefaultDocumentLibrary: !url,
  })
}

function highlightedContentMapper(block) {
  return node(WP.HIGHLIGHTED_CONTENT, 'Highlighted Content', {
    layoutId: 'Carousel',
    dataProviderId: 'highlighted-content',
    showChrome: true,
  })
}

function formsMapper(block) {
  const url = block.dataSource?.url ?? block.props?.formUrl ?? ''
  return node(WP.FORMS, 'Microsoft Forms', {
    formUrl: url,
    height: 500,
  })
}

function streamMapper(block) {
  const url = block.dataSource?.url ?? block.props?.channelUrl ?? ''
  return node(WP.STREAM, 'Stream', {
    url,
    showInfo: true,
    autoplay: false,
  })
}

function searchBoxMapper(_block) {
  return node(WP.SEARCH_BOX, 'Search Box', {
    placeholderText: 'Search...',
    searchOnChange: false,
  })
}

// Mapping table: blockId → mapper function
const MAPPINGS = {
  'news-corporate':      newsMapper,
  'news-country':        newsMapper,
  'news-sede':           newsMapper,
  'news-funzione':       newsMapper,
  'eventi-corporate':    eventsMapper,
  'eventi-country':      eventsMapper,
  'eventi-sede':         eventsMapper,
  'eventi-funzione':     eventsMapper,
  'calendario-eventi':   eventsMapper,
  'collegamenti-rapidi': quickLinksMapper,
  'pulsante-cta':        buttonMapper,
  'titolo-libero':       textMapper,
  'chi-siamo':           textMapper,
  'desc-country':        textMapper,
  'desc-sede':           textMapper,
  'desc-funzione':       textMapper,
  'documenti':           documentLibraryMapper,
  'embed-custom':        embedMapper,
  'motore-ricerca':      searchBoxMapper,
  'carosello-contenuti': highlightedContentMapper,
  'polls-survey':        formsMapper,
  'multimedia-gallery':  streamMapper,
}

/**
 * Maps a ShareFlow block to a SharePoint web part node.
 * Returns null if no mapping exists for this blockId.
 */
export function mapBlock(block) {
  const mapper = MAPPINGS[block.blockId]
  if (!mapper) return null
  return mapper(block)
}

export const MAPPED_BLOCK_IDS = Object.keys(MAPPINGS)
