import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getAnalyticsData, PERIODS } from '../../data/analyticsMockData.js'
import AnalyticsFilterBar from './AnalyticsFilterBar.jsx'
import AnalyticsOverview from './AnalyticsOverview.jsx'

const TABS = ['overview', 'sites', 'content']

export default function AnalyticsView({ onClose }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('overview')
  const [period, setPeriod] = useState(PERIODS[0])
  const [showComparison, setShowComparison] = useState(false)

  const data = getAnalyticsData(period)

  return (
    <div className="overflow-y-auto bg-surface" style={{ height: 'calc(100vh - 3.5rem)', marginTop: '3.5rem' }}>
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-light hover:text-navy text-sm"
          >
            <ArrowLeft size={16} />
            {t('analytics.backToEditor')}
          </button>
        </div>

        <div className="flex gap-2 mb-4 border-b border-slate-mid">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-blue text-blue' : 'border-transparent text-slate-light hover:text-navy'
              }`}
            >
              {t(`analytics.tab${tab.charAt(0).toUpperCase()}${tab.slice(1)}`)}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <AnalyticsFilterBar
            period={period}
            onPeriodChange={setPeriod}
            showComparison={showComparison}
            onToggleComparison={setShowComparison}
          />
        </div>

        {activeTab === 'overview' && <AnalyticsOverview data={data} showComparison={showComparison} />}
        {activeTab === 'sites' && <div data-testid="analytics-sites-placeholder">{t('analytics.tabSites')}</div>}
        {activeTab === 'content' && <div data-testid="analytics-content-placeholder">{t('analytics.tabContent')}</div>}
      </div>
    </div>
  )
}
