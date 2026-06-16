import { useState } from 'react'
import { LayoutGrid, Trash2 } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { SECTION_LAYOUTS } from '../../data/sectionLayouts.js'
import CanvasColumn from './CanvasColumn.jsx'
import SectionLayoutPicker from './SectionLayoutPicker.jsx'

export default function CanvasSection({ section, readOnly = false }) {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const [pickerOpen, setPickerOpen] = useState(false)

  const layout = SECTION_LAYOUTS[section.layout]

  if (readOnly) {
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
        ${isSelected ? 'border-blue bg-blue/5' : 'border-transparent hover:border-slate-mid'}
      `}
    >
      <div className="absolute -top-3 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={e => { e.stopPropagation(); setPickerOpen(o => !o) }}
          className="p-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-slate hover:text-blue hover:border-blue transition-colors"
          title="Cambia layout sezione"
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
            className="p-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-slate hover:text-red-500 hover:border-red-300 transition-colors"
            title="Elimina sezione"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {pickerOpen && (
        <div className="absolute -top-14 right-2 z-20" onClick={e => e.stopPropagation()}>
          <SectionLayoutPicker
            value={section.layout}
            onSelect={key => {
              dispatch({ type: ACTIONS.CHANGE_SECTION_LAYOUT, payload: { sectionId: section.sectionId, layout: key } })
              setPickerOpen(false)
            }}
          />
        </div>
      )}

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
    </div>
  )
}
