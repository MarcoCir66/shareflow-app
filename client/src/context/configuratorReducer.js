import { arrayMove } from '@dnd-kit/sortable'
import { blockById } from '../data/blockCatalog.js'

export const ACTIONS = {
  ADD_WIDGET:          'ADD_WIDGET',
  REMOVE_WIDGET:       'REMOVE_WIDGET',
  REORDER_WIDGETS:     'REORDER_WIDGETS',
  SELECT_WIDGET:       'SELECT_WIDGET',
  DESELECT_WIDGET:     'DESELECT_WIDGET',
  UPDATE_WIDGET_PROP:  'UPDATE_WIDGET_PROP',
  SET_TENANT_META:     'SET_TENANT_META',
  EXPORT_CONFIGURATION:'EXPORT_CONFIGURATION',
}

export const initialState = {
  activeWidgets: [],
  selectedWidgetInstanceId: null,
  tenantConfiguration: {
    tenantId: null, // TODO: MSAL — populate after acquireTokenSilent() resolves tenant context
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
      const newWidget = {
        instanceId: crypto.randomUUID(),
        blockId: action.payload.blockId,
        order: state.activeWidgets.length,
        props: { ...block.defaultProps },
      }
      return { ...state, activeWidgets: [...state.activeWidgets, newWidget] }
    }
    case ACTIONS.REMOVE_WIDGET: {
      const filtered = state.activeWidgets.filter(w => w.instanceId !== action.payload.instanceId)
      const reordered = filtered.map((w, i) => ({ ...w, order: i }))
      return {
        ...state,
        activeWidgets: reordered,
        selectedWidgetInstanceId:
          state.selectedWidgetInstanceId === action.payload.instanceId
            ? null
            : state.selectedWidgetInstanceId,
      }
    }
    case ACTIONS.REORDER_WIDGETS: {
      const ids = state.activeWidgets.map(w => w.instanceId)
      const oldIndex = ids.indexOf(action.payload.activeId)
      const newIndex = ids.indexOf(action.payload.overId)
      if (oldIndex === -1 || newIndex === -1) return state
      const reordered = arrayMove(state.activeWidgets, oldIndex, newIndex)
        .map((w, i) => ({ ...w, order: i }))
      return { ...state, activeWidgets: reordered }
    }
    case ACTIONS.SELECT_WIDGET:
      return { ...state, selectedWidgetInstanceId: action.payload.instanceId }
    case ACTIONS.DESELECT_WIDGET:
      return { ...state, selectedWidgetInstanceId: null }
    case ACTIONS.UPDATE_WIDGET_PROP: {
      const { instanceId, key, value } = action.payload
      return {
        ...state,
        activeWidgets: state.activeWidgets.map(w =>
          w.instanceId === instanceId
            ? { ...w, props: { ...w.props, [key]: value } }
            : w
        ),
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
        tenantConfiguration: {
          ...state.tenantConfiguration,
          widgets: state.activeWidgets.map(w => ({ ...w })),
        },
      }
    default:
      return state
  }
}
