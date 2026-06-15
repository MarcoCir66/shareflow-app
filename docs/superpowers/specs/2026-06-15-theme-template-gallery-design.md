# Theme/Template Gallery — Design Spec

## Context & Goal

ShareFlow's configurator currently renders the intranet preview in a single fixed
visual style (navy + electric blue, per `tailwind.config.js`). This feature adds a
**gallery of pre-built visual templates** the user can apply to the preview, similar
to the template gallery in [Origami Connect](https://www.origamiconnect.com/): pick a
template, optionally tweak the brand accent color, and the live preview re-skins
immediately.

## Approach

**Curated Template Gallery** (chosen over a modular theme builder or brand-override-only
approach): a fixed catalog of complete template presets. Selecting a template re-skins
the whole "site preview" area at once. On top of the selected template, the user can
override a single **accent color** (the brand color).

**v1 scope — 4 templates**, each controlling all 4 visual axes (palette/typography,
nav/mega-menu style, hero banner, card/widget style):

1. **Corporate Classic** — refines ShareFlow's current navy/electric-blue look. Safe default.
2. **Modern Light** — light backgrounds, soft gradients, rounded cards with shadows, teal accent.
3. **Dark Glass** — dark gradient background, semi-transparent "glass" cards, glowing blue-electric accent.
4. **Vibrant Color** — bold purple/orange brand colors on nav and hero, light content area.

**Typography note (resolves an ambiguity from the original "palette + typography" axis):**
in v1, "typography" is expressed through weight/size/letter-spacing/effects already
encoded in the per-template hero/nav tokens (e.g., Dark Glass's glowing hero title,
Modern Light's wide-letter-spacing eyebrow) — all templates keep the existing **Inter**
font family. Swapping font families per template is out of scope for v1 (see
Out of Scope).

## Architecture: Chrome vs. Site-Preview Boundary

Not a separate screen — a subset of the existing center column (`CanvasDropZone`)
becomes "template-driven" (the **site preview**); everything else stays ShareFlow's
fixed navy/electric-blue **chrome**.

**Site preview (template-driven):**
- `CanvasTopNav` + `MegaMenuPanel` (the site's nav)
- New `HeroBanner` component
- `CanvasBlockPreview` + the card wrapper in `CanvasBlock` (widget appearance)

**Chrome (unchanged, always ShareFlow navy/electric-blue):**
- `Navbar`, both sidebars
- The "Canvas Preview" label/subtitle
- The dashed-border section container, "Aggiungi sezione" button, layout/selection controls
- The selection-ring treatment on a selected `CanvasBlock` (editor affordance, not part
  of the published site — always blue regardless of template)

## Theme Mechanism

- Each template is a static object of Tailwind class strings (no dynamic CSS generation,
  no `tailwind.config.js` changes).
- The accent color override uses a CSS custom property `--theme-accent`, set via inline
  `style` on the `max-w-2xl mx-auto` wrapper inside `CanvasDropZone` (the container that
  already holds `CanvasTopNav`, the preview label, and the dashed section container).
  All site-preview components live inside this wrapper, so the variable cascades to them.
- Template tokens that must reflect the brand color use Tailwind arbitrary-value classes
  reading the variable, e.g. `text-[var(--theme-accent)]`, `border-[var(--theme-accent)]`,
  `bg-[var(--theme-accent)]`.
- If the user has not set a custom accent color, `--theme-accent` is set to the
  template's own default accent color (so the variable is always defined).

## Template Catalog

`data/themeTemplates.js` exports `THEME_TEMPLATES` (array of 4) and
`resolveTheme(themeState)`.

Each template has this shape:

```js
{
  id, name, accentColor,           // default accent color (hex)
  nav: { wrapper, tabActive, tabInactive, megaMenu, megaMenuBorder, megaMenuActive, megaMenuInactive },
  hero: { wrapper, eyebrow, title },
  card: { wrapper, text, textMuted, accentText, iconBg, skeleton, skeletonLight, chip },
}
```

`resolveTheme(themeState)`:
```js
export function resolveTheme(themeState) {
  const template = THEME_TEMPLATES.find(t => t.id === themeState?.templateId) ?? THEME_TEMPLATES[0]
  const accentColor = themeState?.accentColor ?? template.accentColor
  return { template, accentColor }
}
```

### 1. Corporate Classic — `accentColor: '#0078D4'`

| Token | Classes |
|---|---|
| `nav.wrapper` | `bg-navy rounded-xl px-2` |
| `nav.tabActive` | `text-white border-[var(--theme-accent)]` |
| `nav.tabInactive` | `text-slate-light border-transparent hover:text-white` |
| `nav.megaMenu` | `bg-navy` |
| `nav.megaMenuBorder` | `border-white/10` |
| `nav.megaMenuActive` | `text-[var(--theme-accent)]` |
| `nav.megaMenuInactive` | `text-slate-light hover:text-white` |
| `hero.wrapper` | `bg-gradient-to-br from-navy to-navy-light` |
| `hero.eyebrow` | `text-slate-light` |
| `hero.title` | `text-white` |
| `card.wrapper` | `bg-white border border-gray-200 shadow-sm rounded-lg` |
| `card.text` | `text-navy` |
| `card.textMuted` | `text-gray-400` |
| `card.accentText` | `text-[var(--theme-accent)]` |
| `card.iconBg` | `bg-[var(--theme-accent)]` |
| `card.skeleton` | `bg-gray-200` |
| `card.skeletonLight` | `bg-gray-100` |
| `card.chip` | `bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20` |

### 2. Modern Light — `accentColor: '#14B8A6'`

| Token | Classes |
|---|---|
| `nav.wrapper` | `bg-white shadow-sm rounded-xl px-2` |
| `nav.tabActive` | `text-navy border-[var(--theme-accent)]` |
| `nav.tabInactive` | `text-slate-400 border-transparent hover:text-navy` |
| `nav.megaMenu` | `bg-white` |
| `nav.megaMenuBorder` | `border-slate-200` |
| `nav.megaMenuActive` | `text-[var(--theme-accent)]` |
| `nav.megaMenuInactive` | `text-slate-400 hover:text-navy` |
| `hero.wrapper` | `bg-gradient-to-br from-[#EAF4FF] to-[#FDF2F8]` |
| `hero.eyebrow` | `text-slate-500` |
| `hero.title` | `text-navy` |
| `card.wrapper` | `bg-white rounded-xl shadow-md border-0` |
| `card.text` | `text-navy` |
| `card.textMuted` | `text-slate-400` |
| `card.accentText` | `text-[var(--theme-accent)]` |
| `card.iconBg` | `bg-[var(--theme-accent)] rounded-full` |
| `card.skeleton` | `bg-slate-200` |
| `card.skeletonLight` | `bg-slate-100` |
| `card.chip` | `bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20` |

### 3. Dark Glass — `accentColor: '#00B4FF'`

| Token | Classes |
|---|---|
| `nav.wrapper` | `bg-navy/90 backdrop-blur border-b border-white/10 rounded-xl px-2` |
| `nav.tabActive` | `text-white border-[var(--theme-accent)]` |
| `nav.tabInactive` | `text-slate-light border-transparent hover:text-white` |
| `nav.megaMenu` | `bg-navy/90` |
| `nav.megaMenuBorder` | `border-white/10` |
| `nav.megaMenuActive` | `text-[var(--theme-accent)]` |
| `nav.megaMenuInactive` | `text-slate-light hover:text-white` |
| `hero.wrapper` | `bg-gradient-to-br from-navy via-[#241B4E] to-navy-light` |
| `hero.eyebrow` | `text-slate-light` |
| `hero.title` | `text-white [text-shadow:0_0_12px_rgba(0,180,255,0.55)]` |
| `card.wrapper` | `bg-white/5 backdrop-blur border border-white/10 rounded-lg` |
| `card.text` | `text-white` |
| `card.textMuted` | `text-slate-light` |
| `card.accentText` | `text-[var(--theme-accent)]` |
| `card.iconBg` | `bg-[var(--theme-accent)]` |
| `card.skeleton` | `bg-white/20` |
| `card.skeletonLight` | `bg-white/10` |
| `card.chip` | `bg-[var(--theme-accent)]/15 border border-[var(--theme-accent)]/30` |

### 4. Vibrant Color — `accentColor: '#E94F37'`

| Token | Classes |
|---|---|
| `nav.wrapper` | `bg-[#5B2A86] rounded-xl px-2` |
| `nav.tabActive` | `text-white border-[var(--theme-accent)]` |
| `nav.tabInactive` | `text-[#D8C2F0] border-transparent hover:text-white` |
| `nav.megaMenu` | `bg-[#5B2A86]` |
| `nav.megaMenuBorder` | `border-white/10` |
| `nav.megaMenuActive` | `text-[var(--theme-accent)]` |
| `nav.megaMenuInactive` | `text-[#D8C2F0] hover:text-white` |
| `hero.wrapper` | `bg-gradient-to-br from-[#5B2A86] to-[#E94F37]` |
| `hero.eyebrow` | `text-[#F0DCEB]` |
| `hero.title` | `text-white` |
| `card.wrapper` | `bg-white rounded-lg shadow-sm border-0` |
| `card.text` | `text-navy` |
| `card.textMuted` | `text-gray-400` |
| `card.accentText` | `text-[var(--theme-accent)]` |
| `card.iconBg` | `bg-[var(--theme-accent)]` |
| `card.skeleton` | `bg-[#F1E4DC]` |
| `card.skeletonLight` | `bg-[#FBF0EA]` |
| `card.chip` | `bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20` |

## Components

### New files

- **`client/src/data/themeTemplates.js`** — `THEME_TEMPLATES` (the 4 templates above) and
  `resolveTheme(themeState)`.
- **`client/src/hooks/useTheme.js`** — `useTheme()` reads
  `state.tenantConfiguration.theme` via `useConfigurator()` and returns
  `resolveTheme(...)` → `{ template, accentColor }`.
- **`client/src/components/canvas/HeroBanner.jsx`** — new component rendered between
  `CanvasTopNav` and the "Canvas Preview" label. Reads `activePage` (via `findPage`) and
  `tenantConfiguration.siteName` from `useConfigurator()`, and `template.hero.*` from
  `useTheme()`:
  - Eyebrow (`template.hero.eyebrow`, uppercase, small): `tenantConfiguration.siteName`
  - Title (`template.hero.title`, large, bold): `activePage.title`
- **`client/src/components/sidebar-left/AppearancePanel.jsx`** — new component for the
  "Aspetto" tab:
  - A gallery of the 4 templates (cards with small color swatches reflecting each
    template's nav/hero/card colors, matching the visual mockups already validated).
    Clicking a card dispatches `SET_TENANT_META` with
    `payload: { theme: { ...currentTheme, templateId: <id> } }`.
  - An accent color picker (`<input type="color">`) bound to
    `state.tenantConfiguration.theme.accentColor ?? template.accentColor`. On change,
    dispatches `SET_TENANT_META` with
    `payload: { theme: { ...currentTheme, accentColor: <hex> } }`.
  - A "Reset to template default" action dispatches `SET_TENANT_META` with
    `payload: { theme: { ...currentTheme, accentColor: null } }`.
  - The currently selected template card is visually highlighted
    (`state.tenantConfiguration.theme.templateId`).

### Modified files

- **`client/src/components/canvas/CanvasDropZone.jsx`** ([current](shareflow-app/client/src/components/canvas/CanvasDropZone.jsx)):
  - The `<div className="max-w-2xl mx-auto">` wrapper (line 16) gets
    `style={{ '--theme-accent': accentColor }}` from `useTheme()`.
  - Insert `<HeroBanner />` between `<CanvasTopNav />` (line 17) and the "Canvas Preview"
    label block (lines 19-22).
- **`client/src/components/canvas/CanvasTopNav.jsx`** ([current](shareflow-app/client/src/components/canvas/CanvasTopNav.jsx)):
  - `useTheme()` for `template`.
  - Outer wrapper (line 37, currently `mb-4 border-b border-slate-mid`) becomes
    `mb-4 ${template.nav.wrapper}`.
  - Tab classes (line 44, currently
    `activeRoot.pageId === page.pageId ? 'border-blue-electric text-navy' : 'border-transparent text-slate-light hover:text-navy'`)
    become `isActive ? template.nav.tabActive : template.nav.tabInactive` (keep the
    shared `border-b-2` base class).
  - Pass `template` down to `MegaMenuPanel`.
- **`client/src/components/canvas/MegaMenuPanel.jsx`** ([current](shareflow-app/client/src/components/canvas/MegaMenuPanel.jsx)):
  - Receives `template` prop.
  - Outer wrapper (line 3, currently `bg-surface`) → `template.nav.megaMenu`.
  - Active item (line 22, `text-blue`) → `template.nav.megaMenuActive`; inactive
    (`text-slate-light hover:text-navy`) → `template.nav.megaMenuInactive`. Same for
    `MegaMenuItem` (line 46).
  - Nested `<ul>` border (lines 27, 51, `border-slate-mid`) → `template.nav.megaMenuBorder`.
- **`client/src/components/canvas/CanvasBlock.jsx`** ([current](shareflow-app/client/src/components/canvas/CanvasBlock.jsx)):
  - `useTheme()` for `template`.
  - Card wrapper classes (lines 45-48): the **unselected** branch
    (`border-gray-200 hover:border-gray-300 hover:shadow-md`) is replaced by
    `template.card.wrapper`. The **selected** branch
    (`border-blue ring-1 ring-blue/20 shadow-md`) is unchanged across all templates —
    it's an editor affordance, not part of the published site.
- **`client/src/components/canvas/CanvasBlockPreview.jsx`** ([current](shareflow-app/client/src/components/canvas/CanvasBlockPreview.jsx)):
  - `useTheme()` for `template`.
  - `Header` (lines 20-32): icon (`text-blue`) → `template.card.accentText`; label
    (`text-navy`) → `template.card.text`; "See all" (`text-blue`) → `template.card.accentText`.
  - `SkeletonLine` (lines 16-18): `bg-gray-200`/`bg-gray-100` → `template.card.skeleton`/`template.card.skeletonLight`.
  - News/media image placeholders (`bg-gray-100`, lines 46, 89) → `template.card.skeletonLight`.
  - Event date chip (line 66, `bg-blue/10 border border-blue/20`) → `template.card.chip`;
    month label (`text-blue`, line 67) → `template.card.accentText`; day number
    (`text-navy`, line 70) → `template.card.text`.
  - Countdown boxes (line 101, `bg-navy`) → `template.card.iconBg`; numbers (`text-white`,
    line 102) stay `text-white` (works against every template's accent color).
  - Default list chevrons (`text-gray-400`, lines 115, 119) → `template.card.textMuted`.
- **`client/src/components/sidebar-left/LeftSidebar.jsx`** ([current](shareflow-app/client/src/components/sidebar-left/LeftSidebar.jsx)):
  - `TABS` (lines 5-8) gains `{ id: 'appearance', label: 'Aspetto' }`.
  - Render branch (line 28) renders `<AppearancePanel />` when `tab === 'appearance'`.

## State & Export

- No new action type. The existing `SET_TENANT_META` action
  ([configuratorReducer.js:294-298](shareflow-app/client/src/context/configuratorReducer.js#L294-L298))
  already does `tenantConfiguration: { ...state.tenantConfiguration, ...action.payload }`
  (shallow merge).
- `initialState.tenantConfiguration` ([configuratorReducer.js:66-71](shareflow-app/client/src/context/configuratorReducer.js#L66-L71))
  gains: `theme: { templateId: 'corporate-classic', accentColor: null }`.
- Because the merge is shallow at the `tenantConfiguration` level, `AppearancePanel`
  must spread the current `theme` object when dispatching (`{ ...currentTheme, templateId: ... }`)
  to avoid dropping the other field.
- `buildTenantExport` ([pageHelpers.js:161-175](shareflow-app/client/src/context/pageHelpers.js#L161-L175))
  already spreads `tenantConfiguration` into the export payload — `theme` is included
  automatically. No changes needed.

## Testing

Extend `client/tests/smoke.spec.js` (Playwright), following existing patterns:

1. **Tab "Aspetto"**: clicking the "Aspetto" tab shows the gallery with all 4 template
   names visible.
2. **Selecting a template**: after selecting e.g. "Modern Light", the Hero banner is
   visible showing "My Corporate Intranet" and "Home" (the active page title), and the
   nav wrapper's background reflects the new template (assert on a class or computed
   style distinguishing it from the default).
3. **Accent color picker**: after setting a custom accent color, the `--theme-accent`
   CSS variable on the canvas wrapper reflects the new value.
4. **Deploy flow** (extends the existing test at
   [smoke.spec.js:103-118](shareflow-app/client/tests/smoke.spec.js#L103-L118)): assert
   `tenantConfiguration.theme` (with `templateId` and `accentColor`) is present in the
   POST payload to `/api/provisioning/jobs`, the same way `navigation` is currently checked.

## Out of Scope (v1)

- Modular/independent theme builder (rejected approach — see "Approach").
- More than 4 templates; user-defined/custom templates.
- Per-page theme overrides (theme is tenant-wide).
- Logo upload / brand asset management.
- Per-template font-family swapping (see Typography note in "Approach").
