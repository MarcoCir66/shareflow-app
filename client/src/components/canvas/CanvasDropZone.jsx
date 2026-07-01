import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { findPage } from '../../context/pageHelpers.js'
import CanvasSection from './CanvasSection.jsx'
import SectionLayoutPicker from './SectionLayoutPicker.jsx'
import CanvasTopNav from './CanvasTopNav.jsx'
import { useTheme } from '../../hooks/useTheme.js'
import HeroBanner from './HeroBanner.jsx'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'

export default function CanvasDropZone() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { accentColor, template, pageColor, isPageDark } = useTheme()
  const { t } = useTranslation()
  const lang = useLang()
  const [addPickerOpen, setAddPickerOpen] = useState(false)
  const activePage = findPage(state.pages, state.activePageId)
  if (!activePage) return null

  const labelText = isPageDark ? 'text-white/50' : 'text-ink-950'
  const labelSubText = isPageDark ? 'text-white/30' : 'text-ink-800'

  return (
    <div className="min-h-full p-6" style={{ backgroundColor: pageColor }} data-tour="canvas">
      <div className="max-w-2xl mx-auto" style={{ '--theme-accent': accentColor }}>
        <CanvasTopNav />
        <HeroBanner />

        <div className="mb-4">
          <h2 className={`${labelText} font-semibold text-sm uppercase tracking-widest`}>{t('canvas.preview')}</h2>
          <p className={`${labelSubText} text-xs mt-0.5`}>SharePoint Communication Site — {t2(activePage.title, lang)}</p>
        </div>

        <div className="min-h-96 rounded-2xl border-2 border-dashed border-ink-700/50 p-4">
          {activePage.sections.map(section => (
            <CanvasSection key={section.sectionId} section={section} />
          ))}

          <div className="relative flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setAddPickerOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs font-medium text-ink-400 hover:text-flow-600 border border-dashed border-ink-700 hover:border-flow-600 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Plus size={14} /> {t('canvas.addSection')}
            </button>
            {addPickerOpen && (
              <div className="absolute top-full mt-2 z-20">
                <SectionLayoutPicker
                  onSelect={key => {
                    dispatch({ type: ACTIONS.ADD_SECTION, payload: { layout: key } })
                    setAddPickerOpen(false)
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
