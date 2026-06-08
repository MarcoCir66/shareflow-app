import { Layers } from 'lucide-react'

export default function Navbar({ onDeployClick }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-navy flex items-center justify-between px-6 border-b border-slate">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-electric">
          <Layers size={18} className="text-navy" />
        </div>
        <div>
          <span className="text-white font-semibold text-sm tracking-wide">ShareFlow</span>
          <span className="text-slate-light text-xs ml-2 hidden md:inline">
            The No-Code SharePoint Intranet Factory
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-light bg-slate px-3 py-1 rounded-full border border-slate-mid">
          Tenant: Contoso Corp
        </span>
        <button
          onClick={onDeployClick}
          className="flex items-center gap-2 bg-blue-electric hover:bg-blue text-navy font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Deploy to SharePoint
        </button>
      </div>
    </header>
  )
}
