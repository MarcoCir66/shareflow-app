import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import CanvasSection from './CanvasSection.jsx'
import SectionLayoutPicker from './SectionLayoutPicker.jsx'

export default function CanvasDropZone() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const [addPickerOpen, setAddPickerOpen] = useState(false)

  return (
    <div className="min-h-full p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <h2 className="text-navy font-semibold text-sm uppercase tracking-widest">Canvas Preview</h2>
          <p className="text-slate text-xs mt-0.5">SharePoint Communication Site — Home Page</p>
        </div>

        <div className="min-h-96 rounded-2xl border-2 border-dashed border-slate-mid bg-white p-4">
          {state.sections.map(section => (
            <CanvasSection key={section.sectionId} section={section} />
          ))}

          <div className="relative flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setAddPickerOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-light hover:text-blue border border-dashed border-slate-mid hover:border-blue rounded-lg px-3 py-1.5 transition-colors"
            >
              <Plus size={14} /> Aggiungi sezione
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
