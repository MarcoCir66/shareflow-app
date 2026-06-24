import * as icons from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../hooks/useTheme.js'
import Header from './BlockPreviewHeader.jsx'
import CalendarBlockPreview from './CalendarBlockPreview.jsx'
import CarouselBlockPreview from './CarouselBlockPreview.jsx'
import TimelineBlockPreview from './TimelineBlockPreview.jsx'

const EVENT_IDS = new Set([
  'eventi-corporate', 'eventi-country', 'eventi-sede', 'eventi-funzione',
])

const MEDIA_IDS = new Set([
  'sezione-fiere', 'sezione-mostre', 'multimedia-gallery',
])

const PERSON_IDS = new Set(['organigramma', 'rubrica-colleghi', 'new-entry', 'oggi-presentiamo'])

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

const SEVERITY_DOT = { error: 'bg-red-500', warning: 'bg-yellow-400', info: 'bg-blue-electric' }

const GRID_COLS_BY_WIDTH   = { full: 'grid-cols-3', twoThirds: 'grid-cols-2', half: 'grid-cols-2', third: 'grid-cols-1' }
const ITEM_COUNT_BY_WIDTH  = { full: 3, twoThirds: 2, half: 2, third: 1 }

function SkeletonLine({ template, w = 'w-full', h = 'h-2', light = false }) {
  return <div className={`${w} ${h} rounded ${light ? template.card.skeletonLight : template.card.skeleton}`} />
}

export default function CanvasBlockPreview({ block, width = 'full', contentItems = [] }) {
  const { template } = useTheme()
  const { t } = useTranslation()
  const Icon = icons[block.icon] ?? icons.Box
  const gridColsClass = GRID_COLS_BY_WIDTH[width] ?? GRID_COLS_BY_WIDTH.full
  const itemCount = ITEM_COUNT_BY_WIDTH[width] ?? ITEM_COUNT_BY_WIDTH.full

  // ── news ─────────────────────────────────────────────────────────────────────
  if (block.id.startsWith('news') || block.id === 'rassegna-stampa') {
    if (contentItems.length > 0) {
      return (
        <div>
          <Header template={template} block={block} Icon={Icon} />
          <div className="space-y-2.5">
            {contentItems.slice(0, itemCount).map((item, i) => (
              <div key={i} className="space-y-1">
                <p className={`text-xs font-semibold leading-snug ${template.card.text} line-clamp-2`}>
                  {item.title}
                </p>
                <p className={`text-[10px] ${template.card.textMuted}`}>
                  {[item.date && new Date(item.date).toLocaleDateString('it-IT'), item.author || item.source, item.category]
                    .filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )
    }
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

  // ── eventi ────────────────────────────────────────────────────────────────────
  if (EVENT_IDS.has(block.id)) {
    const today = new Date()
    if (contentItems.length > 0) {
      return (
        <div>
          <Header template={template} block={block} Icon={Icon} />
          <div className="space-y-3">
            {contentItems.slice(0, 2).map((item, i) => {
              const d = item.date ? new Date(item.date) : null
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`flex flex-col items-center justify-center w-11 h-11 rounded-md flex-shrink-0 ${template.card.chip}`}>
                    {d ? (
                      <>
                        <span className={`text-[10px] font-semibold uppercase leading-none ${template.card.accentText}`}>
                          {MONTHS[d.getMonth()]}
                        </span>
                        <span className={`text-sm font-bold leading-none mt-0.5 ${template.card.text}`}>{d.getDate()}</span>
                      </>
                    ) : (
                      <span className={`text-[10px] ${template.card.textMuted}`}>—</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${template.card.text}`}>{item.title}</p>
                    {item.location && (
                      <p className={`text-[10px] ${template.card.textMuted} truncate`}>{item.location}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }
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

  // ── avvisi-homepage ────────────────────────────────────────────────────────────
  if (block.id === 'avvisi-homepage') {
    if (contentItems.length > 0) {
      return (
        <div>
          <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
          <div className="space-y-2">
            {contentItems.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${SEVERITY_DOT[item.severity] ?? SEVERITY_DOT.info}`} />
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${template.card.text}`}>{item.title}</p>
                  {item.body && (
                    <p className={`text-[10px] ${template.card.textMuted} truncate`}>{item.body}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
    // skeleton fallback — avvisi falls through to generic
  }

  // ── media / fiere / mostre ─────────────────────────────────────────────────────
  if (MEDIA_IDS.has(block.id)) {
    if (contentItems.length > 0) {
      return (
        <div>
          <Header template={template} block={block} Icon={Icon} />
          <div className={`grid ${gridColsClass} gap-2`}>
            {contentItems.slice(0, itemCount).map((item, i) =>
              item.imageUrl ? (
                <img
                  key={i}
                  src={item.imageUrl}
                  alt={item.caption || item.title || ''}
                  className="aspect-square rounded-md object-cover w-full"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              ) : (
                <div key={i} className={`aspect-square rounded-md ${template.card.skeletonLight}`} />
              )
            )}
          </div>
        </div>
      )
    }
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

  if (block.id === 'calendario-eventi') return <CalendarBlockPreview block={block} contentItems={contentItems} />
  if (block.id === 'carosello-contenuti') return <CarouselBlockPreview block={block} contentItems={contentItems} />
  if (block.id === 'timeline-aziendale') return <TimelineBlockPreview block={block} contentItems={contentItems} />

  // ── countdown-lancio ───────────────────────────────────────────────────────────
  if (block.id === 'countdown-lancio') {
    const targetItem = contentItems[0]
    if (targetItem?.targetDate) {
      const msLeft = new Date(targetItem.targetDate) - new Date()
      const days = Math.max(0, Math.floor(msLeft / 86400000))
      return (
        <div>
          <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
          {targetItem.title && (
            <p className={`text-center text-xs ${template.card.textMuted} mb-2 truncate`}>{targetItem.title}</p>
          )}
          <div className="flex justify-center">
            <div className={`flex items-baseline gap-1 px-4 py-2 rounded-md ${template.card.iconBg}`}>
              <span className="text-xl font-bold text-white">{days}</span>
              <span className="text-xs text-white/70">{t('blocks.days')}</span>
            </div>
          </div>
        </div>
      )
    }
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

  // ── faq / come-fare-per ────────────────────────────────────────────────────────
  if (block.id === 'faq' || block.id === 'come-fare-per') {
    if (contentItems.length > 0) {
      return (
        <div>
          <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
          <div className="space-y-1.5">
            {contentItems.slice(0, 3).map((item, i) => (
              <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded ${template.card.chip}`}>
                <icons.ChevronRight size={11} className={`${template.card.accentText} flex-shrink-0`} />
                <span className={`text-xs truncate ${template.card.text}`}>{item.question || item.title}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  // ── organigramma / rubrica / new-entry / oggi-presentiamo ─────────────────────
  if (PERSON_IDS.has(block.id)) {
    if (contentItems.length > 0) {
      return (
        <div>
          <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
          <div className="space-y-2">
            {contentItems.slice(0, 2).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${template.card.iconBg}`}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className="w-8 h-8 rounded-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                  ) : (
                    <span className="text-xs font-bold text-white">
                      {(item.name || item.title || '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${template.card.text}`}>{item.name || item.title}</p>
                  {(item.role || item.department) && (
                    <p className={`text-[10px] ${template.card.textMuted} truncate`}>{item.role || item.department}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  // ── generic fallback (skeleton) ────────────────────────────────────────────────
  return (
    <div>
      <Header template={template} block={block} Icon={Icon} showSeeAll={false} />
      {contentItems.length > 0 ? (
        <div className="space-y-2">
          {contentItems.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <icons.ChevronRight size={12} className={`${template.card.textMuted} flex-shrink-0`} />
              <span className={`text-xs truncate ${template.card.text}`}>
                {item.title || item.name || item.question || Object.values(item).find(v => typeof v === 'string') || '—'}
              </span>
            </div>
          ))}
        </div>
      ) : (
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
      )}
    </div>
  )
}
