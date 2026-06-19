import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useConfigurator } from './hooks/useConfigurator.js'
import { usePreviewSync } from './hooks/usePreviewSync.js'
import PreviewApp from './components/preview/PreviewApp.jsx'
import { blockById } from './data/blockCatalog.js'
import { findWidgetLocation, findColumnById } from './context/sectionHelpers.js'
import { findPage } from './context/pageHelpers.js'
import Navbar from './components/layout/Navbar.jsx'
import WorkspaceShell from './components/layout/WorkspaceShell.jsx'
import LeftSidebar from './components/sidebar-left/LeftSidebar.jsx'
import CanvasDropZone from './components/canvas/CanvasDropZone.jsx'
import PropertiesPanel from './components/sidebar-right/PropertiesPanel.jsx'
import DeployModal from './components/deploy/DeployModal.jsx'
import CanvasBlockPreview from './components/canvas/CanvasBlockPreview.jsx'

const COLUMN_PREFIX = 'column-'
const IS_PREVIEW = new URLSearchParams(window.location.search).get('mode') === 'preview'

function resolveColumnTarget(overId, sections) {
  if (typeof overId === 'string' && overId.startsWith(COLUMN_PREFIX)) {
    return findColumnById(sections, overId.slice(COLUMN_PREFIX.length))
  }
  return findWidgetLocation(sections, overId)
}

function collisionDetectionStrategy(args) {
  const itemCollisions = closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter(c => c.data.current?.type !== 'column'),
  })
  if (itemCollisions.length > 0) return itemCollisions
  return closestCenter(args)
}

function AppInner() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  usePreviewSync(state)
  const [deployOpen, setDeployOpen] = useState(false)
  const [activeDragData, setActiveDragData] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const activePage = findPage(state.pages, state.activePageId)

  function handleDragStart({ active }) {
    setActiveDragData(active.data.current)
  }

  function handleDragEnd({ active, over }) {
    setActiveDragData(null)
    if (!over) return
    const type = active.data.current?.type

    if (type === 'catalog-block') {
      const target = resolveColumnTarget(over.id, activePage.sections)
      if (!target) return
      dispatch({
        type: ACTIONS.ADD_WIDGET,
        payload: { blockId: active.data.current.blockId, sectionId: target.sectionId, columnId: target.columnId },
      })
    } else if (type === 'canvas-block' && active.id !== over.id) {
      const activeLocation = findWidgetLocation(activePage.sections, active.id)
      const target = resolveColumnTarget(over.id, activePage.sections)
      if (!activeLocation || !target) return
      if (activeLocation.sectionId !== target.sectionId || activeLocation.columnId !== target.columnId) {
        dispatch({
          type: ACTIONS.MOVE_WIDGET,
          payload: { instanceId: active.id, toSectionId: target.sectionId, toColumnId: target.columnId },
        })
      } else {
        dispatch({
          type: ACTIONS.REORDER_WIDGETS,
          payload: { activeId: active.id, overId: over.id, sectionId: activeLocation.sectionId, columnId: activeLocation.columnId },
        })
      }
    }
  }

  const overlayBlock = activeDragData?.type === 'catalog-block'
    ? blockById[activeDragData.blockId]
    : null

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetectionStrategy} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Navbar onDeployClick={() => setDeployOpen(true)} />
      <WorkspaceShell
        left={<LeftSidebar />}
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
  return IS_PREVIEW ? <PreviewApp /> : <AppInner />
}
