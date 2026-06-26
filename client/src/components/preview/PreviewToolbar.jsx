import { Monitor, Tablet, Smartphone, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function PreviewToolbar({ device, onDevice }) {
  const { t } = useTranslation()

  const DEVICES = [
    { key: 'desktop', label: t('preview.desktop'), Icon: Monitor },
    { key: 'tablet',  label: t('preview.tablet'),  Icon: Tablet },
    { key: 'mobile',  label: t('preview.mobile'),  Icon: Smartphone },
  ]

  return (
    <div className="flex items-center justify-between bg-ink-950 h-10 px-4 flex-shrink-0 border-b border-ink-800">
      <div className="flex items-center gap-2">
        <img src="/favicon.svg" alt="" className="w-5 h-5" />
        <span className="text-flow-400 font-bold text-sm">ShareFlow</span>
        <span className="bg-green-500 text-white text-[9px] font-bold rounded px-1.5 py-0.5 tracking-wide">
          LIVE
        </span>
      </div>

      <div className="flex gap-1 bg-ink-800 rounded-md p-0.5">
        {DEVICES.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onDevice(key)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-medium transition-colors ${
              device === key ? 'bg-flow-600 text-white' : 'text-ink-400 hover:text-white'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={() => window.opener ? window.close() : (window.location.href = '/')}
        className="flex items-center gap-1 text-ink-400 hover:text-white text-[10px] transition-colors"
      >
        <X size={12} />
        {t('preview.close')}
      </button>
    </div>
  )
}
