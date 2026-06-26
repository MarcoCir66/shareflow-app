import { computeDelta } from '../../utils/analyticsMath.js'

export default function KpiCard({ label, value, previousValue, showComparison, formatter = v => v.toLocaleString('it-IT') }) {
  const delta = computeDelta(value, previousValue)
  const isPositive = delta >= 0

  return (
    <div className="bg-white rounded-xl border border-ink-700 p-4">
      <div className="text-xs text-ink-400 mb-1">{label}</div>
      <div className="text-2xl font-semibold text-ink-950">{formatter(value)}</div>
      {showComparison && (
        <div className={`text-xs font-medium mt-1 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}{delta}%
        </div>
      )}
    </div>
  )
}
