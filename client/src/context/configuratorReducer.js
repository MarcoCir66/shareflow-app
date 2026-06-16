import { arrayMove } from '@dnd-kit/sortable'
import { blockById } from '../data/blockCatalog.js'
import { SECTION_LAYOUTS } from '../data/sectionLayouts.js'
import { findWidgetLocation, mapColumn } from './sectionHelpers.js'
import {
  slugify, uniqueSlug, hasChildren, getSubtreeEndIndex, moveSubtree, resolveParentAtDepth, buildTenantExport,
} from './pageHelpers.js'

export const ACTIONS = {
  ADD_WIDGET:           'ADD_WIDGET',
  REMOVE_WIDGET:        'REMOVE_WIDGET',
  REORDER_WIDGETS:      'REORDER_WIDGETS',
  MOVE_WIDGET:          'MOVE_WIDGET',
  SELECT_WIDGET:        'SELECT_WIDGET',
  DESELECT_WIDGET:      'DESELECT_WIDGET',
  UPDATE_WIDGET_PROP:   'UPDATE_WIDGET_PROP',
  ADD_SECTION:          'ADD_SECTION',
  REMOVE_SECTION:       'REMOVE_SECTION',
  CHANGE_SECTION_LAYOUT:'CHANGE_SECTION_LAYOUT',
  SELECT_SECTION:       'SELECT_SECTION',
  ADD_PAGE:             'ADD_PAGE',
  RENAME_PAGE:          'RENAME_PAGE',
  REMOVE_PAGE:          'REMOVE_PAGE',
  SELECT_PAGE:          'SELECT_PAGE',
  MOVE_PAGE:            'MOVE_PAGE',
  SET_TENANT_META:      'SET_TENANT_META',
  EXPORT_CONFIGURATION: 'EXPORT_CONFIGURATION',
}

function emptyColumns(layoutKey) {
  return Array.from({ length: SECTION_LAYOUTS[layoutKey].columns }, () => ({
    columnId: crypto.randomUUID(),
    widgets: [],
  }))
}

/** Returns a new state where the active page's `sections` is replaced by `updaterFn(activePage.sections)`. */
function updateActivePageSections(state, updaterFn) {
  return {
    ...state,
    pages: state.pages.map(page =>
      page.pageId === state.activePageId ? { ...page, sections: updaterFn(page.sections) } : page
    ),
  }
}

export const initialState = {
  pages: [
    {
      pageId: 'page-home',
      title: 'Home',
      slug: 'home',
      parentId: null,
      sections: [
        {
          sectionId: 'section-default',
          layout: 'oneColumn',
          columns: [{ columnId: 'column-default', widgets: [] }],
        },
      ],
    },
  ],
  activePageId: 'page-home',
  selectedWidgetInstanceId: null,
  selectedSectionId: null,
  tenantConfiguration: {
    tenantId: null,
    siteName: 'My Corporate Intranet',
    siteUrl: '',
    widgets: [],
    theme: { templateId: 'corporate-classic', accentColor: null },
  },
}

export function configuratorReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD_WIDGET: {
      const block = blockById[action.payload.blockId]
      if (!block) return state

      const activePage = state.pages.find(p => p.pageId === state.activePageId)
      let { sectionId, columnId } = action.payload
      if (!sectionId || !columnId) {
        const lastSection = activePage.sections[activePage.sections.length - 1]
        const lastColumn = lastSection.columns[lastSection.columns.length - 1]
        sectionId = lastSection.sectionId
        columnId = lastColumn.columnId
      }

      const newWidget = {
        instanceId: crypto.randomUUID(),
        blockId: action.payload.blockId,
        props: { ...block.defaultProps },
      }

      return updateActivePageSections(state, sections =>
        mapColumn(sections, sectionId, columnId, column => ({
          ...column,
          widgets: [...column.widgets, newWidget],
        }))
      )
    }
    case ACTIONS.REMOVE_WIDGET: {
      const { instanceId } = action.payload
      const activePage = state.pages.find(p => p.pageId === state.activePageId)
      const loc = findWidgetLocation(activePage.sections, instanceId)
      if (!loc) return state
      return {
        ...updateActivePageSections(state, sections =>
          mapColumn(sections, loc.sectionId, loc.columnId, column => ({
            ...column,
            widgets: column.widgets.filter(w => w.instanceId !== instanceId),
          }))
        ),
        selectedWidgetInstanceId:
          state.selectedWidgetInstanceId === instanceId ? null : state.selectedWidgetInstanceId,
      }
    }
    case ACTIONS.REORDER_WIDGETS: {
      const { activeId, overId, sectionId, columnId } = action.payload
      return updateActivePageSections(state, sections =>
        mapColumn(sections, sectionId, columnId, column => {
          const ids = column.widgets.map(w => w.instanceId)
          const oldIndex = ids.indexOf(activeId)
          const newIndex = ids.indexOf(overId)
          if (oldIndex === -1 || newIndex === -1) return column
          return { ...column, widgets: arrayMove(column.widgets, oldIndex, newIndex) }
        })
      )
    }
    case ACTIONS.MOVE_WIDGET: {
      const { instanceId, toSectionId, toColumnId } = action.payload
      const activePage = state.pages.find(p => p.pageId === state.activePageId)
      const loc = findWidgetLocation(activePage.sections, instanceId)
      if (!loc) return state
      if (loc.sectionId === toSectionId && loc.columnId === toColumnId) return state

      let movedWidget = null
      let sections = mapColumn(activePage.sections, loc.sectionId, loc.columnId, column => {
        movedWidget = column.widgets.find(w => w.instanceId === instanceId)
        return { ...column, widgets: column.widgets.filter(w => w.instanceId !== instanceId) }
      })
      if (!movedWidget) return state
      sections = mapColumn(sections, toSectionId, toColumnId, column => ({
        ...column,
        widgets: [...column.widgets, movedWidget],
      }))

      return updateActivePageSections(state, () => sections)
    }
    case ACTIONS.SELECT_WIDGET:
      return { ...state, selectedWidgetInstanceId: action.payload.instanceId, selectedSectionId: null }
    case ACTIONS.DESELECT_WIDGET:
      return { ...state, selectedWidgetInstanceId: null, selectedSectionId: null }
    case ACTIONS.UPDATE_WIDGET_PROP: {
      const { instanceId, key, value } = action.payload
      const activePage = state.pages.find(p => p.pageId === state.activePageId)
      const loc = findWidgetLocation(activePage.sections, instanceId)
      if (!loc) return state
      return updateActivePageSections(state, sections =>
        mapColumn(sections, loc.sectionId, loc.columnId, column => ({
          ...column,
          widgets: column.widgets.map(w =>
            w.instanceId === instanceId ? { ...w, props: { ...w.props, [key]: value } } : w
          ),
        }))
      )
    }
    case ACTIONS.ADD_SECTION: {
      const { layout } = action.payload
      const newSection = {
        sectionId: crypto.randomUUID(),
        layout,
        columns: emptyColumns(layout),
      }
      return {
        ...updateActivePageSections(state, sections => [...sections, newSection]),
        selectedSectionId: newSection.sectionId,
        selectedWidgetInstanceId: null,
      }
    }
    case ACTIONS.CHANGE_SECTION_LAYOUT: {
      const { sectionId, layout: newLayoutKey } = action.payload
      const newLayout = SECTION_LAYOUTS[newLayoutKey]
      return updateActivePageSections(state, sections =>
        sections.map(section => {
          if (section.sectionId !== sectionId) return section

          const oldColumns = section.columns
          let newColumns
          if (newLayout.columns >= oldColumns.length) {
            newColumns = [...oldColumns]
            while (newColumns.length < newLayout.columns) {
              newColumns.push({ columnId: crypto.randomUUID(), widgets: [] })
            }
          } else {
            const kept = oldColumns.slice(0, newLayout.columns)
            const overflowWidgets = oldColumns.slice(newLayout.columns).flatMap(c => c.widgets)
            newColumns = kept.map((c, i) =>
              i === kept.length - 1 ? { ...c, widgets: [...c.widgets, ...overflowWidgets] } : c
            )
          }

          return { ...section, layout: newLayoutKey, columns: newColumns }
        })
      )
    }
    case ACTIONS.REMOVE_SECTION: {
      const { sectionId } = action.payload
      const activePage = state.pages.find(p => p.pageId === state.activePageId)
      const section = activePage.sections.find(s => s.sectionId === sectionId)
      if (!section) return state
      const isEmpty = section.columns.every(c => c.widgets.length === 0)
      if (!isEmpty || activePage.sections.length === 1) return state
      return {
        ...updateActivePageSections(state, sections => sections.filter(s => s.sectionId !== sectionId)),
        selectedSectionId: state.selectedSectionId === sectionId ? null : state.selectedSectionId,
      }
    }
    case ACTIONS.SELECT_SECTION:
      return { ...state, selectedSectionId: action.payload.sectionId, selectedWidgetInstanceId: null }
    case ACTIONS.ADD_PAGE: {
      const { parentId } = action.payload
      const title = 'Nuova pagina'
      const newPage = {
        pageId: crypto.randomUUID(),
        title,
        slug: uniqueSlug(state.pages, slugify(title)),
        parentId,
        sections: [
          { sectionId: crypto.randomUUID(), layout: 'oneColumn', columns: emptyColumns('oneColumn') },
        ],
      }

      let pages
      if (parentId === null) {
        pages = [...state.pages, newPage]
      } else {
        const parentIndex = state.pages.findIndex(p => p.pageId === parentId)
        if (parentIndex === -1) return state
        const insertAt = getSubtreeEndIndex(state.pages, parentIndex) + 1
        pages = [...state.pages.slice(0, insertAt), newPage, ...state.pages.slice(insertAt)]
      }

      return {
        ...state,
        pages,
        activePageId: newPage.pageId,
        selectedWidgetInstanceId: null,
        selectedSectionId: null,
      }
    }
    case ACTIONS.RENAME_PAGE: {
      const { pageId, title } = action.payload
      const trimmed = title.trim()
      if (!trimmed) return state
      const slug = uniqueSlug(state.pages, slugify(trimmed), pageId)
      return {
        ...state,
        pages: state.pages.map(p => p.pageId === pageId ? { ...p, title: trimmed, slug } : p),
      }
    }
    case ACTIONS.REMOVE_PAGE: {
      const { pageId } = action.payload
      if (state.pages.length === 1) return state
      if (hasChildren(state.pages, pageId)) return state
      const pages = state.pages.filter(p => p.pageId !== pageId)
      const activePageId = state.activePageId === pageId ? pages[0].pageId : state.activePageId
      return {
        ...state,
        pages,
        activePageId,
        selectedWidgetInstanceId: null,
        selectedSectionId: null,
      }
    }
    case ACTIONS.SELECT_PAGE:
      return {
        ...state,
        activePageId: action.payload.pageId,
        selectedWidgetInstanceId: null,
        selectedSectionId: null,
      }
    case ACTIONS.MOVE_PAGE: {
      const { activeId, overId, depth } = action.payload
      const pages = moveSubtree(state.pages, activeId, overId)
      if (pages === state.pages) return state
      const newIndex = pages.findIndex(p => p.pageId === activeId)
      const newParentId = resolveParentAtDepth(pages, newIndex, depth)
      return {
        ...state,
        pages: pages.map(p => p.pageId === activeId ? { ...p, parentId: newParentId } : p),
      }
    }
    case ACTIONS.SET_TENANT_META:
      return {
        ...state,
        tenantConfiguration: { ...state.tenantConfiguration, ...action.payload },
      }
    case ACTIONS.EXPORT_CONFIGURATION:
      return {
        ...state,
        tenantConfiguration: buildTenantExport(state.pages, state.tenantConfiguration),
      }
    default:
      return state
  }
}
