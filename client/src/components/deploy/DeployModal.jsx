import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Loader2, Circle, X, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { buildTenantExport } from '../../context/pageHelpers.js'
import { startProvisioning, getProvisioningStatus } from '../../lib/provisioningApi.js'
import { useLang } from '../../hooks/useLang.js'
import { t2 } from '../../utils/localizedText.js'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'

export default function DeployModal({ onClose }) {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { t } = useTranslation()
  const lang = useLang()
  const [jobId, setJobId] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [status, setStatus] = useState('running')
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const startedRef = useRef(false)

  const done = status === 'done'
  const failed = status === 'error'

  // Real step implementations live in server/src/provisioningJobs.js,
  // using server/src/msalClient.js (app-only MSAL token) and
  // server/src/graphClient.js (Graph SDK client) when Azure credentials are
  // configured; otherwise each step is simulated.
  const STEPS = [
    { id: 1, label: t('deploy.step1') },
    { id: 2, label: t('deploy.step2') },
    { id: 3, label: t('deploy.step3') },
    { id: 4, label: t('deploy.step4') },
    { id: 5, label: t('deploy.step5') },
    { id: 6, label: t('deploy.step6') },
  ]

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    dispatch({ type: ACTIONS.EXPORT_CONFIGURATION })

    const tenantConfiguration = buildTenantExport(state.pages, state.tenantConfiguration)
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
        } else if (job.status === 'error') {
          setStatus('error')
          setErrorMessage(job.error)
        }
      } catch {
        setStatus('error')
      }
    }, 900)

    return () => clearInterval(interval)
  }, [jobId, status])

  const siteName = t2(state.tenantConfiguration.siteName, lang)
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef, { active: true, onEscape: onClose })

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="deploy-modal-title" className="bg-ink-800 rounded-2xl border border-ink-700 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-ink-700">
          <h2 id="deploy-modal-title" className="text-white font-semibold">{t('deploy.title')}</h2>
          {(done || failed) && (
            <button onClick={onClose} className="text-ink-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {failed ? (
          <div className="p-5 space-y-3">
            <p className="text-sm text-red-400">
              {errorMessage ?? t('deploy.errorDefault')}
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg bg-flow-400 text-ink-950 font-semibold text-sm hover:bg-flow-600 transition-colors"
            >
              {t('deploy.close')}
            </button>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-3">
              {STEPS.map((step, i) => {
                const stepStatus = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending'
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    {stepStatus === 'done'   && <CheckCircle2 size={18} className="text-flow-400 flex-shrink-0" />}
                    {stepStatus === 'active' && <Loader2 size={18} className="text-flow-400 animate-spin flex-shrink-0" />}
                    {stepStatus === 'pending'&& <Circle size={18} className="text-ink-700 flex-shrink-0" />}
                    <span className={`text-sm ${stepStatus === 'pending' ? 'text-ink-400' : 'text-white'}`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {done && (
              <div className="px-5 pb-5">
                <div className="bg-ink-950 rounded-xl p-4 border border-flow-600/30">
                  <p className="text-xs text-ink-400 mb-1">{t('deploy.siteReady')}</p>
                  <p className="text-white font-semibold text-sm mb-3">{siteName}</p>
                  <a
                    href={result?.siteUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-flow-400 hover:underline"
                  >
                    {t('deploy.openInSharePoint')} <ExternalLink size={12} />
                  </a>
                </div>
                <button
                  onClick={onClose}
                  className="mt-3 w-full py-2 rounded-lg bg-flow-400 text-ink-950 font-semibold text-sm hover:bg-flow-600 transition-colors"
                >
                  {t('deploy.done')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
