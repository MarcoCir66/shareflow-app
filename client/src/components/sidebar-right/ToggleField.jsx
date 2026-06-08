export default function ToggleField({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-white">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`
          relative w-10 h-5 rounded-full transition-colors
          ${value ? 'bg-blue-electric' : 'bg-slate-mid'}
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform
            ${value ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  )
}
