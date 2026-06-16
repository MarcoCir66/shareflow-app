/**
 * Catalog of visual templates for the "Aspetto" appearance gallery.
 * Each template controls nav, hero banner, and widget-card styling via
 * Tailwind class strings. `accentColor` is the default value of the
 * `--theme-accent` CSS variable, overridable per tenant.
 */
export const THEME_TEMPLATES = [
  {
    id: 'corporate-classic',
    name: 'Corporate Classic',
    accentColor: '#0078D4',
    swatch: { nav: '#0F1C2E', hero: '#1A2F4A', card: '#FFFFFF' },
    nav: {
      wrapper: 'bg-navy rounded-xl px-2',
      tabActive: 'text-white border-[var(--theme-accent)]',
      tabInactive: 'text-slate-light border-transparent hover:text-white',
      megaMenu: 'bg-navy',
      megaMenuBorder: 'border-white/10',
      megaMenuActive: 'text-[var(--theme-accent)]',
      megaMenuInactive: 'text-slate-light hover:text-white',
    },
    hero: {
      wrapper: 'bg-gradient-to-br from-navy to-navy-light',
      eyebrow: 'text-slate-light',
      title: 'text-white',
    },
    card: {
      wrapper: 'bg-white border border-gray-200 shadow-sm rounded-lg',
      text: 'text-navy',
      textMuted: 'text-gray-400',
      accentText: 'text-[var(--theme-accent)]',
      iconBg: 'bg-[var(--theme-accent)]',
      skeleton: 'bg-gray-200',
      skeletonLight: 'bg-gray-100',
      chip: 'bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20',
    },
  },
  {
    id: 'modern-light',
    name: 'Modern Light',
    accentColor: '#14B8A6',
    swatch: { nav: '#FFFFFF', hero: '#EAF4FF', card: '#FFFFFF' },
    nav: {
      wrapper: 'bg-white shadow-sm rounded-xl px-2',
      tabActive: 'text-navy border-[var(--theme-accent)]',
      tabInactive: 'text-slate-400 border-transparent hover:text-navy',
      megaMenu: 'bg-white',
      megaMenuBorder: 'border-slate-200',
      megaMenuActive: 'text-[var(--theme-accent)]',
      megaMenuInactive: 'text-slate-400 hover:text-navy',
    },
    hero: {
      wrapper: 'bg-gradient-to-br from-[#EAF4FF] to-[#FDF2F8]',
      eyebrow: 'text-slate-500',
      title: 'text-navy',
    },
    card: {
      wrapper: 'bg-white rounded-xl shadow-md border-0',
      text: 'text-navy',
      textMuted: 'text-slate-400',
      accentText: 'text-[var(--theme-accent)]',
      iconBg: 'bg-[var(--theme-accent)] rounded-full',
      skeleton: 'bg-slate-200',
      skeletonLight: 'bg-slate-100',
      chip: 'bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20',
    },
  },
  {
    id: 'dark-glass',
    name: 'Dark Glass',
    accentColor: '#00B4FF',
    swatch: { nav: '#0F1C2E', hero: '#241B4E', card: '#2D3E50' },
    nav: {
      wrapper: 'bg-navy/90 backdrop-blur border-b border-white/10 rounded-xl px-2',
      tabActive: 'text-white border-[var(--theme-accent)]',
      tabInactive: 'text-slate-light border-transparent hover:text-white',
      megaMenu: 'bg-navy/90',
      megaMenuBorder: 'border-white/10',
      megaMenuActive: 'text-[var(--theme-accent)]',
      megaMenuInactive: 'text-slate-light hover:text-white',
    },
    hero: {
      wrapper: 'bg-gradient-to-br from-navy via-[#241B4E] to-navy-light',
      eyebrow: 'text-slate-light',
      title: 'text-white [text-shadow:0_0_12px_rgba(0,180,255,0.55)]',
    },
    card: {
      wrapper: 'bg-white/5 backdrop-blur border border-white/10 rounded-lg',
      text: 'text-white',
      textMuted: 'text-slate-light',
      accentText: 'text-[var(--theme-accent)]',
      iconBg: 'bg-[var(--theme-accent)]',
      skeleton: 'bg-white/20',
      skeletonLight: 'bg-white/10',
      chip: 'bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30',
    },
  },
  {
    id: 'vibrant-color',
    name: 'Vibrant Color',
    accentColor: '#E94F37',
    swatch: { nav: '#5B2A86', hero: '#E94F37', card: '#FFFFFF' },
    nav: {
      wrapper: 'bg-[#5B2A86] rounded-xl px-2',
      tabActive: 'text-white border-[var(--theme-accent)]',
      tabInactive: 'text-[#D8C2F0] border-transparent hover:text-white',
      megaMenu: 'bg-[#5B2A86]',
      megaMenuBorder: 'border-white/10',
      megaMenuActive: 'text-[var(--theme-accent)]',
      megaMenuInactive: 'text-[#D8C2F0] hover:text-white',
    },
    hero: {
      wrapper: 'bg-gradient-to-br from-[#5B2A86] to-[#E94F37]',
      eyebrow: 'text-[#F0DCEB]',
      title: 'text-white',
    },
    card: {
      wrapper: 'bg-white rounded-lg shadow-sm border-0',
      text: 'text-navy',
      textMuted: 'text-gray-400',
      accentText: 'text-[var(--theme-accent)]',
      iconBg: 'bg-[var(--theme-accent)]',
      skeleton: 'bg-[#F1E4DC]',
      skeletonLight: 'bg-[#FBF0EA]',
      chip: 'bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20',
    },
  },
]

/**
 * Resolves the effective template + accent color for the given
 * `tenantConfiguration.theme` state (which may be partial or undefined).
 */
export function resolveTheme(themeState) {
  const template = THEME_TEMPLATES.find(t => t.id === themeState?.templateId) ?? THEME_TEMPLATES[0]
  const accentColor = themeState?.accentColor ?? template.accentColor
  return { template, accentColor }
}
