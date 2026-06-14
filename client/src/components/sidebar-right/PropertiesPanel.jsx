import * as icons from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { blockById, CATEGORY_LABELS } from '../../data/blockCatalog.js'
import { findWidget } from '../../context/sectionHelpers.js'
import { findPage } from '../../context/pageHelpers.js'
import EmptyState from './EmptyState.jsx'
import ScopeSelector from './ScopeSelector.jsx'
import ToggleField from './ToggleField.jsx'
import SectionPropertiesPanel from './SectionPropertiesPanel.jsx'

const PROP_LABELS = {
  visible:         'Visible',
  commentsEnabled: 'Comments enabled',
  likesEnabled:    'Likes enabled',
}

export default function PropertiesPanel() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { selectedWidgetInstanceId, selectedSectionId } = state
  const activePage = findPage(state.pages, state.activePageId)

  if (selectedSectionId) {
    return <SectionPropertiesPanel sectionId={selectedSectionId} />
  }

  const widget = findWidget(activePage.sections, selectedWidgetInstanceId)
  const block  = widget ? blockById[widget.blockId] : null

  if (!widget || !block) return <EmptyState />

  const Icon = icons[block.icon] ?? icons.Box

  function updateProp(key, value) {
    dispatch({ type: ACTIONS.UPDATE_WIDGET_PROP, payload: { instanceId: widget.instanceId, key, value } })
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-1 pb-4 border-b border-slate-mid">
        <div className="w-9 h-9 rounded-lg bg-blue/20 flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-blue-electric" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white leading-tight">{block.label}</h3>
          <span className="text-xs text-slate-light">{CATEGORY_LABELS[block.category]}</span>
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {block.configurableProps.map(key => {
          if (key === 'scope') {
            return (
              <ScopeSelector
                key={key}
                value={widget.props.scope}
                onChange={v => updateProp('scope', v)}
              />
            )
          }
          return (
            <ToggleField
              key={key}
              label={PROP_LABELS[key] ?? key}
              value={widget.props[key]}
              onChange={v => updateProp(key, v)}
            />
          )
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-mid">
        <p className="text-xs text-slate-light font-medium uppercase tracking-wider mb-2">Instance ID</p>
        <code className="text-xs text-slate-light font-mono break-all">{widget.instanceId}</code>
      </div>
    </div>
  )
}
