import { MousePointerClick } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-ink-700 flex items-center justify-center">
        <MousePointerClick size={22} className="text-ink-400" />
      </div>
      <p className="text-sm font-medium text-white">{t('props.noSelection')}</p>
      <p className="text-xs text-ink-400">{t('props.noSelectionHint')}</p>
    </div>
  )
}
