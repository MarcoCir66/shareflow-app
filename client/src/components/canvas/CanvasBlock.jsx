import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X, GripVertical } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { blockById } from '../../data/blockCatalog.js'
import CanvasBlockPreview from './CanvasBlockPreview.jsx'

export default function CanvasBlock({ widget }) {
  const { state, dispatch, ACTIONS } = useConfigurator()
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={() => dispatch({ type: ACTIONS.SELECT_WIDGET, payload: { instanceId: widget.instanceId } })}
      className={`
        group relative bg-white rounded-lg p-4 mb-3 border cursor-pointer transition-all shadow-sm
        ${isSelected ? 'border-blue ring-1 ring-blue/20 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}
      `}
    >
      <button
        {...listeners}
        onClick={e => e.stopPropagation()}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-navy cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical size={16} />
      </button>
      <button
        onClick={e => {
          e.stopPropagation()
          dispatch({ type: ACTIONS.REMOVE_WIDGET, payload: { instanceId: widget.instanceId } })
        }}
        className="absolute right-2 top-2 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
      >
        <X size={14} />
      </button>
      <div className="pl-4">
        {block && <CanvasBlockPreview block={block} />}
      </div>
    </div>
  )
}
