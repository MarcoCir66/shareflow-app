import { useTranslation } from 'react-i18next'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import KpiCard from './KpiCard.jsx'
import RankedList from './RankedList.jsx'

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  return `${minutes}m ${seconds}s`
}

export default function AnalyticsOverview({ data, showComparison }) {
  const { t } = useTranslation()
  const { hub, sites, pages, news, documents } = data

  const deviceData = [
    { name: 'Desktop', value: hub.devicePct.desktop },
    { name: 'Mobile', value: hub.devicePct.mobile },
    { name: 'Tablet', value: hub.devicePct.tablet },
  ]
  const hourlyData = [
    { name: t('analytics.hourMorning'), value: hub.hourlyPct.morning },
    { name: t('analytics.hourLunch'), value: hub.hourlyPct.lunch },
    { name: t('analytics.hourAfternoon'), value: hub.hourlyPct.afternoon },
    { name: t('analytics.hourEvening'), value: hub.hourlyPct.evening },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label={t('analytics.kpiUniqueVisitors')} value={hub.uniqueVisitors} previousValue={hub.previousUniqueVisitors} showComparison={showComparison} />
        <KpiCard label={t('analytics.kpiTotalVisits')} value={hub.visits} previousValue={hub.previousVisits} showComparison={showComparison} />
        <KpiCard
          label={t('analytics.kpiAvgVisitsPerVisitor')}
          value={hub.visits / hub.uniqueVisitors}
          previousValue={hub.previousVisits / hub.previousUniqueVisitors}
          showComparison={showComparison}
          formatter={v => v.toFixed(1)}
        />
        <KpiCard
          label={t('analytics.kpiAvgTimePerUser')}
          value={hub.avgTimeSeconds}
          previousValue={hub.avgTimeSeconds}
          showComparison={showComparison}
          formatter={formatSeconds}
        />
      </div>

      <div className="bg-surface-card rounded-xl border border-slate-mid p-4">
        <h3 className="text-sm font-semibold text-navy mb-3">{t('analytics.trendTitle')}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={hub.trend}>
            <CartesianGrid stroke="#8899AA" strokeOpacity={0.2} />
            <XAxis dataKey="index" tickFormatter={i => t('analytics.trendPoint', { n: i })} stroke="#8899AA" fontSize={12} />
            <YAxis stroke="#8899AA" fontSize={12} />
            <Tooltip />
            <Area type="monotone" dataKey="visits" stroke="#0078D4" fill="#00B4FF" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <RankedList title={t('analytics.popularSites')} items={sites} />
        <RankedList title={t('analytics.popularPages')} items={pages} />
        <RankedList title={t('analytics.popularNews')} items={news} />
        <RankedList title={t('analytics.popularDocuments')} items={documents} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-card rounded-xl border border-slate-mid p-4">
          <h3 className="text-sm font-semibold text-navy mb-3">{t('analytics.deviceChartTitle')}</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={deviceData}>
              <XAxis dataKey="name" stroke="#8899AA" fontSize={12} />
              <YAxis stroke="#8899AA" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#0078D4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface-card rounded-xl border border-slate-mid p-4">
          <h3 className="text-sm font-semibold text-navy mb-3">{t('analytics.hourlyChartTitle')}</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={hourlyData}>
              <XAxis dataKey="name" stroke="#8899AA" fontSize={12} />
              <YAxis stroke="#8899AA" fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#00B4FF" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
