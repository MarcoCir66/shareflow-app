import { ConfidentialClientApplication } from '@azure/msal-node'

const GRAPH_DEFAULT_SCOPE = ['https://graph.microsoft.com/.default']

let cca = null

export function isGraphConfigured() {
  return Boolean(process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET)
}

function getConfidentialClient() {
  if (!cca) {
    cca = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
      },
    })
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
