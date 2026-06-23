import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { findPage } from '../../context/pageHelpers.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'

export default function HeroBanner() {
  const { state } = useConfigurator()
  const { template, backgroundImageUrl, textScheme, showFallbackScrim } = useTheme()
  const lang = useLang()
  const activePage = findPage(state.pages, state.activePageId)
  if (!activePage) return null

  const heroStyle = backgroundImageUrl
    ? {
        backgroundImage: showFallbackScrim
          ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${backgroundImageUrl})`
          : `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined

  return (
    <div className={`mb-4 rounded-2xl px-5 py-6 ${template.hero.wrapper}`} style={heroStyle}>
      <div
        className={`text-[10px] font-semibold uppercase tracking-widest ${template.hero.eyebrow}`}
        style={textScheme ? { color: textScheme.muted } : undefined}
      >
        {t2(state.tenantConfiguration.siteName, lang)}
      </div>
      <div
        className={`text-xl font-bold mt-1 ${template.hero.title}`}
        style={textScheme ? { color: textScheme.strong } : undefined}
      >
        {t2(activePage.title, lang)}
      </div>
    </div>
  )
}
