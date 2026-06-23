# Sidebar Explanatory Tooltips Design

## Context

ShareFlow's left sidebar (`LeftSidebar.jsx`) has grown into a dense catalog: 4 tabs (Blocchi, Pagine, Aspetto, Templates), each containing further functional groupings — 4 block categories holding 46 individual blocks, 4 Aspetto sub-sections, a 4-item theme-template gallery. Most of these are identified only by an icon and a short label (or, for blocks, icon + name only). New users have no way to learn what a given tab, category, block, or theme actually does without trial and error. No tooltip mechanism exists anywhere in the codebase today — the only precedent is the native HTML `title` attribute, used in one place (`CanvasBlock.jsx`'s "move to other column" icon button), which is unstyled, has no keyboard/focus support, and doesn't scale well across dozens of items.

## Goal

Every functional entry in the left sidebar — tabs, the menus/groups they contain, and the individual items inside those menus — gets a short, hover/focus-triggered explanatory tooltip describing its general purpose, without altering any existing click/drag behavior or visual layout.

## Scope

**In scope — exact inventory of tooltip attachment points:**

| Area | Items | Count |
|---|---|---|
| Top-level tabs (`LeftSidebar.jsx`) | Blocchi, Pagine, Aspetto, Templates | 4 |
| Block categories (`CategoryGroup.jsx`) | COMMUNICATION, LEARNING, PRODUCTIVITY, KNOWLEDGE_BASE | 4 |
| Individual blocks (`BlockCard.jsx`, rendered via `CategoryGroup.jsx`) | every entry in `blockCatalog.js` | 46 |
| Aspetto sub-sections (`AppearancePanel.jsx`) | Nome sito, Modello (theme gallery), Immagine sfondo, Colore brand | 4 |
| Theme-template gallery (`AppearancePanel.jsx`, `THEME_TEMPLATES`) | Corporate Classic, Modern Light, Dark Glass, Vibrant Color | 4 |

Total: 62 distinct items × 4 locales (`it`, `en`, `fr`, `de`) = 248 new translated strings.

**Out of scope:**
- The "Templates" tab's page/site template gallery (`TemplateGallery.jsx`) — these cards already render a visible, inline description (`templates.descriptions`/`templates.siteDescriptions`); adding a redundant hover tooltip on top would duplicate already-visible text.
- Individual pages in the "Pagine" tree (`PageTreeItem.jsx`) — these are user-created content, not catalog features, and don't need an explanatory tooltip.
- `MegaMenuPanel.jsx`, `themeTemplates.js`, `blockCatalog.js` — read-only for this feature (only their existing ids are used as i18n keys); no structural changes.
- Any new dependency (no tooltip library) — built from scratch using React + the existing Tailwind setup.
- Touch-device tooltip support beyond what hover/focus naturally provides (no tap-to-show variant) — out of scope for v1.

## Architecture

### `Tooltip.jsx` — reusable wrapper component

New file: `client/src/components/common/Tooltip.jsx` (same directory as the existing `AccessibleMenu.jsx`, the codebase's other shared sidebar-adjacent primitive).

A non-intrusive decorator: `<Tooltip text={...}>{children}</Tooltip>` wraps any existing element without changing its behavior.

- **Wrapper element:** a `<span className="contents">` (CSS `display: contents`). This removes the wrapper from the layout box tree entirely — the wrapped child (a grid cell in the 2-column block grid, a flex item in the tab list, etc.) is still the direct layout participant, so no existing grid/flex layout is affected by introducing the wrapper.
- **Trigger:** `onMouseEnter`/`onMouseLeave` (mouse) and `onFocus`/`onBlur` (keyboard) on the wrapper span. A ~400ms show-delay (cleared on early mouse-leave) avoids flicker when the cursor sweeps quickly across the 46-item block grid. Hide is immediate.
- **Positioning:** on show, reads the trigger's `getBoundingClientRect()` and renders the tooltip bubble via `createPortal(..., document.body)`, positioned `fixed`, vertically centered on the trigger and offset to its right. Rendering through a portal means the bubble is never clipped by the scrollable containers it lives inside (the block grid, the category list, the sidebar panels all use `overflow-y-auto`).
- **Accepted simplification:** the tooltip always renders to the right of the trigger, with no edge-detection/flip logic. The sidebar is permanently docked to the left edge of a fixed product layout, with the wide canvas area always to its right, so there is no realistic case where a right-anchored tooltip runs out of room. This is a deliberate scope reduction, not an oversight.
- **Styling:** matches the sidebar's existing dark theme tokens (`bg-navy`, `text-white`, `text-xs`) — no new color tokens introduced.
- **Markup:** the bubble has `role="tooltip"`; it does not intercept pointer events (`pointer-events-none`) so it can never interfere with drag-and-drop or clicks on whatever it's layered over.
- **Non-interference with drag-and-drop:** `Tooltip` only adds hover/focus listeners on its own wrapper span — it does not clone or modify the child's own props, refs, or listeners. `BlockCard.jsx`'s `useDraggable` ref/listeners stay attached to its own root `<div>`, unaffected by being wrapped from the outside.

### i18n content

A new top-level namespace, `tooltips`, added to all 4 locale files, structured to mirror the existing ids used elsewhere in the codebase (no new id scheme introduced):

```json
"tooltips": {
  "tabs": { "blocks": "...", "pages": "...", "appearance": "...", "templates": "..." },
  "blockCategories": { "COMMUNICATION": "...", "LEARNING": "...", "PRODUCTIVITY": "...", "KNOWLEDGE_BASE": "..." },
  "blocks": { "<blockId>": "...", /* one entry per id in blockCatalog.js, 46 total */ },
  "appearanceSections": { "siteName": "...", "template": "...", "backgroundImage": "...", "brandColor": "..." },
  "themeTemplates": { "corporate-classic": "...", "modern-light": "...", "dark-glass": "...", "vibrant-color": "..." }
}
```

Lookup pattern at each call site mirrors the existing `t(\`blocks.labels.${block.id}\`)` / `t(\`templates.descriptions.${template.id}\`)` convention already used throughout the sidebar: e.g. `t(\`tooltips.blocks.${block.id}\`)`, `t(\`tooltips.blockCategories.${category}\`)`, `t(\`tooltips.themeTemplates.${tmpl.id}\`)`.

**Content authoring:** all 248 strings (62 items × 4 locales) are written during the implementation-plan phase, not in this spec, so the spec stays focused on architecture. The plan will be reviewed before execution, giving a checkpoint to adjust wording before anything is built.

### Integration touch points

| File | Change |
|---|---|
| `LeftSidebar.jsx` | each of the 4 tab `<button>`s wrapped in `<Tooltip>` |
| `CategoryGroup.jsx` | the category header `<button>` wrapped in `<Tooltip>`; each rendered `<BlockCard>` wrapped in `<Tooltip>` |
| `AppearancePanel.jsx` | each of the 4 section `<h3>` headers wrapped in `<Tooltip>`; each of the 4 theme-template gallery `<button>`s wrapped in `<Tooltip>` |

No other file changes. `BlockCard.jsx`, `TemplateGallery.jsx`, `PagesPanel.jsx`, `PageTreeItem.jsx`, `MegaMenuPanel.jsx`, `blockCatalog.js`, `themeTemplates.js` are all read-only for this feature.

## Testing

Same constraint already established for this codebase ([[project-shareflow-hero-background-image]]'s test-architecture decision): this repo's Vitest runs in the default `node` environment with no jsdom/testing-library, so hover/focus/portal/`getBoundingClientRect` behavior cannot be meaningfully unit-tested there. `Tooltip.jsx` gets no Vitest test; its behavior is verified exclusively via Playwright e2e tests in a real browser.

Rather than one e2e test per item (which would be pure repetition — the underlying mechanism is identical for all 62 attachment points), the plan will include one representative Playwright test per integration touch point: a tab tooltip, a category tooltip, a block tooltip, an Aspetto-section tooltip, and a theme-template tooltip — five tests total, each asserting that hovering the target reveals a tooltip bubble containing the expected translated text.

## Known limitations (accepted for v1)

- No edge-flip positioning logic — tooltips always render to the right of their trigger (see Architecture). Acceptable given the sidebar's fixed left-docked position in the product layout.
- No tap-to-show variant for touch devices — hover/focus only.
- The fallback/error path that a tooltip mechanism might need (e.g. if `getBoundingClientRect` is called on an unmounted/hidden trigger) is not separately handled — `Tooltip` simply does not render its portal if `coords` hasn't been computed, which is the natural default state and requires no extra guard code.
