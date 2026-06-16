import { Check } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { THEME_TEMPLATES } from '../../data/themeTemplates.js'

export default function AppearancePanel() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { template, accentColor } = useTheme()
  const theme = state.tenantConfiguration.theme

  function selectTemplate(templateId) {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, templateId } } })
  }

  function setAccentColor(value) {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, accentColor: value } } })
  }

  function resetAccentColor() {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, accentColor: null } } })
  }

  return (
    <div className="p-3 space-y-4 overflow-y-auto h-full">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">Template</h3>
        <div className="space-y-2">
          {THEME_TEMPLATES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTemplate(t.id)}
              className={`w-full text-left rounded-lg border p-2 transition-colors
                ${t.id === template.id ? 'border-blue-electric ring-1 ring-blue-electric/30' : 'border-slate-mid hover:border-slate-light'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white">{t.name}</span>
                {t.id === template.id && <Check size={14} className="text-blue-electric" />}
              </div>
              <div className="flex gap-1">
                <span className="block w-5 h-5 rounded" style={{ background: t.swatch.nav }} />
                <span className="block w-5 h-5 rounded" style={{ background: t.swatch.hero }} />
                <span className="block w-5 h-5 rounded" style={{ background: t.accentColor }} />
                <span className="block w-5 h-5 rounded border border-slate-mid" style={{ background: t.swatch.card }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">Colore brand</h3>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={accentColor}
            onChange={e => setAccentColor(e.target.value)}
            className="w-8 h-8 rounded border border-slate-mid bg-transparent cursor-pointer"
          />
          <span className="text-xs text-slate-light flex-1">{accentColor}</span>
          {theme?.accentColor && (
            <button type="button" onClick={resetAccentColor} className="text-xs text-blue-electric hover:underline">
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
