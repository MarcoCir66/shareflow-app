import * as icons from 'lucide-react'

const EVENT_IDS = new Set([
  'eventi-corporate', 'eventi-country', 'eventi-sede', 'eventi-funzione',
])

const MEDIA_IDS = new Set([
  'sezione-fiere', 'sezione-mostre', 'multimedia-gallery',
])

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

function SkeletonLine({ w = 'w-full', h = 'h-2', light = false }) {
  return <div className={`${w} ${h} rounded ${light ? 'bg-gray-100' : 'bg-gray-200'}`} />
}

function Header({ block, Icon, showSeeAll = true }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={16} className="text-blue flex-shrink-0" />
        <span className="text-sm font-semibold text-navy truncate">{block.label}</span>
      </div>
      {showSeeAll && (
        <span className="text-xs font-medium text-blue flex-shrink-0">See all</span>
      )}
    </div>
  )
}

export default function CanvasBlockPreview({ block }) {
  const Icon = icons[block.icon] ?? icons.Box

  if (block.id.startsWith('news')) {
    return (
      <div>
        <Header block={block} Icon={Icon} />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-2">
              <div className="aspect-[16/10] rounded-md bg-gray-100" />
              <SkeletonLine h="h-2.5" />
              <SkeletonLine w="w-2/3" light />
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
        <Header block={block} Icon={Icon} />
        <div className="space-y-3">
          {[3, 9].map((offset, i) => {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="flex flex-col items-center justify-center w-11 h-11 rounded-md bg-blue/10 border border-blue/20 flex-shrink-0">
                  <span className="text-[10px] font-semibold text-blue uppercase leading-none">
                    {MONTHS[d.getMonth()]}
                  </span>
                  <span className="text-sm font-bold text-navy leading-none mt-0.5">{d.getDate()}</span>
                </div>
                <div className="flex-1 space-y-1.5">
                  <SkeletonLine w="w-3/4" h="h-2.5" />
                  <SkeletonLine w="w-1/2" light />
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
        <Header block={block} Icon={Icon} />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => <div key={i} className="aspect-square rounded-md bg-gray-100" />)}
        </div>
      </div>
    )
  }

  if (block.id === 'countdown-lancio') {
    return (
      <div>
        <Header block={block} Icon={Icon} showSeeAll={false} />
        <div className="flex justify-center gap-2">
          {['12', '08', '45', '30'].map((n, i) => (
            <div key={i} className="flex items-center justify-center w-12 h-12 rounded-md bg-navy">
              <span className="text-base font-bold text-white">{n}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header block={block} Icon={Icon} showSeeAll={false} />
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <icons.ChevronRight size={12} className="text-gray-400 flex-shrink-0" />
          <SkeletonLine w="w-5/6" />
        </div>
        <div className="flex items-center gap-2">
          <icons.ChevronRight size={12} className="text-gray-400 flex-shrink-0" />
          <SkeletonLine w="w-2/3" />
        </div>
      </div>
    </div>
  )
}
