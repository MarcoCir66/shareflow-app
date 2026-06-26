import { msalInstance, isMsalConfigured } from '../auth/msalInstance.js'
import { loginRequest } from '../auth/msalConfig.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

async function getAuthHeaders() {
  if (!isMsalConfigured) return {}
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  if (!account) return {}
  const result = await msalInstance.acquireTokenSilent({ ...loginRequest, account })
  return { Authorization: `Bearer ${result.idToken}` }
}

export async function startProvisioning(tenantConfiguration) {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/provisioning/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ tenantConfiguration }),
  })
  if (!res.ok) throw new Error(`Failed to start provisioning (${res.status})`)
  return res.json()
}

export async function getProvisioningStatus(jobId) {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/provisioning/jobs/${jobId}`, { headers: authHeaders })
  if (!res.ok) throw new Error(`Failed to fetch provisioning status (${res.status})`)
  return res.json()
}

export async function validateDeploy(tenantConfiguration) {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/provisioning/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ tenantConfiguration }),
  })
  if (!res.ok) return { unmappedBlocks: [] }
  return res.json()
}
