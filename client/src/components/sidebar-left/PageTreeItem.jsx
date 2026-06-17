import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'

export const INDENT_WIDTH = 20

export default function PageTreeItem({ page, depth, isActive, hasChildren, expanded, onToggleExpand }) {
  const { dispatch, ACTIONS } = useConfigurator()
  const lang = useLang()
  const [editing, setEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(t2(page.title, lang))

  useEffect(() => {
    if (!editing) setTitleDraft(t2(page.title, lang))
  }, [page.title, lang, editing])

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.pageId,
    data: { type: 'page-tree-item' },
  })

  const style = {
    paddingLeft: depth * INDENT_WIDTH + 8,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  function commitRename() {
    setEditing(false)
    const trimmed = titleDraft.trim()
    const currentLangTitle = t2(page.title, lang)
    if (trimmed && trimmed !== currentLangTitle) {
      dispatch({ type: ACTIONS.RENAME_PAGE, payload: { pageId: page.pageId, lang, title: trimmed } })
    } else {
      setTitleDraft(currentLangTitle)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 pr-2 py-1.5 rounded-lg cursor-pointer transition-colors
        ${isActive ? 'bg-blue/10 border border-blue/30' : 'border border-transparent hover:bg-slate-mid'}`}
      onClick={() => dispatch({ type: ACTIONS.SELECT_PAGE, payload: { pageId: page.pageId } })}
    >
      <button
        {...listeners}
        {...attributes}
        onClick={e => e.stopPropagation()}
        className="text-slate-light opacity-0 group-hover:opacity-100 hover:text-white cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical size={14} />
      </button>

      {hasChildren ? (
        <button
          onClick={e => { e.stopPropagation(); onToggleExpand() }}
          className="text-slate-light hover:text-white"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ) : (
        <span className="w-3.5" />
      )}

      {editing ? (
        <input
          autoFocus
          value={titleDraft}
          onChange={e => setTitleDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') { setTitleDraft(t2(page.title, lang)); setEditing(false) }
          }}
          onClick={e => e.stopPropagation()}
          className="flex-1 bg-slate-mid text-white text-xs px-1.5 py-0.5 rounded border border-blue-electric focus:outline-none min-w-0"
        />
      ) : (
        <span
          onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
          className={`flex-1 text-xs truncate ${isActive ? 'text-white font-medium' : 'text-slate-light'}`}
        >
          {t2(page.title, lang)}
        </span>
      )}

      <button
        onClick={e => { e.stopPropagation(); dispatch({ type: ACTIONS.ADD_PAGE, payload: { parentId: page.pageId } }) }}
        className="text-slate-light opacity-0 group-hover:opacity-100 hover:text-blue-electric transition-opacity"
        title="Aggiungi sottopagina"
      >
        <Plus size={12} />
      </button>

      <button
        disabled={hasChildren}
        onClick={e => { e.stopPropagation(); dispatch({ type: ACTIONS.REMOVE_PAGE, payload: { pageId: page.pageId } }) }}
        className={`opacity-0 group-hover:opacity-100 transition-opacity ${hasChildren ? 'text-slate-mid cursor-not-allowed' : 'text-slate-light hover:text-red-400'}`}
        title={hasChildren ? 'Elimina prima le sottopagine' : 'Elimina pagina'}
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}
