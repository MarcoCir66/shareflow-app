export default function ToggleField({ label, value, onChange, spNote = null }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="flex items-center gap-1.5 text-sm text-white">
        {label}
        {spNote && (
          <span
            className="relative group cursor-default"
            aria-label={spNote}
          >
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-semibold leading-none bg-blue-500/20 text-blue-300 border border-blue-500/40">
              SP
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 rounded bg-ink-800 border border-ink-600 p-2 text-xs text-ink-200 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              {spNote}
            </span>
          </span>
        )}
      </span>
      <button
        onClick={() => onChange(!value)}
        className={`
          relative w-10 h-5 rounded-full transition-colors
          ${value ? 'bg-flow-400' : 'bg-ink-700'}
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
