import { useState, useRef } from 'react'
import { LayoutGrid, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { SECTION_LAYOUTS } from '../../data/sectionLayouts.js'
import CanvasColumn from './CanvasColumn.jsx'
import SectionLayoutPicker from './SectionLayoutPicker.jsx'
import AccessibleMenu from '../common/AccessibleMenu.jsx'
import AccordionPanels from './AccordionPanels.jsx'

export default function CanvasSection({ section, readOnly = false }) {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const [pickerOpen, setPickerOpen] = useState(false)
  const layoutTriggerRef = useRef(null)
  const { t } = useTranslation()

  const layout = SECTION_LAYOUTS[section.layout]

  if (readOnly) {
    if (section.layout === 'accordion') {
      return <AccordionPanels section={section} readOnly />
    }
    return (
      <div className={`mb-4 grid ${layout.gridCols} gap-3`}>
        {section.columns.map((column, i) => (
          <CanvasColumn
            key={column.columnId}
            sectionId={section.sectionId}
            column={column}
            widthHint={layout.widths[i]}
            readOnly
          />
        ))}
      </div>
    )
  }

  const isSelected = state.selectedSectionId === section.sectionId
  const isEmpty = section.columns.every(c => c.widgets.length === 0)

  return (
    <div
      onClick={() => dispatch({ type: ACTIONS.SELECT_SECTION, payload: { sectionId: section.sectionId } })}
      className={`
        group relative mb-4 p-2 rounded-xl border-2 border-dashed transition-colors cursor-pointer
        ${isSelected ? 'border-flow-600 bg-flow-600/5' : 'border-transparent hover:border-ink-700'}
      `}
    >
      <div className="absolute -top-3 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          ref={layoutTriggerRef}
          type="button"
          onClick={e => { e.stopPropagation(); setPickerOpen(o => !o) }}
          className="p-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-ink-800 hover:text-flow-600 hover:border-flow-600 transition-colors"
          title={t('canvas.changeLayout')}
        >
          <LayoutGrid size={14} />
        </button>
        {isEmpty && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              dispatch({ type: ACTIONS.REMOVE_SECTION, payload: { sectionId: section.sectionId } })
            }}
            className="p-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-ink-800 hover:text-red-500 hover:border-red-300 transition-colors"
            title={t('canvas.deleteSection')}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <AccessibleMenu
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        triggerRef={layoutTriggerRef}
        onClick={e => e.stopPropagation()}
        className="absolute -top-14 right-2 z-20"
      >
        <SectionLayoutPicker
          value={section.layout}
          onSelect={key => {
            dispatch({ type: ACTIONS.CHANGE_SECTION_LAYOUT, payload: { sectionId: section.sectionId, layout: key } })
            setPickerOpen(false)
          }}
          asMenuItems
        />
      </AccessibleMenu>

      {section.layout === 'accordion' ? (
        <AccordionPanels section={section} />
      ) : (
        <div className={`grid ${layout.gridCols} gap-3`}>
          {section.columns.map((column, i) => (
            <CanvasColumn
              key={column.columnId}
              sectionId={section.sectionId}
              column={column}
              widthHint={layout.widths[i]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
