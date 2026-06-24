import * as icons from 'lucide-react'
import Header from './BlockPreviewHeader.jsx'
import { useTheme } from '../../hooks/useTheme.js'
import { getMonthGrid } from './calendarGrid.js'

const WEEKDAY_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

export default function CalendarBlockPreview({ block, contentItems = [] }) {
  const { template } = useTheme()
  const Icon = icons[block.icon] ?? icons.Box
  const today = new Date()
  const weeks = getMonthGrid(today.getFullYear(), today.getMonth())

  const eventDays = new Set(
    contentItems
      .map(item => item.date && new Date(item.date))
      .filter(d => d && d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth())
      .map(d => d.getDate())
  )

  return (
    <div>
      <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} className={`text-[10px] font-semibold ${template.card.textMuted}`}>{label}</span>
        ))}
        {weeks.flat().map((cell, i) => (
          <div key={i} className="flex flex-col items-center py-0.5">
            <span className={`text-[11px] ${cell.inMonth ? template.card.text : `${template.card.textMuted} opacity-40`}`}>
              {cell.day}
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full mt-0.5 ${cell.inMonth && eventDays.has(cell.day) ? template.card.iconBg : ''}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
