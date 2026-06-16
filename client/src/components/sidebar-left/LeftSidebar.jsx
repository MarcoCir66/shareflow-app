import { useState } from 'react'
import BlockLibrary from './BlockLibrary.jsx'
import PagesPanel from './PagesPanel.jsx'
import AppearancePanel from './AppearancePanel.jsx'

const TABS = [
  { id: 'blocks', label: 'Blocchi' },
  { id: 'pages', label: 'Pagine' },
  { id: 'appearance', label: 'Aspetto' },
]

export default function LeftSidebar() {
  const [tab, setTab] = useState('blocks')

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-mid flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2
              ${tab === t.id ? 'text-blue-electric border-blue-electric' : 'text-slate-light border-transparent hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'blocks' && <BlockLibrary />}
        {tab === 'pages' && <PagesPanel />}
        {tab === 'appearance' && <AppearancePanel />}
      </div>
    </div>
  )
}
