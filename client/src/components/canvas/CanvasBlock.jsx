import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X, GripVertical, ArrowRightLeft } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { blockById } from '../../data/blockCatalog.js'
import { findPage } from '../../context/pageHelpers.js'
import CanvasBlockPreview from './CanvasBlockPreview.jsx'

export default function CanvasBlock({ widget, sectionId, columnId, widthHint }) {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { template } = useTheme()
  const [moveMenuOpen, setMoveMenuOpen] = useState(false)
  const block = blockById[widget.blockId]
  const isSelected = state.selectedWidgetInstanceId === widget.instanceId

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.instanceId,
    data: { type: 'canvas-block' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const activePage = findPage(state.pages, state.activePageId)
  const otherColumns = activePage.sections.flatMap((section, si) =>
    section.columns.map((column, ci) => ({
      sectionId: section.sectionId,
      columnId: column.columnId,
      label: `Sezione ${si + 1} · Colonna ${ci + 1}`,
    }))
  ).filter(c => !(c.sectionId === sectionId && c.columnId === columnId))

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={e => {
        e.stopPropagation()
        dispatch({ type: ACTIONS.SELECT_WIDGET, payload: { instanceId: widget.instanceId } })
      }}
      className={`
        group relative p-4 mb-3 cursor-pointer transition-all
        ${template.card.wrapper}
        ${isSelected ? 'ring-2 ring-blue' : 'hover:ring-1 hover:ring-[color-mix(in_srgb,var(--theme-accent)_30%,transparent)]'}
      `}
    >
      <button
        {...listeners}
        onClick={e => e.stopPropagation()}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-navy cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical size={16} />
      </button>

      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {otherColumns.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setMoveMenuOpen(o => !o) }}
            className="text-gray-300 hover:text-blue transition-colors"
            title="Sposta in un'altra colonna"
          >
            <ArrowRightLeft size={14} />
          </button>
        )}
        <button
          onClick={e => {
            e.stopPropagation()
            dispatch({ type: ACTIONS.REMOVE_WIDGET, payload: { instanceId: widget.instanceId } })
          }}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {moveMenuOpen && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute right-2 top-9 z-20 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1"
        >
          <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Sposta in</p>
          {otherColumns.map(target => (
            <button
              key={target.columnId}
              onClick={() => {
                dispatch({
                  type: ACTIONS.MOVE_WIDGET,
                  payload: { instanceId: widget.instanceId, toSectionId: target.sectionId, toColumnId: target.columnId },
                })
                setMoveMenuOpen(false)
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-navy hover:bg-surface transition-colors"
            >
              {target.label}
            </button>
          ))}
        </div>
      )}

      <div className="pl-4">
        {block && <CanvasBlockPreview block={block} width={widthHint} />}
      </div>
    </div>
  )
}
