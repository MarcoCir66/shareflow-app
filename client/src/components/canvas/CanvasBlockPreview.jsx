import * as icons from 'lucide-react'
import { CATEGORIES } from '../../data/blockCatalog.js'

function SkeletonLine({ w = 'w-full', h = 'h-2' }) {
  return <div className={`${w} ${h} bg-slate-mid rounded animate-pulse`} />
}

export default function CanvasBlockPreview({ block }) {
  const Icon = icons[block.icon] ?? icons.Box
  const cat = block.category

  if (cat === CATEGORIES.COMMUNICATION && block.id.startsWith('news')) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Icon size={16} className="text-blue-electric" />
          <span className="text-sm font-medium text-white">{block.label}</span>
        </div>
        <SkeletonLine w="w-3/4" h="h-3" />
        <SkeletonLine w="w-full" />
        <SkeletonLine w="w-5/6" />
        <SkeletonLine w="w-2/3" />
      </div>
    )
  }

  if (cat === CATEGORIES.EVENTS) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Icon size={16} className="text-blue-electric" />
          <span className="text-sm font-medium text-white">{block.label}</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-10 h-10 bg-blue rounded flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <SkeletonLine w="w-3/4" h="h-2.5" />
            <SkeletonLine w="w-1/2" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-blue-electric" />
        <span className="text-sm font-medium text-white">{block.label}</span>
      </div>
      <SkeletonLine w="w-2/3" />
      <SkeletonLine w="w-full" />
    </div>
  )
}
