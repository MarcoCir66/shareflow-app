import fs from 'node:fs'
import { ConfidentialClientApplication } from '@azure/msal-node'

const GRAPH_DEFAULT_SCOPE = ['https://graph.microsoft.com/.default']

let cca = null

export function isGraphConfigured() {
  return Boolean(
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    (process.env.AZURE_CLIENT_SECRET || process.env.AZURE_CERT_KEY_PATH)
  )
}

function buildAuth() {
  const base = {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
  }
  if (process.env.AZURE_CERT_KEY_PATH) {
    return {
      ...base,
      clientCertificate: {
        thumbprint: process.env.AZURE_CERT_THUMBPRINT,
        privateKey: fs.readFileSync(process.env.AZURE_CERT_KEY_PATH, 'utf8'),
      },
    }
  }
  return { ...base, clientSecret: process.env.AZURE_CLIENT_SECRET }
}

function getConfidentialClient() {
  if (!cca) {
    cca = new ConfidentialClientApplication({ auth: buildAuth() })
  }
  return cca
}

export async function getGraphAccessToken() {
  const result = await getConfidentialClient().acquireTokenByClientCredential({
    scopes: GRAPH_DEFAULT_SCOPE,
  })
  if (!result) {
    throw new Error('Failed to acquire app-only Microsoft Graph access token')
  }
  return result.accessToken
}

export async function getSharePointAccessToken(hostname) {
  const result = await getConfidentialClient().acquireTokenByClientCredential({
    scopes: [`https://${hostname}/.default`],
  })
  if (!result) {
    throw new Error('Failed to acquire SharePoint access token')
  }
  return result.accessToken
}
