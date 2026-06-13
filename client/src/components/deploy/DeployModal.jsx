import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Loader2, Circle, X, ExternalLink } from 'lucide-react'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { startProvisioning, getProvisioningStatus } from '../../lib/provisioningApi.js'

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
  const [jobId, setJobId] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [status, setStatus] = useState('running')
  const [result, setResult] = useState(null)
  const startedRef = useRef(false)

  const done = status === 'done'
  const failed = status === 'error'

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    dispatch({ type: ACTIONS.EXPORT_CONFIGURATION })

    const tenantConfiguration = { ...state.tenantConfiguration, widgets: state.activeWidgets }
    startProvisioning(tenantConfiguration)
      .then(({ jobId: newJobId }) => setJobId(newJobId))
      .catch(() => setStatus('error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!jobId || status !== 'running') return

    const interval = setInterval(async () => {
      try {
        const job = await getProvisioningStatus(jobId)
        setCurrentStep(job.currentStep)
        if (job.status === 'done') {
          setStatus('done')
          setResult(job.result)
        }
      } catch {
        setStatus('error')
      }
    }, 900)

    return () => clearInterval(interval)
  }, [jobId, status])

  const siteName = state.tenantConfiguration.siteName

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate rounded-2xl border border-slate-mid w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-mid">
          <h2 className="text-white font-semibold">Deploying to SharePoint</h2>
          {(done || failed) && (
            <button onClick={onClose} className="text-slate-light hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {failed ? (
          <div className="p-5 space-y-3">
            <p className="text-sm text-red-400">
              Unable to reach the provisioning service. Make sure the backend is running and try again.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg bg-blue-electric text-navy font-semibold text-sm hover:bg-blue transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-3">
              {STEPS.map((step, i) => {
                const stepStatus = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending'
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    {stepStatus === 'done'   && <CheckCircle2 size={18} className="text-blue-electric flex-shrink-0" />}
                    {stepStatus === 'active' && <Loader2 size={18} className="text-blue-electric animate-spin flex-shrink-0" />}
                    {stepStatus === 'pending'&& <Circle size={18} className="text-slate-mid flex-shrink-0" />}
                    <span className={`text-sm ${stepStatus === 'pending' ? 'text-slate-light' : 'text-white'}`}>
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
                    href={result?.siteUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
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
          </>
        )}
      </div>
    </div>
  )
}
