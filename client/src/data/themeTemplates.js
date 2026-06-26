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
    pageBg: 'bg-ink-950',
    dark: true,
    nav: {
      wrapper: 'bg-ink-950 rounded-xl px-2',
      tabActive: 'text-white border-[var(--theme-accent)]',
      tabInactive: 'text-ink-400 border-transparent hover:text-white',
      megaMenu: 'bg-ink-950',
      megaMenuBorder: 'border-white/10',
      megaMenuActive: 'text-[var(--theme-accent)]',
      megaMenuInactive: 'text-ink-400 hover:text-white',
    },
    hero: {
      wrapper: 'bg-gradient-to-br from-ink-950 to-ink-800',
      eyebrow: 'text-ink-400',
      title: 'text-white',
    },
    card: {
      wrapper: 'bg-white border border-gray-200 shadow-sm rounded-lg',
      text: 'text-ink-950',
      textMuted: 'text-gray-400',
      accentText: 'text-[var(--theme-accent)]',
      iconBg: 'bg-[var(--theme-accent)]',
      skeleton: 'bg-gray-200',
      skeletonLight: 'bg-gray-100',
      chip: 'bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)] border border-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)]',
    },
  },
  {
    id: 'modern-light',
    name: 'Modern Light',
    accentColor: '#14B8A6',
    swatch: { nav: '#FFFFFF', hero: '#EAF4FF', card: '#FFFFFF' },
    pageBg: 'bg-paper',
    dark: false,
    nav: {
      wrapper: 'bg-white shadow-sm rounded-xl px-2',
      tabActive: 'text-ink-950 border-[var(--theme-accent)]',
      tabInactive: 'text-ink-400 border-transparent hover:text-ink-950',
      megaMenu: 'bg-white',
      megaMenuBorder: 'border-ink-200',
      megaMenuActive: 'text-[var(--theme-accent)]',
      megaMenuInactive: 'text-ink-400 hover:text-ink-950',
    },
    hero: {
      wrapper: 'bg-gradient-to-br from-[#EAF4FF] to-[#FDF2F8]',
      eyebrow: 'text-ink-500',
      title: 'text-ink-950',
    },
    card: {
      wrapper: 'bg-white rounded-xl shadow-md border-0',
      text: 'text-ink-950',
      textMuted: 'text-ink-400',
      accentText: 'text-[var(--theme-accent)]',
      iconBg: 'bg-[var(--theme-accent)] rounded-full',
      skeleton: 'bg-ink-200',
      skeletonLight: 'bg-ink-100',
      chip: 'bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)] border border-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)]',
    },
  },
  {
    id: 'dark-glass',
    name: 'Dark Glass',
    accentColor: '#00B4FF',
    swatch: { nav: '#0F1C2E', hero: '#241B4E', card: '#2D3E50' },
    pageBg: 'bg-ink-950',
    dark: true,
    nav: {
      wrapper: 'bg-ink-950/90 backdrop-blur border-b border-white/10 rounded-xl px-2',
      tabActive: 'text-white border-[var(--theme-accent)]',
      tabInactive: 'text-ink-400 border-transparent hover:text-white',
      megaMenu: 'bg-ink-950/90',
      megaMenuBorder: 'border-white/10',
      megaMenuActive: 'text-[var(--theme-accent)]',
      megaMenuInactive: 'text-ink-400 hover:text-white',
    },
    hero: {
      wrapper: 'bg-gradient-to-br from-ink-950 via-[#241B4E] to-ink-800',
      eyebrow: 'text-ink-400',
      title: 'text-white [text-shadow:0_0_12px_rgba(0,180,255,0.55)]',
    },
    card: {
      wrapper: 'bg-white/5 backdrop-blur border border-white/10 rounded-lg',
      text: 'text-white',
      textMuted: 'text-ink-400',
      accentText: 'text-[var(--theme-accent)]',
      iconBg: 'bg-[var(--theme-accent)]',
      skeleton: 'bg-white/20',
      skeletonLight: 'bg-white/10',
      chip: 'bg-[color-mix(in_srgb,var(--theme-accent)_15%,transparent)] border border-[color-mix(in_srgb,var(--theme-accent)_30%,transparent)]',
    },
  },
  {
    id: 'gradient-brand',
    name: 'Gradient Brand',
    accentColor: '#0F8B7E',
    swatch: { nav: '#0d0d1f', hero: '#0F8B7E', card: '#FFFFFF' },
    pageBg: 'bg-[#0d0d1f]',
    dark: true,
    nav: {
      wrapper: 'bg-ink-950 rounded-xl px-2',
      tabActive: 'text-white border-[var(--theme-accent)]',
      tabInactive: 'text-ink-400 border-transparent hover:text-white',
      megaMenu: 'bg-ink-950',
      megaMenuBorder: 'border-white/10',
      megaMenuActive: 'text-[var(--theme-accent)]',
      megaMenuInactive: 'text-ink-400 hover:text-white',
    },
    hero: {
      wrapper: 'hero-blob',
      eyebrow: 'text-white/60',
      title: 'text-white',
    },
    card: {
      wrapper: 'bg-white rounded-xl shadow-sm border border-ink-100',
      text: 'text-ink-950',
      textMuted: 'text-ink-400',
      accentText: 'text-[var(--theme-accent)]',
      iconBg: 'bg-[var(--theme-accent)]',
      skeleton: 'bg-ink-100',
      skeletonLight: 'bg-ink-50',
      chip: 'bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)] border border-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)]',
    },
  },
  {
    id: 'vibrant-color',
    name: 'Vibrant Color',
    accentColor: '#E94F37',
    swatch: { nav: '#5B2A86', hero: '#E94F37', card: '#FFFFFF' },
    pageBg: 'bg-paper',
    dark: false,
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
      text: 'text-ink-950',
      textMuted: 'text-gray-400',
      accentText: 'text-[var(--theme-accent)]',
      iconBg: 'bg-[var(--theme-accent)]',
      skeleton: 'bg-[#F1E4DC]',
      skeletonLight: 'bg-[#FBF0EA]',
      chip: 'bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)] border border-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)]',
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
