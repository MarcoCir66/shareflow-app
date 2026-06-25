# Phase 6, sub-project 5 — Mandatory Read / Compliance — design spec

**Date:** 2026-06-25
**Source:** Origami Connect's "Mandatory Read" feature gap, identified during Phase 6's original gap analysis. The last of the 5 Phase 6 sub-projects; previously blocked pending a product-strategy decision on architecture.

## Architecture decision

ShareFlow has no ongoing runtime relationship with a published SharePoint site after deploy (no SPFx, no webhook, no Graph subscription — provisioning is fire-and-forget), no per-user identity wired anywhere downstream of `authMiddleware.js` (`req.user` is extracted but unused), and no persistence beyond a single SQLite `jobs` table for provisioning state. A feature that *really* tracks which individual employee read which content on the live site would require a new SPFx web part (or equivalent) embedded in the published site, a new server API, and real per-user persistence — a different technology stack and a much larger project than anything else in Phase 6.

This sub-project instead follows the same convention as every other ShareFlow feature, including the Analytics dashboard (sub-project 4): **mock data, editor-only, zero new backend infrastructure.** The one piece of state that *is* real is which blocks the author has actually marked as mandatory — that lives in the existing configurator state and is genuinely scanned, not faked. Only the *completion percentage* (who has actually read it) is mocked, since there is no real reader population to measure.

## Section 1 — Data model

`mandatoryRead: false` is added to `defaultProps`, and `'mandatoryRead'` to `configurableProps`, for all 49 blocks in `blockCatalog.js` — the same generic treatment as the existing `visible` toggle, available on every block regardless of category. No new reducer action is needed: `UPDATE_WIDGET_PROP` already handles arbitrary `{key, value}` pairs against `widget.props`, so the properties-panel toggle and reducer wiring are 100% reused.

A new pure helper, `collectMandatoryBlocks(pages)`, walks `pages → sections → columns → widgets` (accordion panels are stored under the same `section.columns` field as grid columns, so no special-casing is needed) and returns every widget with `props.mandatoryRead === true` as `{instanceId, blockId, pageId, pageTitle}`. This is the only place that needs to know the real page/section/column shape; both the properties panel (for consistency) and the Compliance dashboard (Section 3) consume its output.

## Section 2 — Preview banner

A new isolated component, `MandatoryReadBanner.jsx`, renders nothing when `widget.props.mandatoryRead !== true`. When `true`, it shows a banner ("Lettura obbligatoria") with a checkbox/button ("Ho letto e compreso") backed by local component state — no dispatch, no persistence, resets on every reload. This is intentional: the mock demonstrates the *concept*, not a real acknowledgment record.

It mounts in `CanvasColumn.jsx`'s `readOnly` branch (used only by `PreviewApp.jsx`), wrapping each `CanvasBlockPreview`:

```jsx
<div key={widget.instanceId} className="mb-3">
  <MandatoryReadBanner widget={widget} />
  <CanvasBlockPreview block={block} width={widthHint} contentItems={widget.props.contentItems ?? []} />
</div>
```

This touches neither `CanvasBlockPreview.jsx` (none of its block-type branches change) nor `CanvasBlock.jsx` (the editor canvas only exposes the toggle via the properties panel — the banner is preview-only, since showing it while editing would be redundant with the toggle itself).

## Section 3 — Compliance dashboard (4th Analytics tab)

A 4th tab, "Compliance", is added to the existing `AnalyticsView.jsx` tab bar (Overview / Siti / Contenuti / **Compliance**). Unlike the other 3 tabs, Compliance does not read `analyticsMockData.js` — it reads real configurator state. `AnalyticsView` calls `useConfigurator()` (already called by the sibling `AppInner`, same provider tree, no new wiring needed) to get `state.pages`, and passes them to a new `AnalyticsCompliance.jsx`.

**No fake "site" or "audience" breakdown.** The 12 mock sites in `analyticsMockData.js` are fixture flavor text for the Analytics dashboards and have no relationship to the pages a ShareFlow user actually configures in a given project. Compliance instead breaks data down by real page titles — the only real dimension available.

**Completion percentage:** a new pure helper, `hashToCompletionPercent(instanceId)`, in `analyticsCompliance.js` — a deterministic string hash (no `Math.random`) mapped into a 40–95% range (avoiding suspicious-looking 0% or 100% values). The percentage is stable for the lifetime of a widget instance and changes only if the block is removed and re-added (new `instanceId`) — acceptable for a mock.

**Tab content:**
- 3 KPI cards: "Contenuti obbligatori" (count of marked blocks), "Completamento medio" (average %), "In ritardo" (count with completion < 50%).
- A `RankedTable` (reused from sub-project 4) listing every marked block — columns: Pagina, Blocco, Completamento % — sorted ascending by completion (least-compliant first).
- A horizontal Recharts bar chart of average completion % per page (real dimension, not fixture data).
- **Explicit empty state** when zero blocks anywhere have `mandatoryRead: true`: a message ("Nessun contenuto marcato come lettura obbligatoria") instead of empty charts/tables.

**Filter bar:** the shared period selector + comparison toggle (`AnalyticsFilterBar.jsx`) is hidden when the Compliance tab is active — completion percentage isn't scaled by period, and showing an inert filter would be decorative UI, which this project explicitly avoids (see sub-project 4's "filters must be real" lesson).

## Section 4 — i18n, testing, out of scope

**i18n:** new keys in all 4 locale files (it/en/fr/de):
- `canvas.*`: `mandatoryRead` (properties-panel toggle label), preview banner text ("Lettura obbligatoria", "Ho letto e compreso").
- `analytics.*`: Compliance tab title, 3 KPI labels, table column headers, empty-state message — roughly 10 new keys.

**Testing:**
- Vitest: `collectMandatoryBlocks` (walks pages/sections/columns/widgets, ignores widgets without `mandatoryRead`, covers both grid and accordion sections) and `hashToCompletionPercent` (deterministic, always within 40–95).
- Playwright e2e (`smoke.spec.js`): mark a block as mandatory-read via the properties panel → open Anteprima, verify the banner and checkbox render → check it → open Analytics → Compliance tab → verify the block appears in the ranked table with a plausible percentage. A separate test verifies the empty state when no block is marked.
- Accessibility (axe-core) on the Compliance tab, matching the existing per-screen convention from sub-project 4.

**Out of scope (v1):**
- Any real per-user tracking, persistence, or SPFx/webhook integration on the published site (see Architecture decision).
- Deadlines, reminders, or escalation rules for unread mandatory content.
- Distinguishing "read" from "understood" (Origami's actual feature has separate states) — a single boolean acknowledgment is enough for this mock.
- Exportable/printable compliance reports.
- Role-based access control for who can mark content mandatory or view the Compliance tab — ShareFlow has no permission system today (same known gap noted in sub-project 4's spec).
- Any fake per-site/audience breakdown of completion data (see Section 3).
