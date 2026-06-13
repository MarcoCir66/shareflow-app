import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { useConfigurator } from './hooks/useConfigurator.js'
import { blockById } from './data/blockCatalog.js'
import Navbar from './components/layout/Navbar.jsx'
import WorkspaceShell from './components/layout/WorkspaceShell.jsx'
import BlockLibrary from './components/sidebar-left/BlockLibrary.jsx'
import CanvasDropZone from './components/canvas/CanvasDropZone.jsx'
import PropertiesPanel from './components/sidebar-right/PropertiesPanel.jsx'
import DeployModal from './components/deploy/DeployModal.jsx'
import CanvasBlockPreview from './components/canvas/CanvasBlockPreview.jsx'

function AppInner() {
  const { dispatch, ACTIONS } = useConfigurator()
  const [deployOpen, setDeployOpen] = useState(false)
  const [activeDragData, setActiveDragData] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragStart({ active }) {
    setActiveDragData(active.data.current)
  }

  function handleDragEnd({ active, over }) {
    setActiveDragData(null)
    if (!over) return
    const type = active.data.current?.type
    if (type === 'catalog-block') {
      dispatch({ type: ACTIONS.ADD_WIDGET, payload: { blockId: active.data.current.blockId } })
    } else if (type === 'canvas-block' && active.id !== over.id) {
      dispatch({ type: ACTIONS.REORDER_WIDGETS, payload: { activeId: active.id, overId: over.id } })
    }
  }

  const overlayBlock = activeDragData?.type === 'catalog-block'
    ? blockById[activeDragData.blockId]
    : null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Navbar onDeployClick={() => setDeployOpen(true)} />
      <WorkspaceShell
        left={<BlockLibrary />}
        center={<CanvasDropZone />}
        right={<PropertiesPanel />}
      />
      <DragOverlay>
        {overlayBlock && (
          <div className="bg-white border-2 border-blue rounded-lg p-4 w-64 shadow-xl">
            <CanvasBlockPreview block={overlayBlock} />
          </div>
        )}
      </DragOverlay>
      {deployOpen && <DeployModal onClose={() => setDeployOpen(false)} />}
    </DndContext>
  )
}

export default function App() {
  return <AppInner />
}
