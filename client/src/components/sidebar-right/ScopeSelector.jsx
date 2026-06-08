const SCOPE_OPTIONS = [
  { value: 'corporate', label: 'Corporate' },
  { value: 'country',   label: 'Country' },
  { value: 'sede',      label: 'Sede' },
  { value: 'funzione',  label: 'Funzione' },
]

export default function ScopeSelector({ value, onChange }) {
  return (
    <div>
      <label className="block text-xs text-slate-light mb-2 uppercase tracking-wider font-medium">Scope</label>
      <div className="flex flex-wrap gap-2">
        {SCOPE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`
              text-xs px-3 py-1.5 rounded-full border font-medium transition-all
              ${value === opt.value
                ? 'bg-blue-electric border-blue-electric text-navy'
                : 'border-slate-mid text-slate-light hover:border-blue-electric hover:text-white'
              }
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
