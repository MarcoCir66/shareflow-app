const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'

export async function startProvisioning(tenantConfiguration) {
  const res = await fetch(`${API_BASE}/api/provisioning/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantConfiguration }),
  })
  if (!res.ok) throw new Error(`Failed to start provisioning (${res.status})`)
  return res.json()
}

export async function getProvisioningStatus(jobId) {
  const res = await fetch(`${API_BASE}/api/provisioning/jobs/${jobId}`)
  if (!res.ok) throw new Error(`Failed to fetch provisioning status (${res.status})`)
  return res.json()
}
