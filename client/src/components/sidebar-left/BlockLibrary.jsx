import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { blockCatalog, CATEGORIES } from '../../data/blockCatalog.js'
import CategoryGroup from './CategoryGroup.jsx'

export default function BlockLibrary() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return q ? blockCatalog.filter(b => b.label.toLowerCase().includes(q)) : blockCatalog
  }, [query])

  const grouped = useMemo(() => {
    return Object.values(CATEGORIES).map(cat => ({
      category: cat,
      blocks: filtered.filter(b => b.category === cat),
    })).filter(g => g.blocks.length > 0)
  }, [filtered])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-mid">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-light" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search blocks…"
            className="w-full bg-slate-mid text-white text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-mid focus:border-blue-electric focus:outline-none placeholder-slate-light"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {grouped.map(({ category, blocks }) => (
          <CategoryGroup key={category} category={category} blocks={blocks} />
        ))}
        {grouped.length === 0 && (
          <p className="text-slate-light text-xs text-center py-8">No blocks match "{query}"</p>
        )}
      </div>
    </div>
  )
}
