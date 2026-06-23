import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { THEME_TEMPLATES } from '../../data/themeTemplates.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'

export default function AppearancePanel() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { template, accentColor } = useTheme()
  const { t } = useTranslation()
  const lang = useLang()
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

  function handleBackgroundImageUrlChange(value) {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, backgroundImageUrl: value } } })
  }

  function removeBackgroundImage() {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, backgroundImageUrl: '' } } })
  }

  function handleSiteNameChange(value) {
    const current = state.tenantConfiguration.siteName
    const updated = typeof current === 'string'
      ? { it: current, en: current, fr: current, de: current, [lang]: value }
      : { ...current, [lang]: value }
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { siteName: updated } })
  }

  return (
    <div className="p-3 space-y-4 overflow-y-auto h-full">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">
          {t('appearance.siteNameLabel', { lang: lang.toUpperCase() })}
        </h3>
        <input
          type="text"
          value={t2(state.tenantConfiguration.siteName, lang)}
          onChange={e => handleSiteNameChange(e.target.value)}
          className="w-full bg-slate-mid text-white text-xs px-2.5 py-1.5 rounded border border-slate-mid focus:border-blue-electric focus:outline-none"
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">
          {t('appearance.template')}
        </h3>
        <div className="space-y-2">
          {THEME_TEMPLATES.map(tmpl => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => selectTemplate(tmpl.id)}
              className={`w-full text-left rounded-lg border p-2 transition-colors
                ${tmpl.id === template.id ? 'border-blue-electric ring-1 ring-blue-electric/30' : 'border-slate-mid hover:border-slate-light'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white">{tmpl.name}</span>
                {tmpl.id === template.id && <Check size={14} className="text-blue-electric" />}
              </div>
              <div className="flex gap-1">
                <span className="block w-5 h-5 rounded" style={{ background: tmpl.swatch.nav }} />
                <span className="block w-5 h-5 rounded" style={{ background: tmpl.swatch.hero }} />
                <span className="block w-5 h-5 rounded" style={{ background: tmpl.accentColor }} />
                <span className="block w-5 h-5 rounded border border-slate-mid" style={{ background: tmpl.swatch.card }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">
          {t('appearance.backgroundImageLabel')}
        </h3>
        <input
          type="text"
          value={theme?.backgroundImageUrl || ''}
          onChange={e => handleBackgroundImageUrlChange(e.target.value)}
          placeholder={t('appearance.backgroundImageHint')}
          className="w-full bg-slate-mid text-white text-xs px-2.5 py-1.5 rounded border border-slate-mid focus:border-blue-electric focus:outline-none"
        />
        {theme?.backgroundImageUrl && (
          <button type="button" onClick={removeBackgroundImage} className="mt-1 text-xs text-blue-electric hover:underline">
            {t('appearance.backgroundImageRemove')}
          </button>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-light mb-2">
          {t('appearance.brandColor')}
        </h3>
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
              {t('appearance.reset')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
