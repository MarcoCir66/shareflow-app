import { useTranslation } from 'react-i18next'

export default function Header({ template, block, Icon, showSeeAll = true }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={16} className={`${template.card.accentText} flex-shrink-0`} />
        <span className={`text-sm font-semibold truncate ${template.card.text}`}>
          {t(`blocks.labels.${block.id}`, { defaultValue: block.label })}
        </span>
      </div>
      {showSeeAll && (
        <span className={`text-xs font-medium flex-shrink-0 ${template.card.accentText}`}>
          {t('blocks.seeAll')}
        </span>
      )}
    </div>
  )
}
