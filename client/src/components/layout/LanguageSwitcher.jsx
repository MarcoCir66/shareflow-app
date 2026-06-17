import { useTranslation } from 'react-i18next'
import { useLang } from '../../hooks/useLang.js'

const LANGS = ['it', 'en', 'fr', 'de']

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = useLang()

  return (
    <div role="group" aria-label="Language switcher" className="flex gap-0.5 bg-[#1A2F4A] rounded-md p-0.5">
      {LANGS.map(lang => (
        <button
          key={lang}
          onClick={() => i18n.changeLanguage(lang)}
          aria-pressed={current === lang}
          aria-label={`Switch language to ${lang.toUpperCase()}`}
          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
            current === lang
              ? 'bg-blue-electric text-navy'
              : 'text-slate-light hover:text-white'
          }`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
