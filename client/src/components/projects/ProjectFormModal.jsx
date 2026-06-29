import { useState } from 'react'

export default function ProjectFormModal({ mode, project, onSubmit, onClose }) {
  const [name, setName]               = useState(project?.name ?? '')
  const [client, setClient]           = useState(project?.client ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [tags, setTags]               = useState(project?.tags ?? [])
  const [status, setStatus]           = useState(project?.status ?? 'draft')
  const [tagInput, setTagInput]       = useState('')
  const [submitting, setSubmitting]   = useState(false)

  function addTag(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        client: client.trim() || null,
        description: description.trim() || null,
        tags,
        status,
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-ink-800 rounded-2xl border border-ink-700 w-full max-w-md shadow-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold">
          {mode === 'create' ? 'Nuovo progetto' : 'Modifica progetto'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-ink-400 mb-1 block">Nome *</label>
            <input
              required value={name} onChange={e => setName(e.target.value)}
              placeholder="es. Intranet Acme Srl"
              className="w-full bg-ink-900 text-white rounded-lg px-3 py-2 text-sm border border-ink-700 focus:border-flow-400 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-ink-400 mb-1 block">Cliente</label>
            <input
              value={client} onChange={e => setClient(e.target.value)}
              placeholder="es. Acme Srl"
              className="w-full bg-ink-900 text-white rounded-lg px-3 py-2 text-sm border border-ink-700 focus:border-flow-400 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-ink-400 mb-1 block">Descrizione</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="Note, obiettivi..."
              className="w-full bg-ink-900 text-white rounded-lg px-3 py-2 text-sm border border-ink-700 focus:border-flow-400 outline-none resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-ink-400 mb-1 block">Tag (Invio per aggiungere)</label>
            <input
              value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
              placeholder="es. hr"
              className="w-full bg-ink-900 text-white rounded-lg px-3 py-2 text-sm border border-ink-700 focus:border-flow-400 outline-none"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 bg-ink-700 text-ink-200 text-xs px-2 py-0.5 rounded-full">
                    {tag}
                    <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="text-ink-400 hover:text-white leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {mode === 'edit' && (
            <div>
              <label className="text-xs text-ink-400 mb-1 block">Stato</label>
              <select
                value={status} onChange={e => setStatus(e.target.value)}
                className="w-full bg-ink-900 text-white rounded-lg px-3 py-2 text-sm border border-ink-700 focus:border-flow-400 outline-none"
              >
                <option value="draft">Bozza</option>
                <option value="published">Pubblicata</option>
                <option value="archived">Archiviata</option>
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="submit" disabled={submitting || !name.trim()}
              className="flex-1 py-2 rounded-lg bg-flow-400 text-ink-950 font-semibold text-sm hover:bg-flow-600 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Salvataggio...' : mode === 'create' ? 'Crea' : 'Salva'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-ink-700 text-white text-sm hover:bg-ink-600 transition-colors"
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
