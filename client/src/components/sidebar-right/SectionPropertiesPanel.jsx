import { LayoutGrid, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { SECTION_LAYOUTS } from '../../data/sectionLayouts.js'
import { findPage } from '../../context/pageHelpers.js'
import SectionLayoutPicker from '../canvas/SectionLayoutPicker.jsx'

export default function SectionPropertiesPanel({ sectionId }) {
  const { t } = useTranslation()
  const { state, dispatch, ACTIONS } = useConfigurator()
  const activePage = findPage(state.pages, state.activePageId)
  const sectionIndex = activePage.sections.findIndex(s => s.sectionId === sectionId)
  const section = activePage.sections[sectionIndex]
  if (!section) return null

  const isEmpty = section.columns.every(c => c.widgets.length === 0)

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-1 pb-4 border-b border-ink-700">
        <div className="w-9 h-9 rounded-lg bg-flow-600/20 flex items-center justify-center flex-shrink-0">
          <LayoutGrid size={18} className="text-flow-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white leading-tight">{t('props.sectionHeading', { n: sectionIndex + 1 })}</h3>
          <span className="text-xs text-ink-400">{SECTION_LAYOUTS[section.layout].label}</span>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-xs text-ink-400 mb-2 uppercase tracking-wider font-medium">{t('props.columnLayout')}</label>
        <SectionLayoutPicker
          value={section.layout}
          onSelect={key => dispatch({ type: ACTIONS.CHANGE_SECTION_LAYOUT, payload: { sectionId, layout: key } })}
        />
      </div>

      {isEmpty && (
        <div className="mt-6 pt-4 border-t border-ink-700">
          <button
            onClick={() => dispatch({ type: ACTIONS.REMOVE_SECTION, payload: { sectionId } })}
            className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 size={14} /> {t('canvas.deleteSection')}
          </button>
        </div>
      )}
    </div>
  )
}
