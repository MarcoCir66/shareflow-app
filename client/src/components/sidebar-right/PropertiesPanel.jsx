import { useState, useEffect } from 'react'
import * as icons from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { blockById } from '../../data/blockCatalog.js'
import { findWidget } from '../../context/sectionHelpers.js'
import { findPage } from '../../context/pageHelpers.js'
import EmptyState from './EmptyState.jsx'
import ScopeSelector from './ScopeSelector.jsx'
import ToggleField from './ToggleField.jsx'
import SectionPropertiesPanel from './SectionPropertiesPanel.jsx'
import ContentPanel from './ContentPanel.jsx'

function InstanceIdSection({ instanceId }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-6 pt-4 border-t border-ink-700">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-ink-400 font-medium uppercase tracking-wider hover:text-white transition-colors w-full"
      >
        <icons.ChevronRight size={12} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        Instance ID
      </button>
      {open && (
        <code className="mt-2 block text-xs text-ink-400 font-mono break-all">{instanceId}</code>
      )}
    </div>
  )
}

export default function PropertiesPanel() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { t } = useTranslation()
  const { selectedWidgetInstanceId, selectedSectionId } = state
  const activePage = findPage(state.pages, state.activePageId)
  const [activeTab, setActiveTab] = useState('props')

  useEffect(() => { setActiveTab('props') }, [selectedWidgetInstanceId])

  if (selectedSectionId) {
    return <SectionPropertiesPanel sectionId={selectedSectionId} />
  }

  const widget = findWidget(activePage.sections, selectedWidgetInstanceId)
  const block  = widget ? blockById[widget.blockId] : null

  if (!widget || !block) return <EmptyState />

  const Icon = icons[block.icon] ?? icons.Box
  const hasContentTab = block.contentSourceTypes != null

  function updateProp(key, value) {
    dispatch({ type: ACTIONS.UPDATE_WIDGET_PROP, payload: { instanceId: widget.instanceId, key, value } })
  }

  return (
    <div key={widget.instanceId} className="p-4">
      <div className="flex items-center gap-3 mb-1 pb-4 border-b border-ink-700">
        <div className="w-9 h-9 rounded-lg bg-flow-600/20 flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-flow-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white leading-tight">
            {t(`blocks.labels.${block.id}`, { defaultValue: block.label })}
          </h3>
          <span className="text-xs text-ink-400">
            {t(`blocks.categories.${block.category}`)}
          </span>
        </div>
      </div>

      {hasContentTab && (
        <div className="flex border-b border-ink-700 mb-4 mt-3">
          <button
            onClick={() => setActiveTab('props')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'props'
                ? 'text-white border-b-2 border-flow-400 -mb-px'
                : 'text-ink-400 hover:text-white'
            }`}
          >
            {t('props.properties')}
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === 'content'
                ? 'text-white border-b-2 border-flow-400 -mb-px'
                : 'text-ink-400 hover:text-white'
            }`}
          >
            {t('props.content')}
          </button>
        </div>
      )}

      {activeTab === 'props' && (
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
                label={t(`props.${key}`, { defaultValue: key })}
                value={widget.props[key]}
                onChange={v => updateProp(key, v)}
              />
            )
          })}
        </div>
      )}

      {activeTab === 'content' && hasContentTab && (
        <ContentPanel widget={widget} block={block} />
      )}

      {activeTab === 'props' && (
        <InstanceIdSection instanceId={widget.instanceId} />
      )}
    </div>
  )
}
