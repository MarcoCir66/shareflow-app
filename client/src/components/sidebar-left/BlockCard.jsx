import * as icons from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { useConfigurator } from '../../hooks/useConfigurator.js'

export default function BlockCard({ block }) {
  const { dispatch, ACTIONS } = useConfigurator()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog-${block.id}`,
    data: { type: 'catalog-block', blockId: block.id },
  })

  const Icon = icons[block.icon] ?? icons.Box

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => dispatch({ type: ACTIONS.ADD_WIDGET, payload: { blockId: block.id } })}
      className={`
        flex flex-col items-center gap-1.5 p-3 rounded-lg border cursor-grab active:cursor-grabbing
        bg-slate-mid border-slate-mid hover:border-blue-electric hover:bg-navy-light
        transition-all select-none text-center
        ${isDragging ? 'opacity-40 scale-95' : ''}
      `}
    >
      <Icon size={20} className="text-blue-electric flex-shrink-0" />
      <span className="text-xs text-slate-light leading-tight">{block.label}</span>
    </div>
  )
}
