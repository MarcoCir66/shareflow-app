import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { CATEGORY_LABELS } from '../../data/blockCatalog.js'
import BlockCard from './BlockCard.jsx'

export default function CategoryGroup({ category, blocks }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-mid transition-colors"
      >
        <span className="text-xs font-semibold text-slate-light uppercase tracking-wider">
          {CATEGORY_LABELS[category]}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-mid text-slate-light px-1.5 py-0.5 rounded-full">
            {blocks.length}
          </span>
          {open
            ? <ChevronDown size={14} className="text-slate-light" />
            : <ChevronRight size={14} className="text-slate-light" />
          }
        </div>
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          {blocks.map(block => <BlockCard key={block.id} block={block} />)}
        </div>
      )}
    </div>
  )
}
