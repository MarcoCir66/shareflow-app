// client/src/hooks/useProjects.js
import { useState, useEffect, useCallback } from 'react'
import { initialState } from '../context/configuratorReducer.js'
import * as projectsApi from '../lib/projectsApi.js'

const DEFAULT_CANVAS = {
  pages: initialState.pages,
  activePageId: initialState.activePageId,
  tenantConfiguration: initialState.tenantConfiguration,
}

export function useProjects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    projectsApi.listProjects()
      .then(data => { setProjects(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const createProject = useCallback(async (meta) => {
    const project = await projectsApi.createProject({
      name: meta.name,
      description: meta.description ?? null,
      client: meta.client ?? null,
      tags: meta.tags ?? [],
      canvas_state: DEFAULT_CANVAS,
    })
    setProjects(prev => [project, ...prev])
    return project
  }, [])

  const updateProject = useCallback(async (id, patch) => {
    const updated = await projectsApi.updateProject(id, patch)
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
    return updated
  }, [])

  const deleteProject = useCallback(async (id) => {
    await projectsApi.deleteProject(id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }, [])

  return { projects, loading, error, createProject, updateProject, deleteProject }
}
