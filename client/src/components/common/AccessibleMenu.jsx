import { useEffect, useRef } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'

export default function AccessibleMenu({ isOpen, onClose, triggerRef, onClick, className, children }) {
  const menuRef = useRef(null)
  useFocusTrap(menuRef, { active: isOpen, onEscape: onClose })

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e) {
      if (menuRef.current?.contains(e.target)) return
      if (triggerRef?.current?.contains(e.target)) return
      onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, triggerRef])

  function handleArrowKey(e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = Array.from(menuRef.current.querySelectorAll('[role="menuitem"]'))
    if (items.length === 0) return
    const idx = items.indexOf(document.activeElement)
    const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length
    items[next]?.focus()
  }

  if (!isOpen) return null

  return (
    <div ref={menuRef} role="menu" onKeyDown={handleArrowKey} onClick={onClick} className={className}>
      {children}
    </div>
  )
}
