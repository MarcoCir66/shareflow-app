import { Eye, LineChart, Save, LayoutDashboard, HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isMsalConfigured } from '../../auth/msalInstance.js'
import AuthSection from './AuthSection.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'

function openPreview() {
  window.open('/?mode=preview', 'shareflow-preview')
}

export default function Navbar({ projectName, saving, onSave, onGoToDashboard, onEditProject, onDeployClick, onAnalyticsClick, onGuideClick }) {
  const { t } = useTranslation()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-ink-950 flex items-center justify-between px-6 border-b border-ink-800">
      <div className="flex items-center gap-3">
        <img src="/favicon.svg" alt="" className="w-8 h-8" />
        <div>
          <span className="text-white font-semibold text-sm tracking-wide">ShareFlow</span>
          {projectName && (
            onEditProject
              ? <button onClick={onEditProject} className="text-ink-400 hover:text-white text-xs ml-2 hidden md:inline transition-colors">{projectName}</button>
              : <span className="text-ink-400 text-xs ml-2 hidden md:inline">{projectName}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {onGoToDashboard && (
          <button onClick={onGoToDashboard}
            className="flex items-center gap-2 text-ink-400 hover:text-white border border-ink-700 hover:border-ink-600 text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <LayoutDashboard size={14} />
            Progetti
          </button>
        )}
        {onSave && (
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-2 text-ink-400 hover:text-white border border-ink-700 hover:border-ink-600 text-sm px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        )}
        {isMsalConfigured ? <AuthSection /> : (
          <span className="text-xs text-ink-400 bg-ink-800 px-3 py-1 rounded-full border border-ink-700">
            {t('navbar.tenant')}
          </span>
        )}
        <LanguageSwitcher />
        {onGuideClick && (
          <button
            onClick={onGuideClick}
            className="flex items-center gap-2 text-ink-400 hover:text-white border border-ink-700 hover:border-ink-600 text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <HelpCircle size={14} />
            Guida
          </button>
        )}
        <button onClick={onAnalyticsClick}
          className="flex items-center gap-2 text-ink-400 hover:text-white border border-ink-700 hover:border-ink-800 text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          <LineChart size={14} />
          {t('navbar.analytics')}
        </button>
        <button onClick={openPreview}
          data-tour="preview-btn"
          className="flex items-center gap-2 text-ink-400 hover:text-white border border-ink-700 hover:border-ink-800 text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          <Eye size={14} />
          {t('navbar.preview')}
        </button>
        <button onClick={onDeployClick}
          data-tour="deploy-btn"
          className="flex items-center gap-2 bg-flow-400 hover:bg-flow-600 text-ink-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {t('navbar.deploy')}
        </button>
      </div>
    </header>
  )
}
