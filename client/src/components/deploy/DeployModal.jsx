import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, Circle, X, ExternalLink } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'

const STEPS = [
  { id: 1, label: 'Authenticating via MSAL…',
    // TODO: MSAL — replace delay with:
    // const token = await msalInstance.acquireTokenSilent({ scopes: ['Sites.FullControl.All'] })
  },
  { id: 2, label: 'Connecting to Microsoft Graph API…',
    // TODO: GRAPH — const graphClient = Client.initWithMiddleware({ authProvider })
  },
  { id: 3, label: 'Creating SharePoint Communication Site…',
    // TODO: SP_SITE — await graphClient.api('/sites').post({ displayName: siteName, ... })
  },
  { id: 4, label: 'Provisioning Lists & Content Types…',
    // TODO: SP_LISTS — for (const widget of tenantConfiguration.widgets) { await provisionList(widget) }
  },
  { id: 5, label: 'Configuring Pages & Webparts…',
    // TODO: SP_PAGES — await graphClient.api(`/sites/${siteId}/pages`).post(pageLayout)
  },
  { id: 6, label: 'Deployment complete!' },
]

export default function DeployModal({ onClose }) {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const [currentStep, setCurrentStep] = useState(0)
  const done = currentStep >= STEPS.length

  useEffect(() => {
    dispatch({ type: ACTIONS.EXPORT_CONFIGURATION })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (done) return
    const timer = setTimeout(() => setCurrentStep(s => s + 1), 900)
    return () => clearTimeout(timer)
  }, [currentStep, done])

  const siteName = state.tenantConfiguration.siteName

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate rounded-2xl border border-slate-mid w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-mid">
          <h2 className="text-white font-semibold">Deploying to SharePoint</h2>
          {done && (
            <button onClick={onClose} className="text-slate-light hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="p-5 space-y-3">
          {STEPS.map((step, i) => {
            const status = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending'
            return (
              <div key={step.id} className="flex items-center gap-3">
                {status === 'done'   && <CheckCircle2 size={18} className="text-blue-electric flex-shrink-0" />}
                {status === 'active' && <Loader2 size={18} className="text-blue-electric animate-spin flex-shrink-0" />}
                {status === 'pending'&& <Circle size={18} className="text-slate-mid flex-shrink-0" />}
                <span className={`text-sm ${status === 'pending' ? 'text-slate-light' : 'text-white'}`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        {done && (
          <div className="px-5 pb-5">
            <div className="bg-navy rounded-xl p-4 border border-blue/30">
              <p className="text-xs text-slate-light mb-1">Your SharePoint site is ready</p>
              <p className="text-white font-semibold text-sm mb-3">{siteName}</p>
              <a
                href="#"
                className="inline-flex items-center gap-1.5 text-xs text-blue-electric hover:underline"
              >
                Open in SharePoint <ExternalLink size={12} />
              </a>
            </div>
            <button
              onClick={onClose}
              className="mt-3 w-full py-2 rounded-lg bg-blue-electric text-navy font-semibold text-sm hover:bg-blue transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
