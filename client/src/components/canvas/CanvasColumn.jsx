import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import CanvasBlock from './CanvasBlock.jsx'

export default function CanvasColumn({ sectionId, column, widthHint }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.columnId}`,
    data: { type: 'column' },
  })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[7rem] rounded-xl transition-colors ${isOver ? 'bg-blue/5' : ''}`}
    >
      <SortableContext items={column.widgets.map(w => w.instanceId)} strategy={verticalListSortingStrategy}>
        {column.widgets.length === 0 ? (
          <div className="h-28 flex items-center justify-center text-center text-xs text-slate-light border-2 border-dashed border-slate-mid rounded-xl px-3">
            Trascina qui un blocco
          </div>
        ) : (
          column.widgets.map(widget => (
            <CanvasBlock
              key={widget.instanceId}
              widget={widget}
              sectionId={sectionId}
              columnId={column.columnId}
              widthHint={widthHint}
            />
          ))
        )}
      </SortableContext>
    </div>
  )
}
