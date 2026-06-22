import * as icons from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import BlockLibrary from './BlockLibrary.jsx'
import PagesPanel from './PagesPanel.jsx'
import AppearancePanel from './AppearancePanel.jsx'
import TemplateGallery from './TemplateGallery.jsx'

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
      <div className="flex flex-col border-b border-slate-mid flex-shrink-0">
        {TABS.map(tabItem => {
          const Icon = icons[tabItem.icon] ?? icons.Box
          return (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider
                transition-colors border-l-2
                ${tab === tabItem.id
                  ? 'text-blue-electric border-blue-electric bg-blue-electric/10'
                  : 'text-slate-light border-transparent hover:text-white hover:bg-navy-light'}`}
            >
              <Icon size={16} aria-hidden="true" className="flex-shrink-0" />
              {tabItem.label}
            </button>
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
