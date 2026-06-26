import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { blockCatalog, CATEGORIES } from '../../data/blockCatalog.js'
import CategoryGroup from './CategoryGroup.jsx'

export default function BlockLibrary() {
  const { t } = useTranslation()
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
      <div className="p-3 border-b border-ink-700">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('blocks.search')}
            className="w-full bg-ink-700 text-white text-xs pl-8 pr-3 py-2 rounded-lg border border-ink-700 focus:border-flow-400 focus:outline-none placeholder-ink-400"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {grouped.map(({ category, blocks }) => (
          <CategoryGroup key={category} category={category} blocks={blocks} />
        ))}
        {grouped.length === 0 && (
          <p className="text-ink-400 text-xs text-center py-8">
            {t('blocks.noResults', { query })}
          </p>
        )}
      </div>
    </div>
  )
}
