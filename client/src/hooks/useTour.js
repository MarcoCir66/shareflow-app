import { useState, useEffect, useCallback } from 'react'
import { TOUR_STEPS } from '../data/tourSteps.js'

export function useTour() {
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState(null)

  const readRect = useCallback((index) => {
    const step = TOUR_STEPS[index]
    if (!step) return
    const el = document.querySelector(step.targetSelector)
    if (el) setRect(el.getBoundingClientRect())
  }, [])

  useEffect(() => {
    if (!active) return
    readRect(stepIndex)

    const step = TOUR_STEPS[stepIndex]
    if (!step) return
    const el = document.querySelector(step.targetSelector)
    if (!el) return

    const observer = new ResizeObserver(() => readRect(stepIndex))
    observer.observe(el)
    const onResize = () => readRect(stepIndex)
    window.addEventListener('resize', onResize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [active, stepIndex, readRect])

  const skip = useCallback(() => {
    setActive(false)
    setStepIndex(0)
  }, [])

  const start = useCallback(() => {
    setStepIndex(0)
    setActive(true)
  }, [])

  const next = useCallback(() => {
    if (stepIndex >= TOUR_STEPS.length - 1) { skip(); return }
    setStepIndex(stepIndex + 1)
  }, [stepIndex, skip])

  const prev = useCallback(() => {
    setStepIndex(p => Math.max(0, p - 1))
  }, [])

  return { active, stepIndex, rect, start, next, prev, skip }
}
