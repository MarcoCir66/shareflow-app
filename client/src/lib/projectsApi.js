// client/src/lib/projectsApi.js
import { msalInstance, isMsalConfigured } from '../auth/msalInstance.js'
import { loginRequest } from '../auth/msalConfig.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function getAuthHeaders() {
  if (!isMsalConfigured) return {}
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  if (!account) return {}
  const result = await msalInstance.acquireTokenSilent({ ...loginRequest, account })
  return { Authorization: `Bearer ${result.idToken}` }
}

export async function listProjects() {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/projects`, { headers })
  if (!res.ok) throw new Error(`listProjects failed (${res.status})`)
  return res.json()
}

export async function createProject(data) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`createProject failed (${res.status})`)
  return res.json()
}

export async function fetchProject(id) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/projects/${id}`, { headers })
  if (!res.ok) throw new Error(`fetchProject failed (${res.status})`)
  return res.json()
}

export async function updateProject(id, patch) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(patch),
  })
  if (!res.ok) throw new Error(`updateProject failed (${res.status})`)
  return res.json()
}

export async function deleteProject(id) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/projects/${id}`, { method: 'DELETE', headers })
  if (!res.ok) throw new Error(`deleteProject failed (${res.status})`)
}
