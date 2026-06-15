import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { buildPageTree } from '../../context/pageHelpers.js'
import MegaMenuPanel from './MegaMenuPanel.jsx'

function isInSubtree(node, pageId) {
  return node.pageId === pageId || node.children.some(child => isInSubtree(child, pageId))
}

export default function CanvasTopNav() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const [closedRootId, setClosedRootId] = useState(null)
  const tree = buildPageTree(state.pages)
  const activeRoot = tree.find(root => isInSubtree(root, state.activePageId))
  const openRoot = activeRoot && activeRoot.children.length > 0 && activeRoot.pageId !== closedRootId
    ? activeRoot
    : null

  function select(pageId) {
    dispatch({ type: ACTIONS.SELECT_PAGE, payload: { pageId } })
  }

  function handleRootClick(root) {
    if (root.pageId !== activeRoot.pageId) {
      select(root.pageId)
      if (closedRootId === root.pageId) setClosedRootId(null)
    } else if (state.activePageId !== root.pageId) {
      select(root.pageId)
    } else {
      setClosedRootId(prev => (prev === root.pageId ? null : root.pageId))
    }
  }

  return (
    <div className="mb-4 border-b border-slate-mid">
      <nav className="flex gap-1 overflow-x-auto">
        {tree.map(page => (
          <button
            key={page.pageId}
            onClick={() => handleRootClick(page)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors
              ${activeRoot.pageId === page.pageId ? 'border-blue-electric text-navy' : 'border-transparent text-slate-light hover:text-navy'}`}
          >
            {page.title}
            {page.children.length > 0 && (
              openRoot?.pageId === page.pageId ? <ChevronUp size={12} /> : <ChevronDown size={12} />
            )}
          </button>
        ))}
      </nav>
      {openRoot && <MegaMenuPanel node={openRoot} activePageId={state.activePageId} onSelect={select} />}
    </div>
  )
}
