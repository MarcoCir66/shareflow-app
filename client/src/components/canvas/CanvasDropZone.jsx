import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Layers } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import CanvasBlock from './CanvasBlock.jsx'

export default function CanvasDropZone() {
  const { state } = useConfigurator()
  const { activeWidgets } = state
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-drop' })

  return (
    <div className="min-h-full p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <h2 className="text-navy font-semibold text-sm uppercase tracking-widest">Canvas Preview</h2>
          <p className="text-slate text-xs mt-0.5">SharePoint Communication Site — Home Page</p>
        </div>
        <div
          ref={setNodeRef}
          className={`
            min-h-96 rounded-2xl border-2 border-dashed p-4 transition-colors
            ${isOver ? 'border-blue-electric bg-blue/5' : 'border-slate-mid bg-white'}
          `}
        >
          {activeWidgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 gap-3 text-slate-light">
              <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center">
                <Layers size={28} className="text-slate-mid" />
              </div>
              <p className="text-sm font-medium">Drag blocks here to build your intranet</p>
              <p className="text-xs">Or click any block in the left panel</p>
            </div>
          ) : (
            <SortableContext
              items={activeWidgets.map(w => w.instanceId)}
              strategy={verticalListSortingStrategy}
            >
              {activeWidgets.map(widget => (
                <CanvasBlock key={widget.instanceId} widget={widget} />
              ))}
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  )
}
