import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n.js'
import './index.css'
import App from './App.jsx'
import { ConfiguratorProvider } from './context/ConfiguratorContext.jsx'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance, isMsalConfigured } from './auth/msalInstance.js'

const app = (
  <ConfiguratorProvider>
    <App />
  </ConfiguratorProvider>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isMsalConfigured ? <MsalProvider instance={msalInstance}>{app}</MsalProvider> : app}
  </StrictMode>
)
