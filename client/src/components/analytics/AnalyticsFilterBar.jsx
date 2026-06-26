import { useTranslation } from 'react-i18next'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'
import { PERIODS, PERIOD_LABELS } from '../../data/analyticsMockData.js'

export default function AnalyticsFilterBar({ period, onPeriodChange, showComparison, onToggleComparison }) {
  const { t } = useTranslation()
  const lang = useLang()

  return (
    <div className="flex items-center gap-4 bg-white border border-ink-700 rounded-xl px-4 py-3">
      <label className="flex items-center gap-2 text-sm text-ink-950">
        {t('analytics.periodLabel')}
        <select
          value={period}
          onChange={e => onPeriodChange(e.target.value)}
          className="border border-ink-700 rounded-lg px-2 py-1 text-sm"
        >
          {PERIODS.map(key => (
            <option key={key} value={key}>{t2(PERIOD_LABELS[key], lang)}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-950 cursor-pointer">
        <input type="checkbox" checked={showComparison} onChange={e => onToggleComparison(e.target.checked)} />
        {t('analytics.compareToggle')}
      </label>
    </div>
  )
}
