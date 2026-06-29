// client/src/App.jsx
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
import AnalyticsView from './components/analytics/AnalyticsView.jsx'
import ProjectDashboard from './components/projects/ProjectDashboard.jsx'
import ProjectFormModal from './components/projects/ProjectFormModal.jsx'
import { updateProject } from './lib/projectsApi.js'

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

function AppCanvas({ projectId, projectName, projectMeta, onUpdateMeta, onGoToDashboard }) {
  const { state, dispatch, ACTIONS } = useConfigurator()
  usePreviewSync(state)
  const [deployOpen, setDeployOpen]     = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [editOpen, setEditOpen]         = useState(false)
  const [activeDragData, setActiveDragData] = useState(null)
  const [saving, setSaving]             = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const activePage = findPage(state.pages, state.activePageId)

  function handleDragStart({ active }) { setActiveDragData(active.data.current) }

  function handleDragEnd({ active, over }) {
    setActiveDragData(null)
    if (!over) return
    const type = active.data.current?.type
    if (type === 'catalog-block') {
      const target = resolveColumnTarget(over.id, activePage.sections)
      if (!target) return
      dispatch({ type: ACTIONS.ADD_WIDGET, payload: { blockId: active.data.current.blockId, sectionId: target.sectionId, columnId: target.columnId } })
    } else if (type === 'canvas-block' && active.id !== over.id) {
      const activeLocation = findWidgetLocation(activePage.sections, active.id)
      const target = resolveColumnTarget(over.id, activePage.sections)
      if (!activeLocation || !target) return
      if (activeLocation.sectionId !== target.sectionId || activeLocation.columnId !== target.columnId) {
        dispatch({ type: ACTIONS.MOVE_WIDGET, payload: { instanceId: active.id, toSectionId: target.sectionId, toColumnId: target.columnId } })
      } else {
        dispatch({ type: ACTIONS.REORDER_WIDGETS, payload: { activeId: active.id, overId: over.id, sectionId: activeLocation.sectionId, columnId: activeLocation.columnId } })
      }
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateProject(projectId, {
        canvas_state: { pages: state.pages, activePageId: state.activePageId, tenantConfiguration: state.tenantConfiguration },
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeploySuccess(siteUrl) {
    await updateProject(projectId, { sp_url: siteUrl, status: 'published' })
  }

  async function handleEditProject(formData) {
    const updated = await updateProject(projectId, {
      name: formData.name,
      client: formData.client,
      description: formData.description,
      tags: formData.tags,
      status: formData.status,
    })
    onUpdateMeta(updated)
  }

  const overlayBlock = activeDragData?.type === 'catalog-block' ? blockById[activeDragData.blockId] : null

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetectionStrategy} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Navbar
        projectName={projectName}
        saving={saving}
        onSave={handleSave}
        onGoToDashboard={onGoToDashboard}
        onEditProject={() => setEditOpen(true)}
        onDeployClick={() => setDeployOpen(true)}
        onAnalyticsClick={() => setAnalyticsOpen(true)}
      />
      {analyticsOpen ? (
        <AnalyticsView onClose={() => setAnalyticsOpen(false)} />
      ) : (
        <WorkspaceShell left={<LeftSidebar />} center={<CanvasDropZone />} right={<PropertiesPanel />} />
      )}
      <DragOverlay>
        {overlayBlock && (
          <div className="bg-white border-2 border-flow-600 rounded-lg p-4 w-64 shadow-xl">
            <CanvasBlockPreview block={overlayBlock} />
          </div>
        )}
      </DragOverlay>
      {deployOpen && <DeployModal onClose={() => setDeployOpen(false)} onSuccess={handleDeploySuccess} />}
      {editOpen && <ProjectFormModal mode="edit" project={projectMeta} onSubmit={handleEditProject} onClose={() => setEditOpen(false)} />}
    </DndContext>
  )
}

function AppRoot() {
  const { dispatch, ACTIONS } = useConfigurator()
  const [activeProject, setActiveProject] = useState(null)

  function handleOpenProject(project) {
    dispatch({ type: ACTIONS.LOAD_PROJECT, payload: { canvasState: project.canvasState } })
    setActiveProject({ id: project.id, name: project.name, description: project.description, client: project.client, tags: project.tags, status: project.status })
  }

  function handleUpdateMeta(meta) {
    setActiveProject(prev => ({ ...prev, ...meta }))
  }

  if (!activeProject) {
    return <ProjectDashboard onOpen={handleOpenProject} />
  }

  return (
    <AppCanvas
      projectId={activeProject.id}
      projectName={activeProject.name}
      projectMeta={activeProject}
      onUpdateMeta={handleUpdateMeta}
      onGoToDashboard={() => setActiveProject(null)}
    />
  )
}

export default function App() {
  return IS_PREVIEW ? <PreviewApp /> : <AppRoot />
}
