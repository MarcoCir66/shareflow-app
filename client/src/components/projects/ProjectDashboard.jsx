// client/src/components/projects/ProjectDashboard.jsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects.js'
import { fetchProject } from '../../lib/projectsApi.js'
import ProjectCard from './ProjectCard.jsx'
import ProjectFormModal from './ProjectFormModal.jsx'

export default function ProjectDashboard({ onOpen }) {
  const { projects, loading, error, createProject, updateProject, deleteProject } = useProjects()
  const [createOpen, setCreateOpen]  = useState(false)
  const [editTarget, setEditTarget]  = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  async function handleCreate(meta) {
    const project = await createProject(meta)
    const full = await fetchProject(project.id)
    onOpen(full)
  }

  async function handleOpen(id) {
    const full = await fetchProject(id)
    onOpen(full)
  }

  async function handleEdit(meta) {
    await updateProject(editTarget.id, {
      name: meta.name, description: meta.description ?? null,
      client: meta.client ?? null, tags: meta.tags, status: meta.status,
    })
    setEditTarget(null)
  }

  async function handleDelete(id) {
    await deleteProject(id)
    setDeleteTarget(null)
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-ink-950 flex items-center px-6 border-b border-ink-800 gap-3">
        <img src="/favicon.svg" alt="" className="w-8 h-8" />
        <span className="text-white font-semibold text-sm tracking-wide">ShareFlow</span>
      </header>

      <main className="pt-14 max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-white text-2xl font-semibold">I tuoi progetti</h1>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-flow-400 hover:bg-flow-600 text-ink-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> Nuovo progetto
          </button>
        </div>

        {loading && <p className="text-ink-400 text-sm">Caricamento...</p>}
        {error   && <p className="text-red-400 text-sm">Errore: {error}</p>}

        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-24">
            <p className="text-ink-400 text-sm mb-4">Nessun progetto ancora.</p>
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 bg-flow-400 hover:bg-flow-600 text-ink-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} /> Crea il tuo primo progetto
            </button>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => handleOpen(project.id)}
                onEdit={() => setEditTarget(project)}
                onDelete={() => setDeleteTarget(project)}
              />
            ))}
          </div>
        )}
      </main>

      {createOpen && (
        <ProjectFormModal mode="create" onSubmit={handleCreate} onClose={() => setCreateOpen(false)} />
      )}
      {editTarget && (
        <ProjectFormModal mode="edit" project={editTarget} onSubmit={handleEdit} onClose={() => setEditTarget(null)} />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-ink-800 rounded-2xl border border-ink-700 w-full max-w-sm p-6 space-y-4">
            <h2 className="text-white font-semibold">Eliminare il progetto?</h2>
            <p className="text-ink-400 text-sm">
              "{deleteTarget.name}" verrà eliminato definitivamente.
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteTarget.id)}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
              >
                Elimina
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-lg bg-ink-700 text-white text-sm hover:bg-ink-600 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
