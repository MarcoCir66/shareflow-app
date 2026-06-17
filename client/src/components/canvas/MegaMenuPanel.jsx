import { t2 } from '../../utils/localizedText.js'

export default function MegaMenuPanel({ node, activePageId, onSelect, template, lang }) {
  return (
    <div className={`px-3 py-3 ${template.nav.megaMenu}`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {node.children.map(child => (
          <MegaMenuColumn key={child.pageId} node={child} activePageId={activePageId} onSelect={onSelect} template={template} lang={lang} />
        ))}
      </div>
    </div>
  )
}

function MegaMenuColumn({ node, activePageId, onSelect, template, lang }) {
  const isActive = node.pageId === activePageId
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => onSelect(node.pageId)}
        title={t2(node.title, lang)}
        className={`block w-full truncate text-left text-xs font-semibold transition-colors
          ${isActive ? template.nav.megaMenuActive : template.nav.megaMenuInactive}`}
      >
        {t2(node.title, lang)}
      </button>
      {node.children.length > 0 && (
        <ul className={`mt-1.5 space-y-1 border-l pl-2 ${template.nav.megaMenuBorder}`}>
          {node.children.map(grandchild => (
            <MegaMenuItem key={grandchild.pageId} node={grandchild} activePageId={activePageId} onSelect={onSelect} template={template} lang={lang} />
          ))}
        </ul>
      )}
    </div>
  )
}

function MegaMenuItem({ node, activePageId, onSelect, template, lang }) {
  const isActive = node.pageId === activePageId
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={() => onSelect(node.pageId)}
        title={t2(node.title, lang)}
        className={`block w-full truncate text-left text-xs transition-colors
          ${isActive ? `${template.nav.megaMenuActive} font-semibold` : template.nav.megaMenuInactive}`}
      >
        {t2(node.title, lang)}
      </button>
      {node.children.length > 0 && (
        <ul className={`mt-1.5 space-y-1 border-l pl-2 ${template.nav.megaMenuBorder}`}>
          {node.children.map(greatGrandchild => (
            <MegaMenuItem key={greatGrandchild.pageId} node={greatGrandchild} activePageId={activePageId} onSelect={onSelect} template={template} lang={lang} />
          ))}
        </ul>
      )}
    </li>
  )
}
