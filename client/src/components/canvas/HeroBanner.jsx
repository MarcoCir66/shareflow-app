import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { findPage } from '../../context/pageHelpers.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'

export default function HeroBanner() {
  const { state } = useConfigurator()
  const { template } = useTheme()
  const lang = useLang()
  const activePage = findPage(state.pages, state.activePageId)

  return (
    <div className={`mb-4 rounded-2xl px-5 py-6 ${template.hero.wrapper}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-widest ${template.hero.eyebrow}`}>
        {t2(state.tenantConfiguration.siteName, lang)}
      </div>
      <div className={`text-xl font-bold mt-1 ${template.hero.title}`}>
        {t2(activePage.title, lang)}
      </div>
    </div>
  )
}
