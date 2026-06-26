import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { BLOCK_CONTENT_DEFS } from '../../data/blockContentSchemas.js'
import SourceSelector from './SourceSelector.jsx'
import ContentItemForm from './ContentItemForm.jsx'

export default function ContentPanel({ widget, block }) {
  const { dispatch, ACTIONS } = useConfigurator()
  const { t } = useTranslation()
  const [editingIndex, setEditingIndex] = useState(null)

  const def = BLOCK_CONTENT_DEFS[block.id]
  const schema = def?.schema ?? []

  const contentSource = widget.props.contentSource ?? { type: def.sourceTypes[0], url: '', params: {} }
  const contentItems  = widget.props.contentItems  ?? []

  function updateSource(newSource) {
    dispatch({ type: ACTIONS.UPDATE_WIDGET_PROP, payload: { instanceId: widget.instanceId, key: 'contentSource', value: newSource } })
  }

  function updateItems(newItems) {
    dispatch({ type: ACTIONS.UPDATE_WIDGET_PROP, payload: { instanceId: widget.instanceId, key: 'contentItems', value: newItems } })
  }

  function saveItem(item) {
    if (editingIndex === -1) {
      updateItems([...contentItems, item])
    } else {
      updateItems(contentItems.map((it, i) => i === editingIndex ? item : it))
    }
    setEditingIndex(null)
  }

  function removeItem(index) {
    updateItems(contentItems.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
  }

  const isManual = contentSource.type === 'manual'
  const sectionLabel = isManual ? t('content.sectionTitle') : t('content.sectionTitleSample')

  function itemLabel(item) {
    return item.title || item.name || item.question || Object.values(item).find(v => typeof v === 'string' && v.trim()) || '—'
  }

  return (
    <div className="space-y-4">
      <SourceSelector
        sourceTypes={block.contentSourceTypes}
        value={contentSource}
        onChange={updateSource}
      />

      <div className="border-t border-ink-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-400 flex items-center gap-2">
            {sectionLabel}
            {isManual && (
              <span className="bg-green-600 text-white text-[9px] rounded px-1.5 py-0.5 font-bold normal-case tracking-normal">
                {t('content.production')}
              </span>
            )}
          </span>
          {editingIndex === null && (
            <button
              onClick={() => setEditingIndex(-1)}
              className="text-[10px] bg-flow-600 text-white rounded px-2 py-0.5 hover:bg-flow-600/80 transition-colors"
            >
              {t('content.add')}
            </button>
          )}
        </div>

        {!isManual && contentSource.url === '' && contentItems.length === 0 && editingIndex === null && (
          <p className="text-[10px] text-ink-400 italic mb-3">
            {t('content.urlHint')}
          </p>
        )}

        {contentItems.map((item, i) =>
          editingIndex === i ? (
            <ContentItemForm
              key={i}
              schema={schema}
              item={item}
              onSave={saveItem}
              onCancel={() => setEditingIndex(null)}
            />
          ) : (
            <div
              key={i}
              className="border border-ink-700 rounded px-3 py-2 mb-1.5 flex items-center gap-2"
            >
              <span className="text-xs text-white truncate flex-1">{itemLabel(item)}</span>
              <button
                onClick={() => setEditingIndex(i)}
                className="text-ink-400 hover:text-white text-xs flex-shrink-0 transition-colors"
                title={t('content.edit')}
              >✎</button>
              <button
                onClick={() => removeItem(i)}
                className="text-ink-400 hover:text-red-400 text-xs flex-shrink-0 transition-colors"
                title={t('content.remove')}
              >✕</button>
            </div>
          )
        )}

        {editingIndex === -1 && (
          <ContentItemForm
            schema={schema}
            item={{}}
            onSave={saveItem}
            onCancel={() => setEditingIndex(null)}
          />
        )}

        {contentItems.length === 0 && editingIndex === null && (
          <button
            onClick={() => setEditingIndex(-1)}
            className="w-full border border-dashed border-ink-700 rounded p-2 text-xs text-ink-400 hover:text-white hover:border-ink-400 transition-colors"
          >
            {t('content.addItem')}
          </button>
        )}
      </div>
    </div>
  )
}
