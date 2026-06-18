import { test, expect } from 'vitest'
import {
  slugify, uniqueSlug, hasChildren, getSubtreeEndIndex, moveSubtree, resolveParentAtDepth, buildTenantExport,
} from './pageHelpers.js'

test('slugify lowercases, trims, and collapses non-alphanumeric runs into hyphens', () => {
  expect(slugify('  Hello World!! ')).toBe('hello-world')
})

test('slugify returns "pagina" for a title with no alphanumeric characters', () => {
  expect(slugify('!!!')).toBe('pagina')
})

test('uniqueSlug returns the base slug when there is no collision', () => {
  const pages = [{ pageId: 'p1', slug: 'home' }]
  expect(uniqueSlug(pages, 'about')).toBe('about')
})

test('uniqueSlug appends -2, -3 until the slug is free', () => {
  const pages = [{ pageId: 'p1', slug: 'home' }, { pageId: 'p2', slug: 'home-2' }]
  expect(uniqueSlug(pages, 'home')).toBe('home-3')
})

test('uniqueSlug excludes the given pageId from collision checks', () => {
  const pages = [{ pageId: 'p1', slug: 'home' }]
  expect(uniqueSlug(pages, 'home', 'p1')).toBe('home')
})

test('hasChildren returns true when a page has parentId pointing to the given id', () => {
  const pages = [{ pageId: 'p1', parentId: null }, { pageId: 'p2', parentId: 'p1' }]
  expect(hasChildren(pages, 'p1')).toBe(true)
})

test('hasChildren returns false for a leaf page', () => {
  const pages = [{ pageId: 'p1', parentId: null }, { pageId: 'p2', parentId: 'p1' }]
  expect(hasChildren(pages, 'p2')).toBe(false)
})

test('getSubtreeEndIndex returns the index itself for a page with no descendants', () => {
  const pages = [{ pageId: 'p1', parentId: null }, { pageId: 'p2', parentId: null }]
  expect(getSubtreeEndIndex(pages, 0)).toBe(0)
})

test('getSubtreeEndIndex returns the last index of a nested subtree', () => {
  const pages = [
    { pageId: 'p1', parentId: null },
    { pageId: 'p2', parentId: 'p1' },
    { pageId: 'p3', parentId: 'p2' },
    { pageId: 'p4', parentId: null },
  ]
  expect(getSubtreeEndIndex(pages, 0)).toBe(2)
})

test('moveSubtree moves a subtree to sit after the target page', () => {
  const pages = [
    { pageId: 'p1', parentId: null },
    { pageId: 'p2', parentId: null },
    { pageId: 'p3', parentId: null },
  ]
  const result = moveSubtree(pages, 'p1', 'p3')
  expect(result.map(p => p.pageId)).toEqual(['p2', 'p3', 'p1'])
})

test('moveSubtree returns the same array when dropped on its own descendant', () => {
  const pages = [
    { pageId: 'p1', parentId: null },
    { pageId: 'p2', parentId: 'p1' },
  ]
  const result = moveSubtree(pages, 'p1', 'p2')
  expect(result).toBe(pages)
})

test('moveSubtree returns the same array when activeId or overId is not found', () => {
  const pages = [{ pageId: 'p1', parentId: null }]
  expect(moveSubtree(pages, 'missing', 'p1')).toBe(pages)
})

test('resolveParentAtDepth returns null at depth 0', () => {
  const pages = [{ pageId: 'p1', parentId: null }]
  expect(resolveParentAtDepth(pages, 0, 0)).toBeNull()
})

test('resolveParentAtDepth finds the nearest preceding page at depth - 1', () => {
  const pages = [
    { pageId: 'p1', parentId: null },
    { pageId: 'p2', parentId: 'p1' },
    { pageId: 'p3', parentId: null },
  ]
  expect(resolveParentAtDepth(pages, 2, 1)).toBe('p1')
})

test('buildTenantExport attaches pages, navigation, and a flattened widgets array', () => {
  const pages = [
    {
      pageId: 'page-home',
      title: { it: 'Home', en: 'Home', fr: 'Home', de: 'Home' },
      slug: 'home',
      parentId: null,
      sections: [{
        sectionId: 's1',
        layout: 'oneColumn',
        columns: [{ columnId: 'c1', widgets: [{ instanceId: 'w1', blockId: 'news-corporate', props: {} }] }],
      }],
    },
  ]
  const tenantConfiguration = {
    tenantId: null,
    siteName: { it: 'Test', en: 'Test', fr: 'Test', de: 'Test' },
    siteUrl: '',
    widgets: [],
    theme: { templateId: 'corporate-classic', accentColor: null },
  }
  const result = buildTenantExport(pages, tenantConfiguration)
  expect(result.pages).toHaveLength(1)
  expect(result.pages[0].widgets).toHaveLength(1)
  expect(result.navigation).toEqual([{ pageId: 'page-home', title: pages[0].title, slug: 'home', children: [] }])
  expect(result.widgets).toEqual([{ instanceId: 'w1', blockId: 'news-corporate', props: {}, order: 0 }])
})
