import { useTranslation } from 'react-i18next'
import { TOUR_STEPS } from '../../data/tourSteps.js'

const POPOVER_WIDTH = 320
const POPOVER_OFFSET = 12
const POPOVER_MARGIN = 8
const POPOVER_HEIGHT_EST = 220

function computePopoverStyle(rect, position) {
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

  const vw = window.innerWidth
  const vh = window.innerHeight
  let top, left

  switch (position) {
    case 'right':
      top = rect.top + rect.height / 2 - POPOVER_HEIGHT_EST / 2
      left = rect.right + POPOVER_OFFSET
      break
    case 'left':
      top = rect.top + rect.height / 2 - POPOVER_HEIGHT_EST / 2
      left = rect.left - POPOVER_WIDTH - POPOVER_OFFSET
      break
    case 'top':
      top = rect.top - POPOVER_OFFSET - POPOVER_HEIGHT_EST
      left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2
      break
    case 'bottom':
    default:
      top = rect.bottom + POPOVER_OFFSET
      left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2
      break
  }

  left = Math.max(POPOVER_MARGIN, Math.min(left, vw - POPOVER_WIDTH - POPOVER_MARGIN))
  top  = Math.max(POPOVER_MARGIN, Math.min(top,  vh - POPOVER_HEIGHT_EST - POPOVER_MARGIN))

  return { top, left }
}

export default function TourOverlay({ stepIndex, rect, onNext, onPrev, onSkip }) {
  const { t } = useTranslation()
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
          <h3 className="text-white font-semibold text-sm">{step && t(`tour.steps.${step.id}.title`)}</h3>
          <span className="text-ink-400 text-xs ml-3 flex-shrink-0">
            {stepIndex + 1} / {TOUR_STEPS.length}
          </span>
        </div>
        <p className="text-ink-300 text-sm leading-relaxed mb-4">{step && t(`tour.steps.${step.id}.description`)}</p>
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-ink-400 hover:text-white text-sm transition-colors"
          >
            {t('tour.skip')}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={isFirst}
              className="text-ink-400 hover:text-white text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t('tour.prev')}
            </button>
            <button
              onClick={isLast ? onSkip : onNext}
              className="bg-flow-400 hover:bg-flow-600 text-ink-950 font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              {isLast ? t('tour.finish') : t('tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
