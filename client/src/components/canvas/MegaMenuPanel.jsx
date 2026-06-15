export default function MegaMenuPanel({ node, activePageId, onSelect }) {
  return (
    <div className="bg-surface px-3 py-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {node.children.map(child => (
          <MegaMenuColumn key={child.pageId} node={child} activePageId={activePageId} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

function MegaMenuColumn({ node, activePageId, onSelect }) {
  const isActive = node.pageId === activePageId
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => onSelect(node.pageId)}
        title={node.title}
        className={`block w-full truncate text-left text-xs font-semibold transition-colors
          ${isActive ? 'text-blue' : 'text-slate-light hover:text-navy'}`}
      >
        {node.title}
      </button>
      {node.children.length > 0 && (
        <ul className="mt-1.5 space-y-1 border-l border-slate-mid pl-2">
          {node.children.map(grandchild => (
            <MegaMenuItem key={grandchild.pageId} node={grandchild} activePageId={activePageId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </div>
  )
}

function MegaMenuItem({ node, activePageId, onSelect }) {
  const isActive = node.pageId === activePageId
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={() => onSelect(node.pageId)}
        title={node.title}
        className={`block w-full truncate text-left text-xs transition-colors
          ${isActive ? 'text-blue font-semibold' : 'text-slate-light hover:text-navy'}`}
      >
        {node.title}
      </button>
      {node.children.length > 0 && (
        <ul className="mt-1.5 space-y-1 border-l border-slate-mid pl-2">
          {node.children.map(greatGrandchild => (
            <MegaMenuItem key={greatGrandchild.pageId} node={greatGrandchild} activePageId={activePageId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  )
}
