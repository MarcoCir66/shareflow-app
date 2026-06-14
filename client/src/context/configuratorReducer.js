import { arrayMove } from '@dnd-kit/sortable'
import { blockById } from '../data/blockCatalog.js'
import { SECTION_LAYOUTS } from '../data/sectionLayouts.js'
import { findWidgetLocation, mapColumn, flattenWidgets } from './sectionHelpers.js'

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
  SET_TENANT_META:      'SET_TENANT_META',
  EXPORT_CONFIGURATION: 'EXPORT_CONFIGURATION',
}

function emptyColumns(layoutKey) {
  return Array.from({ length: SECTION_LAYOUTS[layoutKey].columns }, () => ({
    columnId: crypto.randomUUID(),
    widgets: [],
  }))
}

export const initialState = {
  sections: [
    {
      sectionId: 'section-default',
      layout: 'oneColumn',
      columns: [{ columnId: 'column-default', widgets: [] }],
    },
  ],
  selectedWidgetInstanceId: null,
  selectedSectionId: null,
  tenantConfiguration: {
    tenantId: null,
    siteName: 'My Corporate Intranet',
    siteUrl: '',
    widgets: [],
  },
}

export function configuratorReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD_WIDGET: {
      const block = blockById[action.payload.blockId]
      if (!block) return state

      let { sectionId, columnId } = action.payload
      if (!sectionId || !columnId) {
        const lastSection = state.sections[state.sections.length - 1]
        const lastColumn = lastSection.columns[lastSection.columns.length - 1]
        sectionId = lastSection.sectionId
        columnId = lastColumn.columnId
      }

      const newWidget = {
        instanceId: crypto.randomUUID(),
        blockId: action.payload.blockId,
        props: { ...block.defaultProps },
      }

      return {
        ...state,
        sections: mapColumn(state.sections, sectionId, columnId, column => ({
          ...column,
          widgets: [...column.widgets, newWidget],
        })),
      }
    }
    case ACTIONS.REMOVE_WIDGET: {
      const { instanceId } = action.payload
      const loc = findWidgetLocation(state.sections, instanceId)
      if (!loc) return state
      return {
        ...state,
        sections: mapColumn(state.sections, loc.sectionId, loc.columnId, column => ({
          ...column,
          widgets: column.widgets.filter(w => w.instanceId !== instanceId),
        })),
        selectedWidgetInstanceId:
          state.selectedWidgetInstanceId === instanceId ? null : state.selectedWidgetInstanceId,
      }
    }
    case ACTIONS.REORDER_WIDGETS: {
      const { activeId, overId, sectionId, columnId } = action.payload
      return {
        ...state,
        sections: mapColumn(state.sections, sectionId, columnId, column => {
          const ids = column.widgets.map(w => w.instanceId)
          const oldIndex = ids.indexOf(activeId)
          const newIndex = ids.indexOf(overId)
          if (oldIndex === -1 || newIndex === -1) return column
          return { ...column, widgets: arrayMove(column.widgets, oldIndex, newIndex) }
        }),
      }
    }
    case ACTIONS.MOVE_WIDGET: {
      const { instanceId, toSectionId, toColumnId } = action.payload
      const loc = findWidgetLocation(state.sections, instanceId)
      if (!loc) return state
      if (loc.sectionId === toSectionId && loc.columnId === toColumnId) return state

      let movedWidget = null
      let sections = mapColumn(state.sections, loc.sectionId, loc.columnId, column => {
        movedWidget = column.widgets.find(w => w.instanceId === instanceId)
        return { ...column, widgets: column.widgets.filter(w => w.instanceId !== instanceId) }
      })
      if (!movedWidget) return state
      sections = mapColumn(sections, toSectionId, toColumnId, column => ({
        ...column,
        widgets: [...column.widgets, movedWidget],
      }))

      return { ...state, sections }
    }
    case ACTIONS.SELECT_WIDGET:
      return { ...state, selectedWidgetInstanceId: action.payload.instanceId, selectedSectionId: null }
    case ACTIONS.DESELECT_WIDGET:
      return { ...state, selectedWidgetInstanceId: null, selectedSectionId: null }
    case ACTIONS.UPDATE_WIDGET_PROP: {
      const { instanceId, key, value } = action.payload
      const loc = findWidgetLocation(state.sections, instanceId)
      if (!loc) return state
      return {
        ...state,
        sections: mapColumn(state.sections, loc.sectionId, loc.columnId, column => ({
          ...column,
          widgets: column.widgets.map(w =>
            w.instanceId === instanceId ? { ...w, props: { ...w.props, [key]: value } } : w
          ),
        })),
      }
    }
    case ACTIONS.ADD_SECTION: {
      const { layout } = action.payload
      const newSection = {
        sectionId: crypto.randomUUID(),
        layout,
        columns: emptyColumns(layout),
      }
      return {
        ...state,
        sections: [...state.sections, newSection],
        selectedSectionId: newSection.sectionId,
        selectedWidgetInstanceId: null,
      }
    }
    case ACTIONS.CHANGE_SECTION_LAYOUT: {
      const { sectionId, layout: newLayoutKey } = action.payload
      const newLayout = SECTION_LAYOUTS[newLayoutKey]
      return {
        ...state,
        sections: state.sections.map(section => {
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
        }),
      }
    }
    case ACTIONS.REMOVE_SECTION: {
      const { sectionId } = action.payload
      const section = state.sections.find(s => s.sectionId === sectionId)
      if (!section) return state
      const isEmpty = section.columns.every(c => c.widgets.length === 0)
      if (!isEmpty || state.sections.length === 1) return state
      return {
        ...state,
        sections: state.sections.filter(s => s.sectionId !== sectionId),
        selectedSectionId: state.selectedSectionId === sectionId ? null : state.selectedSectionId,
      }
    }
    case ACTIONS.SELECT_SECTION:
      return { ...state, selectedSectionId: action.payload.sectionId, selectedWidgetInstanceId: null }
    case ACTIONS.SET_TENANT_META:
      return {
        ...state,
        tenantConfiguration: { ...state.tenantConfiguration, ...action.payload },
      }
    case ACTIONS.EXPORT_CONFIGURATION:
      return {
        ...state,
        tenantConfiguration: {
          ...state.tenantConfiguration,
          widgets: flattenWidgets(state.sections),
        },
      }
    default:
      return state
  }
}
