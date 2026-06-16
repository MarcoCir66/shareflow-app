import * as icons from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.js'

const EVENT_IDS = new Set([
  'eventi-corporate', 'eventi-country', 'eventi-sede', 'eventi-funzione',
])

const MEDIA_IDS = new Set([
  'sezione-fiere', 'sezione-mostre', 'multimedia-gallery',
])

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

const GRID_COLS_BY_WIDTH = { full: 'grid-cols-3', twoThirds: 'grid-cols-2', half: 'grid-cols-2', third: 'grid-cols-1' }
const ITEM_COUNT_BY_WIDTH = { full: 3, twoThirds: 2, half: 2, third: 1 }

function SkeletonLine({ template, w = 'w-full', h = 'h-2', light = false }) {
  return <div className={`${w} ${h} rounded ${light ? template.card.skeletonLight : template.card.skeleton}`} />
}

function Header({ template, block, Icon, showSeeAll = true }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={16} className={`${template.card.accentText} flex-shrink-0`} />
        <span className={`text-sm font-semibold truncate ${template.card.text}`}>{block.label}</span>
      </div>
      {showSeeAll && (
        <span className={`text-xs font-medium flex-shrink-0 ${template.card.accentText}`}>See all</span>
      )}
    </div>
  )
}

export default function CanvasBlockPreview({ block, width = 'full' }) {
  const { template } = useTheme()
  const Icon = icons[block.icon] ?? icons.Box
  const gridColsClass = GRID_COLS_BY_WIDTH[width] ?? GRID_COLS_BY_WIDTH.full
  const itemCount = ITEM_COUNT_BY_WIDTH[width] ?? ITEM_COUNT_BY_WIDTH.full

  if (block.id.startsWith('news')) {
    return (
      <div>
        <Header template={template} block={block} Icon={Icon} />
        <div className={`grid ${gridColsClass} gap-3`}>
          {Array.from({ length: itemCount }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className={`aspect-[16/10] rounded-md ${template.card.skeletonLight}`} />
              <SkeletonLine template={template} h="h-2.5" />
              <SkeletonLine template={template} w="w-2/3" light />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (EVENT_IDS.has(block.id)) {
    const today = new Date()
    return (
      <div>
        <Header template={template} block={block} Icon={Icon} />
        <div className="space-y-3">
          {[3, 9].map((offset, i) => {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`flex flex-col items-center justify-center w-11 h-11 rounded-md flex-shrink-0 ${template.card.chip}`}>
                  <span className={`text-[10px] font-semibold uppercase leading-none ${template.card.accentText}`}>
                    {MONTHS[d.getMonth()]}
                  </span>
                  <span className={`text-sm font-bold leading-none mt-0.5 ${template.card.text}`}>{d.getDate()}</span>
                </div>
                <div className="flex-1 space-y-1.5">
                  <SkeletonLine template={template} w="w-3/4" h="h-2.5" />
                  <SkeletonLine template={template} w="w-1/2" light />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (MEDIA_IDS.has(block.id)) {
    return (
      <div>
        <Header template={template} block={block} Icon={Icon} />
        <div className={`grid ${gridColsClass} gap-2`}>
          {Array.from({ length: itemCount }).map((_, i) => (
            <div key={i} className={`aspect-square rounded-md ${template.card.skeletonLight}`} />
          ))}
        </div>
      </div>
    )
  }

  if (block.id === 'countdown-lancio') {
    return (
      <div>
        <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
        <div className="flex justify-center gap-2">
          {['12', '08', '45', '30'].map((n, i) => (
            <div key={i} className={`flex items-center justify-center w-12 h-12 rounded-md ${template.card.iconBg}`}>
              <span className="text-base font-bold text-white">{n}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <icons.ChevronRight size={12} className={`${template.card.textMuted} flex-shrink-0`} />
          <SkeletonLine template={template} w="w-5/6" />
        </div>
        <div className="flex items-center gap-2">
          <icons.ChevronRight size={12} className={`${template.card.textMuted} flex-shrink-0`} />
          <SkeletonLine template={template} w="w-2/3" />
        </div>
      </div>
    </div>
  )
}
