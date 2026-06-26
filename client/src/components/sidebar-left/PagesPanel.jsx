import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { getDepth, hasChildren as pageHasChildren, getSubtreeEndIndex, getProjection } from '../../context/pageHelpers.js'
import PageTreeItem, { INDENT_WIDTH } from './PageTreeItem.jsx'

function isVisible(pages, page, collapsedIds) {
  let current = page
  while (current.parentId !== null) {
    if (collapsedIds.has(current.parentId)) return false
    current = pages.find(p => p.pageId === current.parentId)
  }
  return true
}

export default function PagesPanel() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  // Pages are expanded by default; this set tracks the (rare) collapsed ones,
  // so newly-added pages don't need to be retroactively marked as expanded.
  const [collapsedIds, setCollapsedIds] = useState(() => new Set())

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const { t } = useTranslation()

  function toggleExpand(pageId) {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(pageId)) next.delete(pageId)
      else next.add(pageId)
      return next
    })
  }

  function handleDragEnd({ active, over, delta }) {
    if (!over || active.id === over.id) return

    const activeIndex = state.pages.findIndex(p => p.pageId === active.id)
    const overIndex = state.pages.findIndex(p => p.pageId === over.id)
    const subtreeEnd = getSubtreeEndIndex(state.pages, activeIndex)
    if (overIndex >= activeIndex && overIndex <= subtreeEnd) return // dropped on self/descendant

    const projection = getProjection(state.pages, active.id, over.id, delta.x, INDENT_WIDTH)
    dispatch({ type: ACTIONS.MOVE_PAGE, payload: { activeId: active.id, overId: over.id, depth: projection.depth } })
  }

  const visiblePages = state.pages.filter(page => isVisible(state.pages, page, collapsedIds))

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-ink-700 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">{t('pages.title')}</span>
        <button
          onClick={() => dispatch({ type: ACTIONS.ADD_PAGE, payload: { parentId: null } })}
          className="flex items-center gap-1 text-xs font-medium text-flow-400 hover:text-white transition-colors"
        >
          <Plus size={14} /> {t('pages.add')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visiblePages.map(p => p.pageId)} strategy={verticalListSortingStrategy}>
            {visiblePages.map(page => (
              <PageTreeItem
                key={page.pageId}
                page={page}
                depth={getDepth(state.pages, page.pageId)}
                isActive={page.pageId === state.activePageId}
                hasChildren={pageHasChildren(state.pages, page.pageId)}
                expanded={!collapsedIds.has(page.pageId)}
                onToggleExpand={() => toggleExpand(page.pageId)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
