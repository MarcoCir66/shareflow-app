import { useState, useEffect } from 'react'

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('entering')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('pulsing'),  400)
    const t2 = setTimeout(() => setPhase('exiting'),  2800)
    const t3 = setTimeout(() => onDone(),             3400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center${phase === 'exiting' ? ' splash-exit' : ''}`}
      style={{
        background: 'radial-gradient(ellipse at center, color-mix(in srgb, #34BFAE 20%, transparent) 0%, #0d0d1f 70%)',
      }}
    >
      <div className="relative flex items-center justify-center">
        {phase !== 'entering' && (
          <div
            className="splash-ring absolute rounded-full border-2 border-flow-400"
            style={{ width: 80, height: 80 }}
          />
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="80"
          height="76"
          viewBox="0 0 48 46"
          fill="none"
          className={phase === 'entering' ? 'splash-logo-entering' : 'splash-logo-entered'}
        >
          <path
            fill="#34BFAE"
            d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"
          />
        </svg>
      </div>

      <p
        className={`mt-4 text-flow-400 font-semibold text-xl tracking-wide splash-wordmark${phase !== 'entering' ? ' splash-wordmark-visible' : ''}`}
      >
        Shareflow
      </p>
    </div>
  )
}
