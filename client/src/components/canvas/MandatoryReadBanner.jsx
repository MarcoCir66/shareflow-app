import { useState } from 'react'
import { BookOpenCheck, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function MandatoryReadBanner({ widget }) {
  const { t } = useTranslation()
  const [confirmed, setConfirmed] = useState(false)

  if (widget.props.mandatoryRead !== true) return null

  return (
    <div
      className={`flex items-center gap-2 mb-2 px-3 py-2 rounded-lg border text-xs font-medium ${
        confirmed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'
      }`}
    >
      {confirmed ? <CheckCircle2 size={14} /> : <BookOpenCheck size={14} />}
      <span>{t('canvas.mandatoryReadBanner')}</span>
      <label className="ml-auto flex items-center gap-1.5 cursor-pointer">
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
        {t('canvas.mandatoryReadConfirm')}
      </label>
    </div>
  )
}
