import { MousePointerClick } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-mid flex items-center justify-center">
        <MousePointerClick size={22} className="text-slate-light" />
      </div>
      <p className="text-sm font-medium text-white">{t('props.noSelection')}</p>
      <p className="text-xs text-slate-light">{t('props.noSelectionHint')}</p>
    </div>
  )
}
