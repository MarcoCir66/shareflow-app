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
    { id: 'blocks', label: 'Blocchi' },
    { id: 'pages', label: 'Pagine' },
    { id: 'appearance', label: 'Aspetto' },
    { id: 'templates', label: t('templates.tabLabel') },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-mid flex-shrink-0">
        {TABS.map(tabItem => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2
              ${tab === tabItem.id ? 'text-blue-electric border-blue-electric' : 'text-slate-light border-transparent hover:text-white'}`}
          >
            {tabItem.label}
          </button>
        ))}
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
