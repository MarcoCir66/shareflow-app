# Left sidebar navigation redesign — design spec

**Date:** 2026-06-22
**Scope:** UI revision of an existing component (not a new functional phase)

## Goal

Replace the left sidebar's horizontal, equal-width tab bar (`client/src/components/sidebar-left/LeftSidebar.jsx`) with a vertical icon+label list. The current bar squeezes 4 uppercase, tracked-letter-spacing labels ("BLOCCHI", "PAGINE", "ASPETTO", "TEMPLATE") into a fixed 260px-wide sidebar (`client/src/components/layout/WorkspaceShell.jsx:6`, `gridTemplateColumns: '260px 1fr 320px'`), making the text visually cramped and leaving no room to add a 5th function without further squeezing. A vertical list decouples the number of functions from the available horizontal width — it scales by height, not by squeezing — while keeping every label always legible.

## Approaches considered

Three alternatives were mocked up and compared visually (260px-wide mockups, including a hypothetical 5th tab to stress-test scaling):

1. **Vertical icon+label list (chosen).** Each function becomes a full-width stacked row with an icon and an always-visible label. Scales by height; the sidebar and panel already scroll, so this is not a hard limit. Tradeoff: each row's height adds up — moving from 1 row (~40px) to 4 rows (~150px) takes that space away from the panel below. Accepted as a known, deliberate tradeoff.
2. Icon-only rail + content panel (VS Code–style: a narrow ~52px icon column beside the panel). Maximizes scalability and frees horizontal width entirely, but drops always-visible text labels in favor of icon + hover tooltip — a bigger structural change (splits the 260px column into two) and a real accessibility/clarity regression relative to option 1.
3. Horizontal tabs with icon + short label, collapsing overflow beyond a fixed count into an "Altro ▾" dropdown. Smallest visual change from today, but only defers the scaling problem (hidden items behind a click) rather than solving it, and keeps the same cramped-width pressure on whichever tabs remain visible.

Option 1 was selected.

## Section 1 — Component & layout change

`LeftSidebar.jsx` stays a single file (42 lines today — too small to warrant splitting into a sub-component). The tab row's container changes from a horizontal flex row to a vertical flex column; each tab button changes from `flex-1` (equal-width horizontal cell) to `w-full` (full-width stacked row), with a 16px lucide-react icon preceding the label.

Icon choices (semantic fit, lucide-react names — verify they render correctly when running the app, per this project's standing UI-change verification practice):

| Tab | Icon |
|---|---|
| Blocchi | `Blocks` |
| Pagine | `Files` |
| Aspetto | `Palette` |
| Template | `LayoutTemplate` |

**Accepted tradeoff:** 4 stacked rows at ~38px each ≈ 150px of vertical height, versus today's single ~40px row. This reduces the active panel's visible height below the nav by roughly that amount. Both the sidebar (`<aside className="overflow-y-auto ...">` in `WorkspaceShell.jsx`) and the active panel area already scroll, so this is a visual tradeoff, not a hard usability blocker — accepted as the cost of solving the cramping and scaling problems.

## Section 2 — Visual style

Active-state accent moves from an underline (`border-b-2`) to a left accent bar (`border-l-2`), keeping the same blue-electric color language already used elsewhere in the app:

```jsx
<button
  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider
    transition-colors border-l-2
    ${tab === tabItem.id
      ? 'text-blue-electric border-blue-electric bg-blue-electric/10'
      : 'text-slate-light border-transparent hover:text-white hover:bg-navy-light'}`}
>
  <Icon size={16} aria-hidden="true" className="flex-shrink-0" />
  {tabItem.label}
</button>
```

The icon is `aria-hidden="true"`: it is purely decorative next to an always-present text label, so it must not be announced redundantly by assistive technology. No `role="tablist"`/`role="tab"`/`aria-selected` semantics are introduced — that would require associating each button with its panel via `aria-controls`/`role="tabpanel"`, a larger accessibility lift than this visual revision calls for, and one the pre-existing horizontal tab bar never had either (Phase 4's accessibility hardening did not touch this component). Out of scope here, consistent with not building beyond what's asked.

## Section 3 — i18n fix included in this revision

Three of the four tab labels ("Blocchi", "Pagine", "Aspetto") are currently hardcoded Italian strings, never routed through `t()` — a pre-existing gap explicitly left out of scope in Phase 5a, since that work only touched the 4th ("Template") tab. Because this revision rewrites the exact lines defining all four tab entries anyway, the fix is included now at near-zero marginal cost. A new `sidebar` locale namespace is added to all four locale files, with IT values kept textually identical to today's hardcoded strings (so no existing Playwright test that locates these buttons by name needs to change):

| Key | IT | EN | FR | DE |
|---|---|---|---|---|
| `sidebar.tabBlocks` | Blocchi | Blocks | Blocs | Blöcke |
| `sidebar.tabPages` | Pagine | Pages | Pages | Seiten |
| `sidebar.tabAppearance` | Aspetto | Appearance | Apparence | Erscheinungsbild |

`templates.tabLabel` (the 4th tab, already i18n-routed since Phase 5a) is unchanged.

```jsx
const TABS = [
  { id: 'blocks', label: t('sidebar.tabBlocks'), icon: 'Blocks' },
  { id: 'pages', label: t('sidebar.tabPages'), icon: 'Files' },
  { id: 'appearance', label: t('sidebar.tabAppearance'), icon: 'Palette' },
  { id: 'templates', label: t('templates.tabLabel'), icon: 'LayoutTemplate' },
]
```

## Section 4 — Testing

No existing test changes: every IT label stays textually identical, so every existing Playwright test that locates a sidebar tab button by name (`getByRole('button', { name: 'Aspetto' })`, `{ name: 'Pagine' }`, `{ name: 'Template', exact: true }`, etc.) continues to pass unchanged — lucide-react icons render as plain `<svg>` with no accessible text, so they don't affect any button's accessible name.

One new test, extending the existing i18n test block's established pattern (`client/tests/smoke.spec.js`'s `test.describe` block with `'switching to EN translates Pages panel header and Add page button'` etc.):

```js
test('switching to EN translates the sidebar tab labels', async ({ page }) => {
  await page.getByRole('button', { name: 'EN' }).click()
  await expect(page.getByRole('button', { name: 'Blocks', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pages', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Appearance', exact: true })).toBeVisible()
})
```

The full unit and e2e suites are re-run after the change to confirm zero regressions, and the app is run manually to visually confirm the four chosen lucide-react icon names exist and render correctly — standard practice for UI changes in this project.

## Out of scope

- Full ARIA tablist/tabpanel semantics (`role="tablist"`/`role="tab"`/`aria-selected`/`aria-controls`) — a larger accessibility change than this visual revision, and one the pre-existing component never had.
- Drag-and-drop reordering of the nav items.
- Animated transitions between panels.
- Any change to the already-i18n-routed 4th tab ("Template") or to the Pagina/Sito sub-toggle inside `TemplateGallery.jsx` (Phase 5b, unrelated to this revision).
- An icon-only rail layout (option 2) or a horizontal-overflow layout (option 3) — considered and not chosen.
