import { useState } from 'react'
import { validateSpUrl } from '../../utils/spUrl.js'

export default function SpSetupModal({ onConfirm, onSkip }) {
  const [value, setValue] = useState(() => localStorage.getItem('sf_sp_url') ?? '')
  const [error, setError]  = useState(false)

  function handleConfirm() {
    const trimmed = value.trim()
    if (!validateSpUrl(trimmed)) {
      setError(true)
      return
    }
    localStorage.setItem('sf_sp_url', trimmed)
    onConfirm(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-ink-800 rounded-2xl border border-ink-700 w-full max-w-md shadow-2xl p-6 space-y-5">
        <div>
          <h2 className="text-white font-semibold text-lg">Configura SharePoint</h2>
          <p className="text-ink-400 text-sm mt-1">
            Connetti Shareflow al tuo tenant Microsoft 365 per abilitare la pubblicazione su SharePoint.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-ink-300 font-medium" htmlFor="sp-url-input">
            SharePoint URL
          </label>
          <input
            id="sp-url-input"
            type="url"
            value={value}
            onChange={e => { setValue(e.target.value); setError(false) }}
            placeholder="https://contoso.sharepoint.com"
            className="w-full bg-ink-950 border border-ink-600 rounded-lg px-3 py-2 text-sm text-white placeholder-ink-500 focus:outline-none focus:border-flow-400"
          />
          {error && (
            <p className="text-xs text-red-400">
              Inserisci un URL valido (es. https://contoso.sharepoint.com)
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-lg bg-flow-400 text-ink-950 font-semibold text-sm hover:bg-flow-600 transition-colors"
          >
            Attiva
          </button>
          <button
            onClick={onSkip}
            className="flex-1 py-2 rounded-lg bg-ink-700 text-white text-sm hover:bg-ink-600 transition-colors"
          >
            Salta per ora
          </button>
        </div>
      </div>
    </div>
  )
}
