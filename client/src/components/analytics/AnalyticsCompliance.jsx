import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { collectMandatoryBlocks } from '../../context/sectionHelpers.js'
import { hashToCompletionPercent } from '../../utils/analyticsCompliance.js'
import { blockById } from '../../data/blockCatalog.js'
import { useLang } from '../../hooks/useLang.js'
import KpiCard from './KpiCard.jsx'
import RankedTable from './RankedTable.jsx'

export default function AnalyticsCompliance({ pages }) {
  const { t } = useTranslation()
  const lang = useLang()

  const items = useMemo(() => {
    return collectMandatoryBlocks(pages, lang).map(item => ({
      ...item,
      blockLabel: t(`blocks.labels.${item.blockId}`, { defaultValue: blockById[item.blockId]?.label ?? item.blockId }),
      completion: hashToCompletionPercent(item.instanceId),
    }))
  }, [pages, lang, t])

  if (items.length === 0) {
    return (
      <div className="bg-surface-card rounded-xl border border-slate-mid p-8 text-center text-slate-light text-sm">
        {t('analytics.complianceEmpty')}
      </div>
    )
  }

  const avgCompletion = Math.round(items.reduce((sum, i) => sum + i.completion, 0) / items.length)
  const lateCount = items.filter(i => i.completion < 50).length

  const tableRows = [...items]
    .sort((a, b) => a.completion - b.completion)
    .map(i => ({ page: i.pageTitle, block: i.blockLabel, completion: `${i.completion}%` }))

  const tableColumns = [
    { key: 'page', label: t('analytics.colPage') },
    { key: 'block', label: t('analytics.colBlock') },
    { key: 'completion', label: t('analytics.colCompletion') },
  ]

  const byPage = new Map()
  for (const item of items) {
    if (!byPage.has(item.pageTitle)) byPage.set(item.pageTitle, [])
    byPage.get(item.pageTitle).push(item.completion)
  }
  const chartData = [...byPage.entries()].map(([name, values]) => ({
    name,
    value: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label={t('analytics.complianceKpiCount')} value={items.length} showComparison={false} />
        <KpiCard label={t('analytics.complianceKpiAvg')} value={avgCompletion} showComparison={false} formatter={v => `${v}%`} />
        <KpiCard label={t('analytics.complianceKpiLate')} value={lateCount} showComparison={false} />
      </div>

      <div className="bg-surface-card rounded-xl border border-slate-mid p-4">
        <h3 className="text-sm font-semibold text-navy mb-3">{t('analytics.complianceChartTitle')}</h3>
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" stroke="#8899AA" fontSize={12} domain={[0, 100]} />
            <YAxis type="category" dataKey="name" stroke="#8899AA" fontSize={12} width={140} />
            <Tooltip />
            <Bar dataKey="value" fill="#0078D4" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <RankedTable title={t('analytics.complianceTableTitle')} rows={tableRows} columns={tableColumns} />
    </div>
  )
}
