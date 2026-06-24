import { Rows3 } from 'lucide-react'
import { SECTION_LAYOUTS } from '../../data/sectionLayouts.js'

export default function SectionLayoutPicker({ value, onSelect, asMenuItems = false }) {
  return (
    <div className="flex gap-1.5 bg-white rounded-lg border border-gray-200 shadow-lg p-1.5">
      {Object.entries(SECTION_LAYOUTS).map(([key, layout]) => (
        <button
          key={key}
          type="button"
          role={asMenuItems ? 'menuitem' : undefined}
          onClick={() => onSelect(key)}
          title={layout.label}
          className={`
            w-10 h-8 rounded border p-1 grid gap-0.5 ${layout.kind === 'grid' ? layout.gridCols : 'grid-rows-3'}
            ${value === key ? 'border-blue ring-1 ring-blue/30' : 'border-gray-200 hover:border-gray-300'}
          `}
        >
          {layout.kind === 'grid' ? (
            Array.from({ length: layout.columns }).map((_, i) => (
              <div key={i} className="bg-gray-300 rounded-sm" />
            ))
          ) : (
            <Rows3 size={16} className="text-gray-500 m-auto" />
          )}
        </button>
      ))}
    </div>
  )
}
