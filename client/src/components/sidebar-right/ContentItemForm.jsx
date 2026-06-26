import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function ContentItemForm({ schema, item, onSave, onCancel }) {
  const { t } = useTranslation()
  const [values, setValues] = useState(() => {
    const init = {}
    schema.forEach(field => { init[field.key] = item[field.key] ?? '' })
    return init
  })
  const [errors, setErrors] = useState({})

  function set(key, val) {
    setValues(v => ({ ...v, [key]: val }))
  }

  function handleSave() {
    const newErrors = {}
    schema.filter(f => f.required).forEach(f => {
      const v = values[f.key]
      const empty = !v || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '')
      if (empty) newErrors[f.key] = true
    })
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    onSave(values)
  }

  return (
    <div className="border border-flow-600/40 rounded p-3 mb-2 space-y-2 bg-ink-800">
      {schema.map(field => (
        <div key={field.key}>
          <label className="text-[10px] text-ink-400 block mb-0.5">
            {field.label}
            {field.required && <span className="text-red-400 ml-0.5">*</span>}
          </label>

          {field.type === 'textarea' ? (
            <textarea
              value={values[field.key]}
              onChange={e => set(field.key, e.target.value)}
              rows={3}
              className={`w-full text-xs bg-ink-950 border rounded px-2 py-1 text-white focus:outline-none resize-none ${
                errors[field.key] ? 'border-red-400' : 'border-ink-700 focus:border-flow-600'
              }`}
            />
          ) : field.type === 'select' ? (
            <select
              value={values[field.key]}
              onChange={e => set(field.key, e.target.value)}
              className={`w-full text-xs bg-ink-950 border rounded px-2 py-1 text-white focus:outline-none ${
                errors[field.key] ? 'border-red-400' : 'border-ink-700 focus:border-flow-600'
              }`}
            >
              <option value="">{t('content.selectPlaceholder')}</option>
              {field.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field.type === 'array' ? (
            <textarea
              value={Array.isArray(values[field.key]) ? values[field.key].join('\n') : values[field.key]}
              onChange={e => set(field.key, e.target.value.split('\n').filter(Boolean))}
              rows={3}
              placeholder={t('content.onePerLine')}
              className={`w-full text-xs bg-ink-950 border rounded px-2 py-1 text-white placeholder-ink-700 focus:outline-none resize-none ${
                errors[field.key] ? 'border-red-400' : 'border-ink-700 focus:border-flow-600'
              }`}
            />
          ) : (
            <input
              type={field.type === 'date' ? 'date' : field.type === 'url' ? 'url' : 'text'}
              value={values[field.key]}
              onChange={e => set(field.key, e.target.value)}
              className={`w-full text-xs bg-ink-950 border rounded px-2 py-1 text-white focus:outline-none ${
                errors[field.key] ? 'border-red-400' : 'border-ink-700 focus:border-flow-600'
              }`}
            />
          )}
        </div>
      ))}

      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="text-xs text-ink-400 hover:text-white px-2 py-1 transition-colors"
        >
          {t('content.cancel')}
        </button>
        <button
          onClick={handleSave}
          className="text-xs bg-flow-600 hover:bg-flow-600/80 text-white rounded px-3 py-1 transition-colors"
        >
          {t('content.save')}
        </button>
      </div>
    </div>
  )
}
