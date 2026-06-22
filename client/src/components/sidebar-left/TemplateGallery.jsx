import * as icons from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConfigurator } from '../../hooks/useConfigurator.js'
import { PAGE_TEMPLATES, pageTemplateById } from '../../data/pageTemplates.js'
import { SITE_TEMPLATES } from '../../data/siteTemplates.js'
import ApplyTemplateDialog from './ApplyTemplateDialog.jsx'

function isPageEmpty(page) {
  return page.sections.every(section => section.columns.every(column => column.widgets.length === 0))
}

export default function TemplateGallery() {
  const { state, dispatch, ACTIONS } = useConfigurator()
  const { t } = useTranslation()
  const [mode, setMode] = useState('page')
  const [pendingTemplate, setPendingTemplate] = useState(null)

  function applyPageTemplate(template) {
    dispatch({
      type: ACTIONS.APPLY_TEMPLATE,
      payload: { pages: [{ title: template.defaultPageTitle, sections: template.sections }] },
    })
  }

  function applySiteTemplate(siteTemplate) {
    const pages = siteTemplate.pages.map(({ pageTemplateId, parentIndex }) => ({
      title: pageTemplateById[pageTemplateId].defaultPageTitle,
      sections: pageTemplateById[pageTemplateId].sections,
      parentIndex,
    }))
    dispatch({
      type: ACTIONS.APPLY_TEMPLATE,
      payload: { pages, theme: { templateId: siteTemplate.themeId, accentColor: null } },
    })
  }

  function isSiteEmpty() {
    return state.pages.length === 1 && isPageEmpty(state.pages[0])
  }

  function handleSelect(template) {
    if (mode === 'page') {
      const activePage = state.pages.find(p => p.pageId === state.activePageId)
      if (isPageEmpty(activePage)) {
        applyPageTemplate(template)
      } else {
        setPendingTemplate(template)
      }
    } else {
      if (isSiteEmpty()) {
        applySiteTemplate(template)
      } else {
        setPendingTemplate(template)
      }
    }
  }

  const catalog = mode === 'page' ? PAGE_TEMPLATES : SITE_TEMPLATES
  const labelNamespace = mode === 'page' ? 'labels' : 'siteLabels'
  const descriptionNamespace = mode === 'page' ? 'descriptions' : 'siteDescriptions'

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setMode('page')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${mode === 'page' ? 'bg-blue-electric text-navy' : 'bg-slate-mid text-slate-light hover:text-white'}`}
        >
          {t('templates.modePage')}
        </button>
        <button
          onClick={() => setMode('site')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${mode === 'site' ? 'bg-blue-electric text-navy' : 'bg-slate-mid text-slate-light hover:text-white'}`}
        >
          {t('templates.modeSite')}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {catalog.map(template => {
          const Icon = icons[template.icon] ?? icons.Box
          return (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className="flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left bg-slate-mid border-slate-mid hover:border-blue-electric hover:bg-navy-light transition-all"
            >
              <Icon size={20} className="text-blue-electric flex-shrink-0" />
              <span className="text-xs font-semibold text-white">
                {t(`templates.${labelNamespace}.${template.id}`, { defaultValue: template.label })}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-light">
                {t(`templates.categories.${template.category}`, { defaultValue: template.category })}
              </span>
              <span className="text-xs text-slate-light leading-tight">
                {t(`templates.${descriptionNamespace}.${template.id}`, { defaultValue: template.description })}
              </span>
            </button>
          )
        })}
      </div>
      {pendingTemplate && (
        <ApplyTemplateDialog
          template={pendingTemplate}
          kind={mode}
          onCancel={() => setPendingTemplate(null)}
          onConfirm={() => {
            if (mode === 'page') applyPageTemplate(pendingTemplate)
            else applySiteTemplate(pendingTemplate)
            setPendingTemplate(null)
          }}
        />
      )}
    </div>
  )
}
