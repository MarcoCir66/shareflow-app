/**
 * Pure helpers for navigating/updating the flat, DFS-ordered `pages` tree.
 */
import { arrayMove } from '@dnd-kit/sortable'
import { flattenWidgets } from './sectionHelpers.js'
import { resolveTheme } from '../data/themeTemplates.js'

const ROOT_KEY = '__root__'

/** Lowercases, trims, collapses non-alphanumeric runs into '-', strips leading/trailing '-'. */
export function slugify(title) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pagina'
}

/** Appends -2, -3, ... to baseSlug until no other page (excluding excludePageId) has that slug. */
export function uniqueSlug(pages, baseSlug, excludePageId = null) {
  let slug = baseSlug
  let n = 2
  while (pages.some(p => p.pageId !== excludePageId && p.slug === slug)) {
    slug = `${baseSlug}-${n++}`
  }
  return slug
}

/** Returns the page with the given pageId, or null. */
export function findPage(pages, pageId) {
  return pages.find(p => p.pageId === pageId) ?? null
}

/** Returns true if any page has parentId === pageId. */
export function hasChildren(pages, pageId) {
  return pages.some(p => p.parentId === pageId)
}

/** Returns the nesting depth (0 = root) by walking the parentId chain. */
export function getDepth(pages, pageId) {
  let depth = 0
  let current = findPage(pages, pageId)
  while (current && current.parentId !== null) {
    depth++
    current = findPage(pages, current.parentId)
  }
  return depth
}

/** Converts the flat DFS-ordered `pages` array into a nested tree: [{...page, children: []}]. */
export function buildPageTree(pages) {
  const byParent = new Map()
  for (const page of pages) {
    const key = page.parentId ?? ROOT_KEY
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(page)
  }
  function attachChildren(page) {
    return { ...page, children: (byParent.get(page.pageId) ?? []).map(attachChildren) }
  }
  return (byParent.get(ROOT_KEY) ?? []).map(attachChildren)
}

/** Given the index of a page in the flat DFS array, returns the index of the last element in its subtree. */
export function getSubtreeEndIndex(pages, index) {
  const baseDepth = getDepth(pages, pages[index].pageId)
  let end = index
  for (let i = index + 1; i < pages.length; i++) {
    if (getDepth(pages, pages[i].pageId) <= baseDepth) break
    end = i
  }
  return end
}

/**
 * Moves the contiguous subtree rooted at `activeId` so that it sits adjacent
 * to `overId` in the flat array, preserving the moved block's internal order.
 * Does NOT reassign parentId — the caller resolves the new parentId for the
 * subtree root separately (see resolveParentAtDepth).
 */
export function moveSubtree(pages, activeId, overId) {
  const activeIndex = pages.findIndex(p => p.pageId === activeId)
  const overIndex = pages.findIndex(p => p.pageId === overId)
  if (activeIndex === -1 || overIndex === -1) return pages

  const subtreeEnd = getSubtreeEndIndex(pages, activeIndex)
  if (overIndex >= activeIndex && overIndex <= subtreeEnd) return pages // dropped on self/descendant

  const block = pages.slice(activeIndex, subtreeEnd + 1)
  const without = [...pages.slice(0, activeIndex), ...pages.slice(subtreeEnd + 1)]

  let targetIndex = without.findIndex(p => p.pageId === overId)
  if (overIndex > subtreeEnd) targetIndex += 1 // dragging down: land after overId

  return [...without.slice(0, targetIndex), ...block, ...without.slice(targetIndex)]
}

/**
 * Given the post-move flat array and the index of the moved subtree's root,
 * returns the parentId an item at `index` would need to have `depth` nesting
 * levels — the nearest preceding item at depth - 1, or null if depth === 0.
 */
export function resolveParentAtDepth(pages, index, depth) {
  if (depth === 0) return null
  for (let i = index - 1; i >= 0; i--) {
    if (getDepth(pages, pages[i].pageId) === depth - 1) {
      return pages[i].pageId
    }
  }
  return null
}

/**
 * dnd-kit "sortable tree" projection: given the flat array and a drag in
 * progress (active item hovering over `overId` with horizontal offset
 * `dragOffsetX`), returns the depth/parentId the active item would land at
 * if dropped now.
 */
export function getProjection(pages, activeId, overId, dragOffsetX, indentationWidth) {
  const activeIndex = pages.findIndex(p => p.pageId === activeId)
  const overIndex = pages.findIndex(p => p.pageId === overId)

  const newItems = arrayMove(pages, activeIndex, overIndex)
  const previousItem = newItems[overIndex - 1]
  const nextItem = newItems[overIndex + 1]

  const dragDepth = Math.round(dragOffsetX / indentationWidth)
  const projectedDepth = getDepth(pages, activeId) + dragDepth

  const maxDepth = previousItem ? getDepth(pages, previousItem.pageId) + 1 : 0
  const minDepth = nextItem ? getDepth(pages, nextItem.pageId) : 0

  let depth = projectedDepth
  if (depth > maxDepth) depth = maxDepth
  if (depth < minDepth) depth = minDepth

  return { depth, parentId: resolveParentId() }

  function resolveParentId() {
    if (depth === 0 || !previousItem) return null
    const previousDepth = getDepth(pages, previousItem.pageId)
    if (depth === previousDepth) return previousItem.parentId
    if (depth > previousDepth) return previousItem.pageId
    const ancestor = newItems
      .slice(0, overIndex)
      .reverse()
      .find(item => getDepth(pages, item.pageId) === depth - 1)
    return ancestor?.pageId ?? null
  }
}

/** Converts the page tree into the { pageId, title, slug, children } shape used by MegaMenuPanel and the deploy export. */
export function buildNavigationExport(pages) {
  return buildPageTree(pages).map(toNavNode)
}

function toNavNode({ pageId, title, slug, children }) {
  return { pageId, title, slug, children: children.map(toNavNode) }
}

/**
 * Builds the export payload for the deploy flow: per-page widget lists plus
 * a flat, globally-ordered `widgets` array (backward compatible with the
 * server's single-list provisioning step).
 */
export function buildTenantExport(pages, tenantConfiguration, activePageId) {
  const pagesExport = pages.map(page => ({
    pageId: page.pageId,
    title: page.title,
    slug: page.slug,
    parentId: page.parentId,
    sections: page.sections,
    widgets: flattenWidgets(page.sections),
  }))
  // Home page = first root-level page, regardless of which tab is active in the UI
  const homePageId = pages.find(p => p.parentId == null)?.pageId ?? activePageId ?? null
  // Resolve effective colors from template defaults so server always receives concrete values
  const { accentColor, pageColor } = resolveTheme(tenantConfiguration.theme)
  return {
    ...tenantConfiguration,
    theme: { ...tenantConfiguration.theme, accentColor, pageColor },
    activePageId: homePageId,
    pages: pagesExport,
    navigation: buildNavigationExport(pages),
    widgets: pagesExport.flatMap(p => p.widgets).map((w, i) => ({ ...w, order: i })),
  }
}
