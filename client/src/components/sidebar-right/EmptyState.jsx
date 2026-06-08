import { MousePointerClick } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-mid flex items-center justify-center">
        <MousePointerClick size={22} className="text-slate-light" />
      </div>
      <p className="text-sm font-medium text-white">No block selected</p>
      <p className="text-xs text-slate-light">Click a block on the canvas to configure its properties</p>
    </div>
  )
}
