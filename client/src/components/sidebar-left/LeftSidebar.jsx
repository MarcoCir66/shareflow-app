import * as icons from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import BlockLibrary from './BlockLibrary.jsx'
import PagesPanel from './PagesPanel.jsx'
import AppearancePanel from './AppearancePanel.jsx'
import TemplateGallery from './TemplateGallery.jsx'
import Tooltip from '../common/Tooltip.jsx'

export default function LeftSidebar() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('blocks')

  const TABS = [
    { id: 'blocks', label: t('sidebar.tabBlocks'), icon: 'Blocks' },
    { id: 'pages', label: t('sidebar.tabPages'), icon: 'Files' },
    { id: 'appearance', label: t('sidebar.tabAppearance'), icon: 'Palette' },
    { id: 'templates', label: t('templates.tabLabel'), icon: 'LayoutTemplate' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col border-b border-ink-700 flex-shrink-0">
        {TABS.map(tabItem => {
          const Icon = icons[tabItem.icon] ?? icons.Box
          return (
            <Tooltip key={tabItem.id} text={t(`tooltips.tabs.${tabItem.id}`)}>
              <button
                onClick={() => setTab(tabItem.id)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider
                  transition-colors border-l-2
                  ${tab === tabItem.id
                    ? 'text-flow-400 border-flow-400 bg-flow-400/10'
                    : 'text-ink-400 border-transparent hover:text-white hover:bg-ink-800'}`}
              >
                <Icon size={16} aria-hidden="true" className="flex-shrink-0" />
                {tabItem.label}
              </button>
            </Tooltip>
          )
        })}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'blocks' && <BlockLibrary />}
        {tab === 'pages' && <PagesPanel />}
        {tab === 'appearance' && <AppearancePanel />}
        {tab === 'templates' && <TemplateGallery />}
      </div>
    </div>
  )
}
