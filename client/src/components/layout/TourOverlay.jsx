import { TOUR_STEPS } from '../../data/tourSteps.js'

const POPOVER_WIDTH = 320
const POPOVER_OFFSET = 12

function computePopoverStyle(rect, position) {
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  switch (position) {
    case 'right':
      return { top: rect.top + rect.height / 2, left: rect.right + POPOVER_OFFSET, transform: 'translateY(-50%)' }
    case 'left':
      return { top: rect.top + rect.height / 2, left: rect.left - POPOVER_WIDTH - POPOVER_OFFSET, transform: 'translateY(-50%)' }
    case 'top':
      return { top: rect.top - POPOVER_OFFSET, left: rect.left + rect.width / 2, transform: 'translate(-50%, -100%)' }
    case 'bottom':
    default:
      return { top: rect.bottom + POPOVER_OFFSET, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }
  }
}

export default function TourOverlay({ stepIndex, rect, onNext, onPrev, onSkip }) {
  const step = TOUR_STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === TOUR_STEPS.length - 1
  const popoverStyle = computePopoverStyle(rect, step?.popoverPosition)

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      {rect && (
        <div
          style={{
            position: 'fixed',
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: '0 0 0 9999px rgba(13, 13, 31, 0.85)',
            borderRadius: 8,
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        className="pointer-events-auto fixed bg-ink-800 border border-ink-700 rounded-2xl shadow-2xl p-5"
        style={{ width: POPOVER_WIDTH, ...popoverStyle }}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">{step?.title}</h3>
          <span className="text-ink-400 text-xs ml-3 flex-shrink-0">
            {stepIndex + 1} / {TOUR_STEPS.length}
          </span>
        </div>
        <p className="text-ink-300 text-sm leading-relaxed mb-4">{step?.description}</p>
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-ink-400 hover:text-white text-sm transition-colors"
          >
            Salta
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={isFirst}
              className="text-ink-400 hover:text-white text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Indietro
            </button>
            <button
              onClick={onNext}
              className="bg-flow-400 hover:bg-flow-600 text-ink-950 font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              {isLast ? 'Inizia a costruire' : 'Avanti →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
