import { useTranslation } from 'react-i18next'
import { SOURCE_TYPE_LABELS } from '../../data/blockContentSchemas.js'

export default function SourceSelector({ sourceTypes, value, onChange }) {
  const { t } = useTranslation()
  const isManual = value.type === 'manual'

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-light">
        {t('content.dataSource')}
      </p>

      {sourceTypes.length > 1 && (
        <div className="flex gap-1">
          {sourceTypes.map(type => (
            <button
              key={type}
              onClick={() => onChange({ ...value, type })}
              className={`flex-1 text-center py-1 px-1 rounded text-[10px] font-medium transition-colors ${
                value.type === type
                  ? 'bg-blue text-white'
                  : 'bg-slate text-slate-light hover:text-white'
              }`}
            >
              {t(`source.${type}`, { defaultValue: SOURCE_TYPE_LABELS[type] })}
            </button>
          ))}
        </div>
      )}

      {sourceTypes.length === 1 && (
        <p className="text-xs text-slate-light">
          {t(`source.${sourceTypes[0]}`, { defaultValue: SOURCE_TYPE_LABELS[sourceTypes[0]] })}
        </p>
      )}

      {isManual ? (
        <div className="bg-blue/10 border border-blue/20 rounded p-2 text-xs text-blue-electric">
          {t('content.manualBanner')}
        </div>
      ) : (
        <div>
          <label className="text-[10px] text-slate-light block mb-1">{t('content.urlLabel')}</label>
          <input
            type="url"
            value={value.url}
            onChange={e => onChange({ ...value, url: e.target.value })}
            placeholder={t(`source.placeholder_${value.type}`, {
              defaultValue:
                value.type === 'sharepoint-list'
                  ? 'https://tenant.sharepoint.com/sites/.../Lists/...'
                  : value.type === 'rss'
                  ? 'https://example.com/feed.xml'
                  : 'https://api.example.com/endpoint',
            })}
            className="w-full text-xs bg-slate border border-slate-mid rounded px-2 py-1.5 text-white placeholder-slate-mid focus:outline-none focus:border-blue"
          />
        </div>
      )}
    </div>
  )
}
