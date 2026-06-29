import { useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { THEME_TEMPLATES } from '../../data/themeTemplates.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'
import Tooltip from '../common/Tooltip.jsx'

export default function AppearancePanel() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { template, accentColor, pageColor } = useTheme()
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

  function setPageColor(value) {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, pageColor: value } } })
  }

  function resetPageColor() {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, pageColor: null } } })
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

  const logoBase64 = theme?.logoBase64 ?? null
  const logoInputRef = useRef(null)
  const themeRef = useRef(theme)
  themeRef.current = theme
  const [logoError, setLogoError] = useState('')

  function handleLogoFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 200_000) {
      setLogoError('File troppo grande (max 200 KB)')
      e.target.value = ''
      return
    }
    setLogoError('')
    const reader = new FileReader()
    reader.onload = ev => {
      dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...themeRef.current, logoBase64: ev.target.result } } })
    }
    reader.readAsDataURL(file)
  }

  function removeLogo() {
    dispatch({ type: ACTIONS.SET_TENANT_META, payload: { theme: { ...theme, logoBase64: null } } })
    setLogoError('')
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  return (
    <div className="p-3 space-y-4 overflow-y-auto h-full">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
          {t('appearance.logoLabel')}
        </h3>
        <div className="flex items-center gap-2">
          {logoBase64 && (
            <img
              src={logoBase64}
              alt="logo"
              className="w-10 h-10 object-contain rounded border border-ink-700 bg-ink-800 flex-shrink-0"
            />
          )}
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="text-xs px-2 py-1.5 rounded bg-ink-700 text-white hover:bg-ink-600 transition-colors"
          >
            {logoBase64 ? t('appearance.logoChange') : t('appearance.logoUpload')}
          </button>
          {logoBase64 && (
            <button type="button" onClick={removeLogo} className="text-ink-400 hover:text-white transition-colors">
              <X size={14} />
            </button>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={handleLogoFile}
          />
        </div>
        {logoError && <p className="text-xs text-red-400 mt-1">{logoError}</p>}
        <p className="text-xs text-ink-400 mt-1">PNG · JPG · SVG · max 200 KB</p>
      </div>

      <div>
        <Tooltip text={t('tooltips.appearanceSections.siteName')}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
            {t('appearance.siteNameLabel', { lang: lang.toUpperCase() })}
          </h3>
        </Tooltip>
        <input
          type="text"
          value={t2(state.tenantConfiguration.siteName, lang)}
          onChange={e => handleSiteNameChange(e.target.value)}
          className="w-full bg-ink-700 text-white text-xs px-2.5 py-1.5 rounded border border-ink-700 focus:border-flow-400 focus:outline-none"
        />
      </div>

      <div>
        <Tooltip text={t('tooltips.appearanceSections.template')}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
            {t('appearance.template')}
          </h3>
        </Tooltip>
        <div className="space-y-2">
          {THEME_TEMPLATES.map(tmpl => (
            <Tooltip key={tmpl.id} text={t(`tooltips.themeTemplates.${tmpl.id}`)}>
              <button
                type="button"
                onClick={() => selectTemplate(tmpl.id)}
                className={`w-full text-left rounded-lg border p-2 transition-colors
                  ${tmpl.id === template.id ? 'border-flow-400 ring-1 ring-flow-400/30' : 'border-ink-700 hover:border-ink-400'}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white">{tmpl.name}</span>
                  {tmpl.id === template.id && <Check size={14} className="text-flow-400" />}
                </div>
                <div className="flex gap-1">
                  <span className="block w-5 h-5 rounded" style={{ background: tmpl.swatch.nav }} />
                  <span className="block w-5 h-5 rounded" style={{ background: tmpl.swatch.hero }} />
                  <span className="block w-5 h-5 rounded" style={{ background: tmpl.accentColor }} />
                  <span className="block w-5 h-5 rounded border border-ink-700" style={{ background: tmpl.swatch.card }} />
                </div>
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      <div>
        <Tooltip text={t('tooltips.appearanceSections.backgroundImage')}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
            {t('appearance.backgroundImageLabel')}
          </h3>
        </Tooltip>
        <input
          type="text"
          value={theme?.backgroundImageUrl || ''}
          onChange={e => handleBackgroundImageUrlChange(e.target.value)}
          placeholder={t('appearance.backgroundImageHint')}
          className="w-full bg-ink-700 text-white text-xs px-2.5 py-1.5 rounded border border-ink-700 focus:border-flow-400 focus:outline-none"
        />
        {theme?.backgroundImageUrl && (
          <button type="button" onClick={removeBackgroundImage} className="mt-1 text-xs text-flow-400 hover:underline">
            {t('appearance.backgroundImageRemove')}
          </button>
        )}
      </div>

      <div>
        <Tooltip text={t('tooltips.appearanceSections.brandColor')}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
            {t('appearance.brandColor')}
          </h3>
        </Tooltip>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={accentColor}
            onChange={e => setAccentColor(e.target.value)}
            className="w-8 h-8 rounded border border-ink-700 bg-transparent cursor-pointer"
          />
          <span className="text-xs text-ink-400 flex-1">{accentColor}</span>
          {theme?.accentColor && (
            <button type="button" onClick={resetAccentColor} className="text-xs text-flow-400 hover:underline">
              {t('appearance.reset')}
            </button>
          )}
        </div>
      </div>

      <div>
        <Tooltip text={t('tooltips.appearanceSections.pageColor')}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">
            {t('appearance.pageColor')}
          </h3>
        </Tooltip>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={pageColor}
            onChange={e => setPageColor(e.target.value)}
            className="w-8 h-8 rounded border border-ink-700 bg-transparent cursor-pointer"
          />
          <span className="text-xs text-ink-400 flex-1">{pageColor}</span>
          {theme?.pageColor && (
            <button type="button" onClick={resetPageColor} className="text-xs text-flow-400 hover:underline">
              {t('appearance.reset')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
