import { useTranslation } from 'react-i18next'

export function useLang() {
  const { i18n } = useTranslation()
  return i18n.language?.slice(0, 2) ?? 'it'
}
