import { useConfigurator } from '../../hooks/useConfigurator.js'
import { buildPageTree } from '../../context/pageHelpers.js'

function isInSubtree(node, pageId) {
  return node.pageId === pageId || node.children.some(child => isInSubtree(child, pageId))
}

export default function CanvasTopNav() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const tree = buildPageTree(state.pages)
  const activeRoot = tree.find(root => isInSubtree(root, state.activePageId))

  function select(pageId) {
    dispatch({ type: ACTIONS.SELECT_PAGE, payload: { pageId } })
  }

  return (
    <div className="mb-4 border-b border-slate-mid">
      <nav className="flex gap-1 overflow-x-auto">
        {tree.map(page => (
          <button
            key={page.pageId}
            onClick={() => select(page.pageId)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors
              ${activeRoot?.pageId === page.pageId ? 'border-blue-electric text-navy' : 'border-transparent text-slate-light hover:text-navy'}`}
          >
            {page.title}
          </button>
        ))}
      </nav>
      {activeRoot && activeRoot.children.length > 0 && (
        <nav className="flex gap-1 overflow-x-auto bg-surface px-2">
          {activeRoot.children.map(page => (
            <button
              key={page.pageId}
              onClick={() => select(page.pageId)}
              className={`px-3 py-1.5 text-xs whitespace-nowrap transition-colors
                ${page.pageId === state.activePageId ? 'text-blue font-semibold' : 'text-slate-light hover:text-slate'}`}
            >
              {page.title}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
