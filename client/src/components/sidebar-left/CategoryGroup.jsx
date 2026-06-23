import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import BlockCard from './BlockCard.jsx'
import Tooltip from '../common/Tooltip.jsx'

export default function CategoryGroup({ category, blocks }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  return (
    <div className="mb-1">
      <Tooltip text={t(`tooltips.blockCategories.${category}`)}>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-mid transition-colors"
        >
          <span className="text-xs font-semibold text-slate-light uppercase tracking-wider">
            {t(`blocks.categories.${category}`)}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-mid text-slate-light px-1.5 py-0.5 rounded-full">
              {blocks.length}
            </span>
            {open
              ? <ChevronDown size={14} className="text-slate-light" />
              : <ChevronRight size={14} className="text-slate-light" />
            }
          </div>
        </button>
      </Tooltip>
      {open && (
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          {blocks.map(block => (
            <Tooltip key={block.id} text={t(`tooltips.blocks.${block.id}`)}>
              <BlockCard block={block} />
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  )
}
