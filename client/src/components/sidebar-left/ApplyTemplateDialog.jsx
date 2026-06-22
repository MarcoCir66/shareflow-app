import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'

export default function ApplyTemplateDialog({ template, kind = 'page', onCancel, onConfirm }) {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef, { active: true, onEscape: onCancel })

  const labelKey = kind === 'site' ? `templates.siteLabels.${template.id}` : `templates.labels.${template.id}`
  const label = t(labelKey, { defaultValue: template.label })
  const bodyKey = kind === 'site' ? 'templates.confirmBodySite' : 'templates.confirmBody'

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="apply-template-title" className="bg-slate rounded-2xl border border-slate-mid w-full max-w-sm shadow-2xl p-5">
        <h2 id="apply-template-title" className="text-white font-semibold mb-2">{t('templates.confirmTitle')}</h2>
        <p className="text-sm text-slate-light mb-4">{t(bodyKey, { name: label })}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-slate-light hover:text-white transition-colors">
            {t('templates.confirmCancel')}
          </button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-sm bg-blue-electric text-navy font-semibold rounded-lg hover:bg-blue transition-colors">
            {t('templates.confirmApply')}
          </button>
        </div>
      </div>
    </div>
  )
}
