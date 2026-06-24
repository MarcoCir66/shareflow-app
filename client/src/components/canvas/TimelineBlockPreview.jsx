import * as icons from 'lucide-react'
import Header from './BlockPreviewHeader.jsx'
import { useTheme } from '../../hooks/useTheme.js'

export default function TimelineBlockPreview({ block, contentItems = [] }) {
  const { template } = useTheme()
  const Icon = icons[block.icon] ?? icons.Box
  const milestones = contentItems.length > 0 ? contentItems.slice(0, 3) : [{}, {}, {}]

  return (
    <div>
      <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
      <div className="space-y-3">
        {milestones.map((item, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${template.card.iconBg}`} />
              {i < milestones.length - 1 && <span className={`w-px flex-1 mt-1 ${template.card.skeletonLight}`} />}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              {item.date ? (
                <p className={`text-[10px] font-semibold uppercase ${template.card.accentText}`}>{item.date}</p>
              ) : (
                <div className={`h-2 w-10 rounded mb-1 ${template.card.skeletonLight}`} />
              )}
              {item.title ? (
                <p className={`text-xs font-semibold ${template.card.text}`}>{item.title}</p>
              ) : (
                <div className={`h-2.5 w-3/4 rounded mb-1 ${template.card.skeletonLight}`} />
              )}
              {item.description ? (
                <p className={`text-[10px] ${template.card.textMuted} line-clamp-2`}>{item.description}</p>
              ) : (
                <div className={`h-2 w-1/2 rounded ${template.card.skeletonLight}`} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
