/** ============================================================
 *  ShareFlow — Componenti base (v2.0)
 *  React + Tailwind, usa i token di tokens/tailwind.config.js
 *  Dipendenze: react, lucide-react (già nel progetto).
 *
 *  Dove metterlo: client/src/components/ui/ShareFlowUI.jsx
 *  Uso:  import { Button, Card, Input, Badge, Toggle, Avatar } from './components/ui/ShareFlowUI.jsx'
 *  ============================================================ */

import { useState } from 'react'

/* piccolo helper per unire classi condizionali */
function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

/* ----------------------------------------------------------------
 *  BUTTON
 *  variant: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
 *  size:    'sm' | 'md' | 'lg'
 * ---------------------------------------------------------------- */
const BTN_BASE =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-md ' +
  'transition-[background,box-shadow,border-color,color] duration-150 ease-sf ' +
  'focus:outline-none focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed'

const BTN_VARIANT = {
  primary:   'bg-flow-600 text-white hover:bg-flow-700 hover:shadow-md',
  secondary: 'bg-white text-flow-600 border border-ink-300 hover:border-flow-600 hover:text-flow-700',
  ghost:     'bg-transparent text-ink-700 hover:bg-ink-50',
  accent:    'bg-spark-500 text-white hover:bg-spark-600',
  danger:    'bg-danger/10 text-danger hover:bg-danger/20',
}

const BTN_SIZE = {
  sm: 'text-sm px-3.5 py-1.5 rounded-sm',
  md: 'text-[14px] px-5 py-2.5',
  lg: 'text-base px-6 py-3.5 rounded-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className,
  children,
  ...props
}) {
  return (
    <button className={cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)} {...props}>
      {Icon && <Icon size={size === 'lg' ? 18 : 16} />}
      {children}
    </button>
  )
}

/* ----------------------------------------------------------------
 *  CARD
 * ---------------------------------------------------------------- */
export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn('bg-white border border-ink-100 rounded-lg shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/* ----------------------------------------------------------------
 *  INPUT  (label + helper + stato di errore)
 * ---------------------------------------------------------------- */
export function Input({ label, helper, error, className, id, ...props }) {
  const inputId = id || props.name
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-ink-900 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full text-[14px] text-ink-900 bg-white rounded-md px-3.5 py-2.5 outline-none',
          'border-[1.5px] transition-shadow duration-150',
          error
            ? 'border-danger focus:shadow-[0_0_0_3px_rgba(219,79,68,0.16)]'
            : 'border-ink-200 focus:border-flow-600 focus:shadow-focus'
        )}
        aria-invalid={!!error}
        {...props}
      />
      {(error || helper) && (
        <div className={cn('text-xs mt-1.5', error ? 'text-danger' : 'text-ink-500')}>
          {error || helper}
        </div>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------
 *  BADGE / STATUS PILL
 *  tone: 'flow' | 'spark' | 'neutral' | 'success' | 'warning' | 'danger'
 *  dot:  mostra il pallino di stato
 * ---------------------------------------------------------------- */
const BADGE_TONE = {
  flow:    'bg-flow-50 text-flow-700',
  spark:   'bg-spark-50 text-spark-700',
  neutral: 'bg-ink-50 text-ink-600',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-[#9A6516]',
  danger:  'bg-danger/10 text-danger',
}
const DOT_TONE = {
  flow: 'bg-flow-600', spark: 'bg-spark-500', neutral: 'bg-ink-400',
  success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger',
}

export function Badge({ tone = 'flow', dot = false, children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full',
        BADGE_TONE[tone],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', DOT_TONE[tone])} />}
      {children}
    </span>
  )
}

/* ----------------------------------------------------------------
 *  TOGGLE
 * ---------------------------------------------------------------- */
export function Toggle({ checked: controlled, defaultChecked = false, onChange, label }) {
  const [internal, setInternal] = useState(defaultChecked)
  const checked = controlled ?? internal
  function toggle() {
    const next = !checked
    if (controlled === undefined) setInternal(next)
    onChange?.(next)
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={toggle}
      className="inline-flex items-center gap-2.5 group"
    >
      <span
        className={cn(
          'relative w-[42px] h-6 rounded-full transition-colors duration-150',
          checked ? 'bg-flow-600' : 'bg-ink-200'
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-[left] duration-150',
            checked ? 'left-[21px]' : 'left-[3px]'
          )}
        />
      </span>
      {label && <span className="text-sm text-ink-600">{label}</span>}
    </button>
  )
}

/* ----------------------------------------------------------------
 *  AVATAR  (iniziali, con colore derivato dal nome)
 *  size: px (default 40)
 * ---------------------------------------------------------------- */
const AVATAR_COLORS = ['bg-flow-600', 'bg-spark-500', 'bg-flow-500', 'bg-spark-600', 'bg-flow-700']

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
}

export function Avatar({ name = '', size = 40, online = false }) {
  const color = AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
  return (
    <span
      className={cn('relative inline-flex items-center justify-center rounded-full text-white font-bold', color)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-success border-2 border-white"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </span>
  )
}

/* ----------------------------------------------------------------
 *  Esempio d'uso (rimuovi pure):
 *
 *  <Card className="p-6 space-y-4">
 *    <h3 className="font-display text-h3 text-ink-900">Pubblica il sito</h3>
 *    <Input label="Nome del sito" name="site" helper="Appare nella scheda del browser." />
 *    <div className="flex items-center gap-3">
 *      <Badge tone="success" dot>Pubblicato</Badge>
 *      <Avatar name="Alessandra Longhi" online />
 *    </div>
 *    <Toggle defaultChecked label="Lettura obbligatoria" />
 *    <div className="flex gap-3">
 *      <Button variant="secondary">Anteprima</Button>
 *      <Button variant="primary">Pubblica</Button>
 *    </div>
 *  </Card>
 * ---------------------------------------------------------------- */
