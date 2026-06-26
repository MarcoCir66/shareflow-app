import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const METRICS = {
  uniqueVisitors: site => site.uniqueVisitors,
  visits: site => site.visits,
  avgVisitsPerVisitor: site => site.visits / site.uniqueVisitors,
  avgTimeSeconds: site => site.avgTimeSeconds,
  mobilePct: site => site.mobilePct,
  afternoonPct: site => site.afternoonPct,
}

export default function AnalyticsSites({ data }) {
  const { t } = useTranslation()
  const [metric, setMetric] = useState('uniqueVisitors')

  const rankedSites = useMemo(
    () => [...data.sites].sort((a, b) => METRICS[metric](b) - METRICS[metric](a)),
    [data.sites, metric]
  )
  const top10Names = useMemo(() => rankedSites.slice(0, 10).map(s => s.name), [rankedSites])

  const [selectedNames, setSelectedNames] = useState(top10Names)

  function toggleSite(name) {
    setSelectedNames(current =>
      current.includes(name) ? current.filter(n => n !== name) : [...current, name]
    )
  }

  const chartData = rankedSites
    .filter(site => selectedNames.includes(site.name))
    .map(site => ({ name: site.name, value: Math.round(METRICS[metric](site) * 10) / 10 }))

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-ink-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ink-950">{t('analytics.sitesRankingTitle')}</h3>
          <select
            value={metric}
            onChange={e => setMetric(e.target.value)}
            className="text-xs border border-ink-700 rounded-lg px-2 py-1"
          >
            <option value="uniqueVisitors">{t('analytics.metricUniqueVisitors')}</option>
            <option value="visits">{t('analytics.metricVisits')}</option>
            <option value="avgVisitsPerVisitor">{t('analytics.metricAvgVisitsPerVisitor')}</option>
            <option value="avgTimeSeconds">{t('analytics.metricAvgTime')}</option>
            <option value="mobilePct">{t('analytics.metricMobile')}</option>
            <option value="afternoonPct">{t('analytics.metricAfternoon')}</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" stroke="#8899AA" fontSize={12} />
            <YAxis type="category" dataKey="name" stroke="#8899AA" fontSize={12} width={140} />
            <Tooltip />
            <Bar dataKey="value" fill="#0078D4" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-ink-700 p-4">
        <h3 className="text-sm font-semibold text-ink-950 mb-3">{t('analytics.siteSelectorTitle')}</h3>
        <div className="grid grid-cols-3 gap-2">
          {rankedSites.map(site => (
            <label key={site.name} className="flex items-center gap-2 text-sm text-ink-950">
              <input
                type="checkbox"
                checked={selectedNames.includes(site.name)}
                onChange={() => toggleSite(site.name)}
              />
              {site.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
