# ShareFlow logo redesign — design spec

**Date:** 2026-06-22
**Scope:** visual asset + 2 component edits (not a new functional phase)

## Goal

Replace ShareFlow's current logo mark — a generic lucide-react `Layers` icon in a `bg-blue-electric` square (`Navbar.jsx`) — with a more distinctive brand mark, while keeping the existing "ShareFlow" text wordmark untouched.

## Discovery: an unused brand asset already exists

`client/public/favicon.svg` is a custom-designed mark (a diamond/crystal silhouette with internal blurred gradient highlights) already built for ShareFlow, but it is only wired into `index.html`'s `<link rel="icon">` — it has never been rendered anywhere inside the React app. Reusing it avoids designing a new mark from scratch, but its existing palette is purple (`#863bff`/`#7e14ff`/`#ede6ff`/`#47bfff`), while every other color in the app's design system (`tailwind.config.js`) is blue-toned (`navy`, `blue`, `blue-electric`). Introducing a second, unrelated brand color was rejected in favor of recoloring the mark to match the existing palette.

## Section 1 — Color mapping and asset

Three recolor variants were mocked up and compared visually via the brainstorming visual companion, rendered inside the actual navy navbar next to the "ShareFlow" text. **Variant A (Electric Blue)** was chosen: it maps the mark's 4 original colors onto exact existing Tailwind tokens, preserving the original's tonal relationships (dark shadow blobs → lighter blobs → silhouette → brightest highlight):

| Original | Role | New (exact existing token) |
|---|---|---|
| `#863bff` | main silhouette | `#00B4FF` (`blue-electric`) |
| `#7e14ff` | dark shadow blobs | `#0078D4` (`blue.DEFAULT`) |
| `#ede6ff` | light highlight blobs | `#F3F6F9` (`surface`) |
| `#47bfff` | bright accent-pop blobs | `#00B4FF` (`blue-electric`, reused) |

(Rejected: Variant B — navy-dominant silhouette with the electric blue reserved for an internal pop highlight, more dramatic/premium; Variant C — a calmer 3-tone version with no bright cyan pop at all, using only navy/blue/white.)

`client/public/favicon.svg` is overwritten in place with this recolored SVG (same shape, same filters/mask structure, only the 4 fill colors and their `display-p3` duplicates change). This makes it the single source of truth for both the browser tab icon and the in-app logo — no second asset file, no duplication. The browser tab icon changes from purple to blue as a side effect, which resolves the brand-color mismatch that would otherwise exist between the tab and the navbar.

## Section 2 — Component integration

`client/src/components/layout/Navbar.jsx`: the `bg-blue-electric` rounded square containing the `Layers` icon (lines 17-19) is replaced with:

```jsx
<img src="/favicon.svg" alt="" className="w-8 h-8" />
```

The `Layers` import is removed from line 1 (`Eye` stays — still used at line 38 for the Preview button). `alt=""` marks the image as decorative: the literal text "ShareFlow" sits immediately beside it (line 21), so a screen reader must not announce the brand name twice — the same reasoning already applied to the sidebar nav redesign's icons (`aria-hidden="true"` there; `alt=""` here, the equivalent for an `<img>`).

`client/src/components/preview/PreviewToolbar.jsx`: the same mark is added immediately before the existing "ShareFlow" text (line 16), sized smaller to fit the toolbar's slimmer `h-10`:

```jsx
<img src="/favicon.svg" alt="" className="w-5 h-5" />
<span className="text-blue-electric font-bold text-sm">ShareFlow</span>
```

No other file renders the brand mark or the `Layers` icon (confirmed: `Layers` is not imported or used anywhere else in the codebase).

## Section 3 — Testing

No existing test references the `Layers` icon. The only existing assertion that touches this area, `smoke.spec.js:22` (`getByText('ShareFlow', { exact: true })`), checks the unchanged text and keeps passing. The existing accessibility test `'default editor view has no in-scope accessibility violations'` already covers the navbar; `alt=""` satisfies axe-core's `image-alt` rule by correctly marking the image decorative, so it introduces no new violation. This is a 1:1 visual substitution with no new behavior, so no new test is added — consistent with how the sidebar nav redesign (a comparable visual-only change) also added no new unit/e2e test beyond what already existed, only relying on its existing coverage continuing to pass.

## Out of scope

- A configurable theme/palette system for ShareFlow's own editor UI (raised as a tangent during brainstorming) — a separate, larger feature if pursued, unrelated to brand identity.
- Any change to the "ShareFlow" text wordmark itself, or to `navbar.tagline`.
- `client/public/icons.svg` (the unrelated social-icon symbol library) — untouched.
