import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { blockById } from '../../data/blockCatalog.js'
import CanvasBlock from './CanvasBlock.jsx'
import CanvasBlockPreview from './CanvasBlockPreview.jsx'

export default function CanvasColumn({ sectionId, column, widthHint, readOnly = false }) {
  if (readOnly) {
    return (
      <div className="min-h-0">
        {column.widgets.map(widget => {
          const block = blockById[widget.blockId]
          if (!block) return null
          return (
            <div key={widget.instanceId} className="mb-3">
              <CanvasBlockPreview
                block={block}
                width={widthHint}
                contentItems={widget.props.contentItems ?? []}
              />
            </div>
          )
        })}
      </div>
    )
  }

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
