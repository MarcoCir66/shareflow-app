import * as icons from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { PAGE_TEMPLATES } from '../../data/pageTemplates.js'
import ApplyTemplateDialog from './ApplyTemplateDialog.jsx'

function isPageEmpty(page) {
  return page.sections.every(section => section.columns.every(column => column.widgets.length === 0))
}

export default function TemplateGallery() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { t } = useTranslation()
  const [pendingTemplate, setPendingTemplate] = useState(null)

  function applyTemplate(template) {
    dispatch({
      type: ACTIONS.APPLY_TEMPLATE,
      payload: { pages: [{ title: template.defaultPageTitle, sections: template.sections }] },
    })
  }

  function handleSelect(template) {
    const activePage = state.pages.find(p => p.pageId === state.activePageId)
    if (isPageEmpty(activePage)) {
      applyTemplate(template)
    } else {
      setPendingTemplate(template)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-2">
        {PAGE_TEMPLATES.map(template => {
          const Icon = icons[template.icon] ?? icons.Box
          return (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className="flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left bg-slate-mid border-slate-mid hover:border-blue-electric hover:bg-navy-light transition-all"
            >
              <Icon size={20} className="text-blue-electric flex-shrink-0" />
              <span className="text-xs font-semibold text-white">
                {t(`templates.labels.${template.id}`, { defaultValue: template.label })}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-light">
                {t(`templates.categories.${template.category}`, { defaultValue: template.category })}
              </span>
              <span className="text-xs text-slate-light leading-tight">
                {t(`templates.descriptions.${template.id}`, { defaultValue: template.description })}
              </span>
            </button>
          )
        })}
      </div>
      {pendingTemplate && (
        <ApplyTemplateDialog
          template={pendingTemplate}
          onCancel={() => setPendingTemplate(null)}
          onConfirm={() => {
            applyTemplate(pendingTemplate)
            setPendingTemplate(null)
          }}
        />
      )}
    </div>
  )
}
