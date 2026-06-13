import 'isomorphic-fetch'
import { Client } from '@microsoft/microsoft-graph-client'
import { getGraphAccessToken } from './msalClient.js'

export async function getGraphClient() {
  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: getGraphAccessToken,
    },
  })
}
