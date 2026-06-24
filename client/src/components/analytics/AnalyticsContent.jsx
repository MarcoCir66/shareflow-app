import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { computeDelta } from '../../utils/analyticsMath.js'
import RankedTable from './RankedTable.jsx'

const CONTENT_TYPES = { all: null, pages: 'pages', news: 'news', documents: 'documents' }

function topAndWorst(items) {
  const sorted = [...items].sort((a, b) => b.visits - a.visits)
  return { top: sorted.slice(0, 10), worst: sorted.slice(-10).reverse() }
}

export default function AnalyticsContent({ data }) {
  const { t } = useTranslation()
  const [siteFilter, setSiteFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const visibleTypes = typeFilter === 'all' ? ['pages', 'news', 'documents'] : [typeFilter]

  const standardColumns = [
    { key: 'name', label: t('analytics.colName') },
    { key: 'uniqueVisitors', label: t('analytics.colUniqueVisitors') },
    { key: 'visits', label: t('analytics.colVisits') },
    { key: 'avgVisitsPerVisitor', label: t('analytics.colAvgVisitsPerVisitor') },
  ]
  const deltaColumns = [
    { key: 'name', label: t('analytics.colName') },
    { key: 'previousVisits', label: t('analytics.colPreviousVisits') },
    { key: 'visits', label: t('analytics.colVisits') },
    { key: 'delta', label: t('analytics.colDelta') },
  ]

  function toRows(items) {
    return items.map(item => ({
      ...item,
      avgVisitsPerVisitor: (item.visits / item.uniqueVisitors).toFixed(1),
    }))
  }

  function filterBySite(items) {
    return siteFilter === 'all' ? items : items.filter(item => item.site === siteFilter)
  }

  const filteredPages = useMemo(() => filterBySite(data.pages), [data.pages, siteFilter])
  const filteredNews = useMemo(() => filterBySite(data.news), [data.news, siteFilter])
  const filteredDocuments = useMemo(() => filterBySite(data.documents), [data.documents, siteFilter])

  const allItemsWithType = useMemo(() => {
    const labeled = []
    if (visibleTypes.includes('pages')) labeled.push(...filteredPages.map(p => ({ ...p, type: 'pages' })))
    if (visibleTypes.includes('news')) labeled.push(...filteredNews.map(p => ({ ...p, type: 'news' })))
    if (visibleTypes.includes('documents')) labeled.push(...filteredDocuments.map(p => ({ ...p, type: 'documents' })))
    return labeled
  }, [filteredPages, filteredNews, filteredDocuments, visibleTypes])

  const declining = allItemsWithType
    .map(item => ({ ...item, delta: computeDelta(item.visits, item.previousVisits) }))
    .filter(item => item.delta < -10)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 10)
    .map(item => ({ ...item, delta: `${item.delta}%` }))

  const growing = allItemsWithType
    .map(item => ({ ...item, delta: computeDelta(item.visits, item.previousVisits) }))
    .filter(item => item.delta > 10)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 10)
    .map(item => ({ ...item, delta: `+${item.delta}%` }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 bg-surface-card border border-slate-mid rounded-xl px-4 py-3">
        <label className="flex items-center gap-2 text-sm text-navy">
          {t('analytics.siteFilterLabel')}
          <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="border border-slate-mid rounded-lg px-2 py-1 text-sm">
            <option value="all">{t('analytics.allSites')}</option>
            {data.sites.map(site => <option key={site.name} value={site.name}>{site.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-navy">
          {t('analytics.typeFilterLabel')}
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-slate-mid rounded-lg px-2 py-1 text-sm">
            <option value="all">{t('analytics.allTypes')}</option>
            <option value="pages">{t('analytics.typePages')}</option>
            <option value="news">{t('analytics.typeNews')}</option>
            <option value="documents">{t('analytics.typeDocuments')}</option>
          </select>
        </label>
      </div>

      {visibleTypes.includes('pages') && (() => {
        const { top, worst } = topAndWorst(filteredPages)
        return (
          <div className="grid grid-cols-2 gap-4">
            <RankedTable title={t('analytics.topPages')} rows={toRows(top)} columns={standardColumns} />
            <RankedTable title={t('analytics.worstPages')} rows={toRows(worst)} columns={standardColumns} />
          </div>
        )
      })()}
      {visibleTypes.includes('news') && (() => {
        const { top, worst } = topAndWorst(filteredNews)
        return (
          <div className="grid grid-cols-2 gap-4">
            <RankedTable title={t('analytics.topNews')} rows={toRows(top)} columns={standardColumns} />
            <RankedTable title={t('analytics.worstNews')} rows={toRows(worst)} columns={standardColumns} />
          </div>
        )
      })()}
      {visibleTypes.includes('documents') && (() => {
        const { top, worst } = topAndWorst(filteredDocuments)
        return (
          <div className="grid grid-cols-2 gap-4">
            <RankedTable title={t('analytics.topDocuments')} rows={toRows(top)} columns={standardColumns} />
            <RankedTable title={t('analytics.worstDocuments')} rows={toRows(worst)} columns={standardColumns} />
          </div>
        )
      })()}

      <div className="grid grid-cols-2 gap-4">
        <RankedTable title={t('analytics.declining')} rows={declining} columns={deltaColumns} />
        <RankedTable title={t('analytics.growing')} rows={growing} columns={deltaColumns} />
      </div>
    </div>
  )
}
