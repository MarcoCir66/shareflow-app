import { useTranslation } from 'react-i18next'

const SCOPE_VALUES = ['corporate', 'country', 'sede', 'funzione']

export default function ScopeSelector({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <div>
      <label className="block text-xs text-slate-light mb-2 uppercase tracking-wider font-medium">{t('props.scope')}</label>
      <div className="flex flex-wrap gap-2">
        {SCOPE_VALUES.map(scopeValue => (
          <button
            key={scopeValue}
            onClick={() => onChange(scopeValue)}
            className={`
              text-xs px-3 py-1.5 rounded-full border font-medium transition-all
              ${value === scopeValue
                ? 'bg-blue-electric border-blue-electric text-navy'
                : 'border-slate-mid text-slate-light hover:border-blue-electric hover:text-white'
              }
            `}
          >
            {t(`scope.${scopeValue}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
