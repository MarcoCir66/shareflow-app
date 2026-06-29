import { ExternalLink, Pencil, Trash2 } from 'lucide-react'

const STATUS_STYLES = {
  draft:     'bg-ink-700 text-ink-300',
  published: 'bg-green-900/50 text-green-400',
  archived:  'bg-amber-900/50 text-amber-400',
}
const STATUS_LABELS = { draft: 'Bozza', published: 'Pubblicata', archived: 'Archiviata' }

export default function ProjectCard({ project, onOpen, onEdit, onDelete }) {
  const dateStr = new Date(project.updatedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="bg-ink-800 border border-ink-700 rounded-xl p-5 flex flex-col gap-3 hover:border-ink-600 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate">{project.name}</h3>
          {project.client && <p className="text-ink-400 text-xs mt-0.5 truncate">{project.client}</p>}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLES[project.status] ?? STATUS_STYLES.draft}`}>
          {STATUS_LABELS[project.status] ?? project.status}
        </span>
      </div>
      {project.description && (
        <p className="text-ink-400 text-xs line-clamp-2">{project.description}</p>
      )}
      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.tags.map(tag => (
            <span key={tag} className="bg-ink-700 text-ink-300 text-xs px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      )}
      {project.spUrl && (
        <a href={project.spUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-flow-400 hover:underline truncate"
        >
          <ExternalLink size={11} /> Apri in SharePoint
        </a>
      )}
      <p className="text-ink-500 text-xs">Modificata {dateStr}</p>
      <div className="flex gap-2 pt-1">
        <button onClick={onOpen}
          className="flex-1 py-1.5 rounded-lg bg-flow-400 text-ink-950 font-semibold text-xs hover:bg-flow-600 transition-colors"
        >
          Apri
        </button>
        <button onClick={onEdit}
          className="p-2 rounded-lg bg-ink-700 text-ink-300 hover:text-white hover:bg-ink-600 transition-colors"
          aria-label="Modifica"
        >
          <Pencil size={14} />
        </button>
        <button onClick={onDelete}
          className="p-2 rounded-lg bg-ink-700 text-ink-300 hover:text-red-400 hover:bg-ink-600 transition-colors"
          aria-label="Elimina"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
