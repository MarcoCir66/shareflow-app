import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'
import CanvasColumn from './CanvasColumn.jsx'

function PanelLabel({ panel, lang, onRename }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(t2(panel.label, lang))

  useEffect(() => {
    if (!editing) setDraft(t2(panel.label, lang))
  }, [panel.label, lang, editing])

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    const current = t2(panel.label, lang)
    if (trimmed && trimmed !== current) {
      onRename(trimmed)
    } else {
      setDraft(current)
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(t2(panel.label, lang)); setEditing(false) }
        }}
        onClick={e => e.stopPropagation()}
        className="flex-1 bg-white text-ink-950 text-sm px-1.5 py-0.5 rounded border border-flow-600 focus:outline-none min-w-0"
      />
    )
  }

  return (
    <span
      onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
      className="flex-1 text-sm font-medium text-ink-950 truncate"
    >
      {t2(panel.label, lang)}
    </span>
  )
}

export default function AccordionPanels({ section, readOnly = false }) {
  const { dispatch, ACTIONS } = useConfigurator()
  const { t } = useTranslation()
  const lang = useLang()
  const canRemovePanel = section.columns.length > 1

  return (
    <div className="space-y-2">
      {section.columns.map(panel => {
        const isEmpty = panel.widgets.length === 0

        return (
          <div key={panel.columnId} className="rounded-xl border border-ink-700 overflow-hidden">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={panel.expanded}
              aria-label={t('canvas.togglePanel')}
              onClick={e => {
                e.stopPropagation()
                dispatch({ type: ACTIONS.TOGGLE_PANEL_EXPANDED, payload: { sectionId: section.sectionId, columnId: panel.columnId } })
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  dispatch({ type: ACTIONS.TOGGLE_PANEL_EXPANDED, payload: { sectionId: section.sectionId, columnId: panel.columnId } })
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-paper cursor-pointer"
            >
              {panel.expanded ? <ChevronDown size={14} className="flex-shrink-0 text-ink-800" /> : <ChevronRight size={14} className="flex-shrink-0 text-ink-800" />}
              {readOnly ? (
                <span className="flex-1 text-sm font-medium text-ink-950 truncate">{t2(panel.label, lang)}</span>
              ) : (
                <PanelLabel
                  panel={panel}
                  lang={lang}
                  onRename={label => dispatch({
                    type: ACTIONS.RENAME_PANEL,
                    payload: { sectionId: section.sectionId, columnId: panel.columnId, lang, label },
                  })}
                />
              )}
              {!readOnly && isEmpty && canRemovePanel && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    dispatch({ type: ACTIONS.REMOVE_PANEL, payload: { sectionId: section.sectionId, columnId: panel.columnId } })
                  }}
                  aria-label={t('canvas.removePanel')}
                  className="text-ink-400 hover:text-red-500 flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            {panel.expanded && (
              <div className="p-3">
                <CanvasColumn sectionId={section.sectionId} column={panel} widthHint="full" readOnly={readOnly} />
              </div>
            )}
          </div>
        )
      })}

      {!readOnly && (
        <button
          type="button"
          onClick={() => dispatch({ type: ACTIONS.ADD_PANEL, payload: { sectionId: section.sectionId } })}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-400 hover:text-flow-600 border border-dashed border-ink-700 hover:border-flow-600 rounded-lg px-3 py-1.5 transition-colors"
        >
          <Plus size={14} /> {t('canvas.addPanel')}
        </button>
      )}
    </div>
  )
}
