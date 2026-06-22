# ShareFlow Logo Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic lucide-react `Layers` icon currently used as ShareFlow's logo mark with the app's existing-but-unwired `favicon.svg` brand mark, recolored from purple to the app's existing blue design tokens.

**Architecture:** `client/public/favicon.svg` is overwritten in place with a recolored version of itself (same shape/filters/mask, only 4 fill colors changed) — this makes it a single asset serving both the browser tab icon and the in-app logo. It is then wired into two existing components, `Navbar.jsx` and `PreviewToolbar.jsx`, as a plain `<img>` tag, replacing/augmenting their current brand-mark markup. No new components, no new dependencies, no SVG-to-React-component tooling (the codebase has none and doesn't need it for one static mark).

**Tech Stack:** React 19, Tailwind CSS, Playwright (existing suite only — no new tests this plan).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-22-logo-redesign-design.md`.
- Color mapping (exact, from the spec): `#863bff` → `#00B4FF` (silhouette), `#7e14ff` → `#0078D4` (dark blobs), `#ede6ff` → `#F3F6F9` (light blobs), `#47bfff` → `#00B4FF` (accent-pop blobs, reused). The `;fill:color(display-p3 ...)` duplicate declarations are removed entirely (not recolored) so the new hex values render unambiguously.
- The new mark is rendered as `<img src="/favicon.svg" alt="" />` — `alt=""` (decorative), never `alt="ShareFlow"`, because the literal text "ShareFlow" is always rendered immediately beside it in both places it appears.
- `Navbar.jsx`'s `Eye` import and its usage (Preview button) are untouched — only `Layers` is removed.
- No new test files and no new test cases — the spec's Section 3 establishes that existing coverage (the `smoke.spec.js:22` text assertion and the default-view accessibility test) already covers this change with no gaps, the same no-new-test precedent already used for the sidebar nav redesign (`docs/superpowers/plans/2026-06-22-sidebar-nav-redesign.md`).
- Run `npx vitest run` and `npx playwright test` from `client/` for verification (regression-only — no new test names to target).

---

### Task 1: Recolored brand mark wired into Navbar and PreviewToolbar

**Files:**
- Modify: `client/public/favicon.svg`
- Modify: `client/src/components/layout/Navbar.jsx`
- Modify: `client/src/components/preview/PreviewToolbar.jsx`

**Interfaces:**
- Consumes: nothing new from other files.
- Produces: `/favicon.svg` (served as a static asset from `client/public/`, accessible at the absolute URL path `/favicon.svg`) now renders the recolored mark. Both components reference it by that same absolute path string — no shared constant or import, matching how `index.html` already references it (`href="/favicon.svg"`).

- [ ] **Step 1: Replace the contents of `client/public/favicon.svg`**

Overwrite the entire file with:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="46" fill="none" viewBox="0 0 48 46"><path fill="#00B4FF" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" style="fill:#00B4FF;fill-opacity:1"/><mask id="a" width="48" height="46" x="0" y="0" maskUnits="userSpaceOnUse" style="mask-type:alpha"><path fill="#000" d="M25.842 44.938c-.664.844-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.183c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.498 0-3.579-1.842-3.579H1.133c-.92 0-1.456-1.04-.92-1.787L9.91.473c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.578 1.842 3.578h11.377c.943 0 1.473 1.088.89 1.832L25.843 44.94z" style="fill:#000;fill-opacity:1"/></mask><g mask="url(#a)"><g filter="url(#b)"><ellipse cx="5.508" cy="14.704" fill="#F3F6F9" rx="5.508" ry="14.704" style="fill:#F3F6F9;fill-opacity:1" transform="matrix(.00324 1 1 -.00324 -4.47 31.516)"/></g><g filter="url(#c)"><ellipse cx="10.399" cy="29.851" fill="#F3F6F9" rx="10.399" ry="29.851" style="fill:#F3F6F9;fill-opacity:1" transform="matrix(.00324 1 1 -.00324 -39.328 7.883)"/></g><g filter="url(#d)"><ellipse cx="5.508" cy="30.487" fill="#0078D4" rx="5.508" ry="30.487" style="fill:#0078D4;fill-opacity:1" transform="rotate(89.814 -25.913 -14.639)scale(1 -1)"/></g><g filter="url(#e)"><ellipse cx="5.508" cy="30.599" fill="#0078D4" rx="5.508" ry="30.599" style="fill:#0078D4;fill-opacity:1" transform="rotate(89.814 -32.644 -3.334)scale(1 -1)"/></g><g filter="url(#f)"><ellipse cx="5.508" cy="30.599" fill="#0078D4" rx="5.508" ry="30.599" style="fill:#0078D4;fill-opacity:1" transform="matrix(.00324 1 1 -.00324 -34.34 30.47)"/></g><g filter="url(#g)"><ellipse cx="14.072" cy="22.078" fill="#F3F6F9" rx="14.072" ry="22.078" style="fill:#F3F6F9;fill-opacity:1" transform="rotate(93.35 24.506 48.493)scale(-1 1)"/></g><g filter="url(#h)"><ellipse cx="3.47" cy="21.501" fill="#0078D4" rx="3.47" ry="21.501" style="fill:#0078D4;fill-opacity:1" transform="rotate(89.009 28.708 47.59)scale(-1 1)"/></g><g filter="url(#i)"><ellipse cx="3.47" cy="21.501" fill="#0078D4" rx="3.47" ry="21.501" style="fill:#0078D4;fill-opacity:1" transform="rotate(89.009 28.708 47.59)scale(-1 1)"/></g><g filter="url(#j)"><ellipse cx=".387" cy="8.972" fill="#0078D4" rx="4.407" ry="29.108" style="fill:#0078D4;fill-opacity:1" transform="rotate(39.51 .387 8.972)"/></g><g filter="url(#k)"><ellipse cx="47.523" cy="-6.092" fill="#0078D4" rx="4.407" ry="29.108" style="fill:#0078D4;fill-opacity:1" transform="rotate(37.892 47.523 -6.092)"/></g><g filter="url(#l)"><ellipse cx="41.412" cy="6.333" fill="#00B4FF" rx="5.971" ry="9.665" style="fill:#00B4FF;fill-opacity:1" transform="rotate(37.892 41.412 6.333)"/></g><g filter="url(#m)"><ellipse cx="-1.879" cy="38.332" fill="#0078D4" rx="4.407" ry="29.108" style="fill:#0078D4;fill-opacity:1" transform="rotate(37.892 -1.88 38.332)"/></g><g filter="url(#n)"><ellipse cx="-1.879" cy="38.332" fill="#0078D4" rx="4.407" ry="29.108" style="fill:#0078D4;fill-opacity:1" transform="rotate(37.892 -1.88 38.332)"/></g><g filter="url(#o)"><ellipse cx="35.651" cy="29.907" fill="#0078D4" rx="4.407" ry="29.108" style="fill:#0078D4;fill-opacity:1" transform="rotate(37.892 35.651 29.907)"/></g><g filter="url(#p)"><ellipse cx="38.418" cy="32.4" fill="#00B4FF" rx="5.971" ry="15.297" style="fill:#00B4FF;fill-opacity:1" transform="rotate(37.892 38.418 32.4)"/></g></g><defs><filter id="b" width="60.045" height="41.654" x="-19.77" y="16.149" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="7.659"/></filter><filter id="c" width="90.34" height="51.437" x="-54.613" y="-7.533" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="7.659"/></filter><filter id="d" width="79.355" height="29.4" x="-49.64" y="2.03" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="e" width="79.579" height="29.4" x="-45.045" y="20.029" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="f" width="79.579" height="29.4" x="-43.513" y="21.178" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="g" width="74.749" height="58.852" x="15.756" y="-17.901" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="7.659"/></filter><filter id="h" width="61.377" height="25.362" x="23.548" y="2.284" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="i" width="61.377" height="25.362" x="23.548" y="2.284" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="j" width="56.045" height="63.649" x="-27.636" y="-22.853" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="k" width="54.814" height="64.646" x="20.116" y="-38.415" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="l" width="33.541" height="35.313" x="24.641" y="-11.323" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="m" width="54.814" height="64.646" x="-29.286" y="6.009" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="n" width="54.814" height="64.646" x="-29.286" y="6.009" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="o" width="54.814" height="64.646" x="8.244" y="-2.416" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="p" width="39.409" height="43.623" x="18.713" y="10.588" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter></defs></svg>
```

This is the exact same SVG structure as today's `favicon.svg` (same path data, same mask, same 14 filter definitions with their blur/offset values) — only the 4 `fill`/`style="fill:..."` color values changed (`#863bff`→`#00B4FF`, `#7e14ff`→`#0078D4`, `#ede6ff`→`#F3F6F9`, `#47bfff`→`#00B4FF`), and every `;fill:color(display-p3 ...)` duplicate declaration removed.

- [ ] **Step 2: Update `client/src/components/layout/Navbar.jsx`**

Change line 1 from:

```jsx
import { Layers, Eye } from 'lucide-react'
```

to:

```jsx
import { Eye } from 'lucide-react'
```

Change lines 17-19 from:

```jsx
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-electric">
          <Layers size={18} className="text-navy" />
        </div>
```

to:

```jsx
        <img src="/favicon.svg" alt="" className="w-8 h-8" />
```

- [ ] **Step 3: Update `client/src/components/preview/PreviewToolbar.jsx`**

Change line 16 from:

```jsx
        <span className="text-blue-electric font-bold text-sm">ShareFlow</span>
```

to:

```jsx
        <img src="/favicon.svg" alt="" className="w-5 h-5" />
        <span className="text-blue-electric font-bold text-sm">ShareFlow</span>
```

- [ ] **Step 4: Run the full unit and e2e suites to confirm no regressions**

Run:
```bash
cd client && npx vitest run
npx playwright test
```

Expected: all pass, with the exact same counts as before this change (no test was added or removed). In particular, confirm `smoke.spec.js`'s `getByText('ShareFlow', { exact: true })` assertion (line 22) still passes — the text node is unchanged, only the sibling icon/image changed — and confirm `'default editor view has no in-scope accessibility violations'` still passes with the new `<img alt="">` in the navbar.

- [ ] **Step 5: Manually verify the mark renders correctly**

Run the app's dev server (see this project's own run/dev instructions) and open the editor. Confirm: (a) the navbar shows the blue recolored mark instead of the old `Layers` icon, at the same size/position; (b) the browser tab favicon is now also blue, not purple; (c) opening Preview mode shows the same mark beside "ShareFlow" in the preview toolbar. If anything renders as a broken image icon, re-check the SVG content from Step 1 was written exactly as given (this SVG is malformed-sensitive — it relies on the `mask`/`filter` definitions matching their `url(#id)` references).

- [ ] **Step 6: Commit**

```bash
git add client/public/favicon.svg client/src/components/layout/Navbar.jsx client/src/components/preview/PreviewToolbar.jsx
git commit -m "feat: recolor ShareFlow's brand mark to blue and replace the generic Layers icon"
```

---

## Final check

After Task 1, run both suites once more from `client/`:

```bash
npx vitest run
npx playwright test
```

Expected: all Vitest tests pass (unchanged count from before this plan), all Playwright tests pass (unchanged count from before this plan — this change adds no new test).
