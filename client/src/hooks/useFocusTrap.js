import { useEffect } from 'react'

/**
 * Traps Tab/Shift+Tab focus inside containerRef while active, calls
 * onEscape on the Escape key, and restores focus to whatever had it
 * before activation when the effect's cleanup runs.
 *
 * Assumes only one trap is ever active at a time — nesting two (e.g. a
 * menu opened from inside a trapped dialog) would have the inner trap's
 * cleanup restore focus to the outer trap's trigger, not the dialog.
 */
export function useFocusTrap(containerRef, { active, onEscape }) {
  useEffect(() => {
    if (!active) return
    const previouslyFocused = document.activeElement
    const container = containerRef.current
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    const focusable = () => container.querySelectorAll(focusableSelector)
    focusable()[0]?.focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') { onEscape?.(); return }
      if (e.key !== 'Tab') return
      const items = Array.from(focusable())
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [active])
}
