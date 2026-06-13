import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig, isMsalConfigured } from './msalConfig.js'

export { isMsalConfigured }

export const msalInstance = isMsalConfigured ? new PublicClientApplication(msalConfig) : null
