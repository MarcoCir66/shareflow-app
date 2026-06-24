import { useState } from 'react'
import * as icons from 'lucide-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Header from './BlockPreviewHeader.jsx'
import { useTheme } from '../../hooks/useTheme.js'
import { wrapIndex } from './carouselIndex.js'

export default function CarouselBlockPreview({ block, contentItems = [] }) {
  const { template } = useTheme()
  const { t } = useTranslation()
  const Icon = icons[block.icon] ?? icons.Box
  const [slideIndex, setSlideIndex] = useState(0)
  const hasContent = contentItems.length > 0
  const slideCount = hasContent ? contentItems.length : 3
  const current = hasContent ? contentItems[slideIndex] : null

  function goTo(delta, e) {
    e.stopPropagation()
    setSlideIndex(i => wrapIndex(i, delta, slideCount))
  }

  return (
    <div>
      <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
      <div className="space-y-2">
        {current ? (
          <div className="space-y-1.5">
            {current.imageUrl ? (
              <img
                src={current.imageUrl}
                alt={current.title || ''}
                className="aspect-[16/9] rounded-md object-cover w-full"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div className={`aspect-[16/9] rounded-md ${template.card.skeletonLight}`} />
            )}
            <p className={`text-xs font-semibold leading-snug ${template.card.text} line-clamp-2`}>{current.title}</p>
            {current.description && (
              <p className={`text-[10px] ${template.card.textMuted} line-clamp-2`}>{current.description}</p>
            )}
          </div>
        ) : (
          <div className={`aspect-[16/9] rounded-md ${template.card.skeletonLight}`} />
        )}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={e => goTo(-1, e)}
            aria-label={t('canvas.carouselPrev')}
            className={`${template.card.accentText} hover:opacity-70`}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: slideCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={e => { e.stopPropagation(); setSlideIndex(i) }}
                aria-label={t('canvas.carouselGoToSlide', { n: i + 1 })}
                className={`w-1.5 h-1.5 rounded-full ${i === slideIndex ? template.card.iconBg : template.card.skeletonLight}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={e => goTo(1, e)}
            aria-label={t('canvas.carouselNext')}
            className={`${template.card.accentText} hover:opacity-70`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
