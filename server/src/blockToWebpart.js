import crypto from 'node:crypto'

// Native SharePoint web part type GUIDs.
// Verify via: GET /beta/sites/{id}/pages/{pageId}?$expand=canvasLayout
const WP = {
  NEWS:               '8c88f208-6c77-4bdb-86a0-0c47b4316588',
  GROUP_CALENDAR:     '6676088b-e28e-4a90-b9cb-d0d0303cd2eb', // "Calendario di gruppo" — reads M365 Group Exchange calendar
  QUICK_LINKS:        'c70391ea-0b10-4ee9-b2b4-006d3fcad0cd',
  TEXT:               '1ef5ed11-ce7b-44be-bc5e-4abd55101d16',
  BUTTON:             '0f087d7f-520e-42b7-89c0-1b892b68ca60',
  EMBED:              '490d7c76-1824-45b2-9de3-676421c997fa',
  DOCUMENT_LIBRARY:   'c9335c66-4e64-4c0c-a53b-63e1a32a7a5e',
  HIGHLIGHTED_CONTENT:'daf0b71c-6de8-4ef7-b511-faae7c388708',
  FORMS:              'b19b3b9e-8d13-4fec-a93c-401a091c0099',
  STREAM:             '275c0095-a77e-4f6d-a2a0-6a7626911518',
  SEARCH_BOX:         '8f94f9ea-6fba-4aba-90f6-b21bdba5a0bd',
  PEOPLE:             '7f718435-ee4d-431c-bdbf-9c4ff326f46e',
}

function node(webPartType, title, properties) {
  return {
    id: crypto.randomUUID(),
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

function eventsMapper(_block, ctx) {
  return node(WP.GROUP_CALENDAR, 'Calendario di gruppo', {
    selectedGroupId: ctx?.groupId ?? '',
    selectedGroupName: ctx?.groupName ?? '',
    selectedGroupEmail: '',
    accessType: 'private',
    showPerPage: 3,
    title: '',
    timeSpanLimitInMonth: 6,
    useContextualGroup: false,
  })
}

function textMapper(block) {
  const text = block.props?.content?.[0]?.text ?? block.props?.title ?? block.blockId
  return {
    '@odata.type': '#microsoft.graph.textWebPart',
    id: crypto.randomUUID(),
    innerHtml: `<p>${text}</p>`,
  }
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

function peopleMapper(_block) {
  return node(WP.PEOPLE, 'People', {
    persons: [],
    layout: 0,
    hideEmptyFields: false,
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
  'contatti-chiave':     peopleMapper,
  'feedback-utenti':     formsMapper,
}

/**
 * Maps a ShareFlow block to a SharePoint web part node.
 * Returns null if no mapping exists for this blockId.
 * @param {object} block
 * @param {{ siteUrl?: string }} [ctx] - optional provisioning context
 */
export function mapBlock(block, ctx) {
  const mapper = MAPPINGS[block.blockId]
  if (!mapper) return null
  return mapper(block, ctx)
}

export const MAPPED_BLOCK_IDS = Object.keys(MAPPINGS)

export const SEMANTIC_PAGE_FLAGS = ['commenti-contenuto', 'like-contenuto']
