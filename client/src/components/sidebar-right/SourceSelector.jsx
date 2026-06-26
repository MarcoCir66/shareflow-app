import { useTranslation } from 'react-i18next'
import { SOURCE_TYPE_LABELS } from '../../data/blockContentSchemas.js'

export default function SourceSelector({ sourceTypes, value, onChange }) {
  const { t } = useTranslation()
  const isManual = value.type === 'manual'

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
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
                  ? 'bg-flow-600 text-white'
                  : 'bg-ink-800 text-ink-400 hover:text-white'
              }`}
            >
              {t(`source.${type}`, { defaultValue: SOURCE_TYPE_LABELS[type] })}
            </button>
          ))}
        </div>
      )}

      {sourceTypes.length === 1 && (
        <p className="text-xs text-ink-400">
          {t(`source.${sourceTypes[0]}`, { defaultValue: SOURCE_TYPE_LABELS[sourceTypes[0]] })}
        </p>
      )}

      {isManual ? (
        <div className="bg-flow-600/10 border border-flow-600/20 rounded p-2 text-xs text-flow-400">
          {t('content.manualBanner')}
        </div>
      ) : (
        <div>
          <label className="text-[10px] text-ink-400 block mb-1">{t('content.urlLabel')}</label>
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
            className="w-full text-xs bg-ink-800 border border-ink-700 rounded px-2 py-1.5 text-white placeholder-ink-700 focus:outline-none focus:border-flow-600"
          />
        </div>
      )}
    </div>
  )
}
