import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { computeTooltipPosition } from './tooltipPosition.js'

const SHOW_DELAY_MS = 400

/** Wraps any element with a hover/focus-triggered explanatory tooltip, rendered via a portal so it's never clipped by a scrollable ancestor. */
export default function Tooltip({ text, children }) {
  const [coords, setCoords] = useState(null)
  const wrapperRef = useRef(null)
  const timeoutRef = useRef(null)

  function show() {
    timeoutRef.current = setTimeout(() => {
      const rect = wrapperRef.current.getBoundingClientRect()
      setCoords(computeTooltipPosition(rect))
    }, SHOW_DELAY_MS)
  }

  function hide() {
    clearTimeout(timeoutRef.current)
    setCoords(null)
  }

  return (
    <span ref={wrapperRef} className="contents" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {coords && createPortal(
        <div
          role="tooltip"
          style={{ position: 'fixed', top: coords.top, left: coords.left, transform: 'translateY(-50%)' }}
          className="z-50 max-w-[220px] rounded-md bg-navy text-white text-xs px-2.5 py-1.5 shadow-lg pointer-events-none"
        >
          {text}
        </div>,
        document.body
      )}
    </span>
  )
}
