import { useConfigurator } from '../../hooks/useConfigurator.js'
import { useTheme } from '../../hooks/useTheme.js'
import { findPage } from '../../context/pageHelpers.js'

export default function HeroBanner() {
  const { state } = useConfigurator()
  const { template } = useTheme()
  const activePage = findPage(state.pages, state.activePageId)

  return (
    <div className={`mb-4 rounded-2xl px-5 py-6 ${template.hero.wrapper}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-widest ${template.hero.eyebrow}`}>
        {state.tenantConfiguration.siteName}
      </div>
      <div className={`text-xl font-bold mt-1 ${template.hero.title}`}>
        {activePage.title}
      </div>
    </div>
  )
}
