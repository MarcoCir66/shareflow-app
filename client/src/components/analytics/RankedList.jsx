import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function RankedList({ title, items }) {
  const { t } = useTranslation()
  const [sortBy, setSortBy] = useState('visits')

  const sorted = [...items].sort((a, b) => b[sortBy] - a[sortBy]).slice(0, 5)

  return (
    <div className="bg-white rounded-xl border border-ink-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink-950">{title}</h3>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          aria-label={t('analytics.rankingMetricLabel')}
          className="text-xs border border-ink-700 rounded-lg px-2 py-1"
        >
          <option value="visits">{t('analytics.byVisits')}</option>
          <option value="uniqueVisitors">{t('analytics.byUniqueVisitors')}</option>
        </select>
      </div>
      <ol className="space-y-1.5">
        {sorted.map((item, i) => (
          <li key={item.name} className="flex items-center justify-between text-sm">
            <span className="text-ink-950 truncate">{i + 1}. {item.name}</span>
            <span className="text-ink-400 flex-shrink-0 ml-2">{item[sortBy].toLocaleString('it-IT')}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
