# Tasks: Preplanning Web — Product Front Door & Editor Hardening

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~5,300–6,200 (S1 ~1,200 · S2 ~1,250 · S3 ~1,500 · S4 ~1,750) |
| 400-line budget risk | High — every slice exceeds project budget (800, `config.yaml`) |
| Chained PRs recommended | Yes |
| Suggested split | 4 chained PRs S1→S2→S3→S4 on feature branch |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain (cached in config.yaml) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Foundations: lint, dark, layers, grid | PR 1 (base=tracker) | `bunx tsx scripts/grid-range.ts && bun lint && bunx tsc --noEmit && bun build` | `bun dev`: dark toggle re-themes editor/docs/grid; pan/zoom skips shadow work | revert S1; dark = drop `@custom-variant` |
| 2 | Correctness: floorId, gesture undo, enclosed, export | PR 2 (base=PR 1) | `bunx tsx scripts/migrate.ts && bunx tsx scripts/cascade.ts && bunx tsx scripts/walls.ts` | `bun dev`: floor switch filters; drag=1 undo; enclosed; PNG 1x/2x/4x | revert S2; v3 backfill keeps legacy data |
| 3 | UX: landing, projects, templates, feedback | PR 3 (base=PR 2) | `bunx tsx scripts/storage-v3.ts && bunx tsx scripts/import-guard.ts` | `bun dev`: /→/editor; CRUD+rename; import/export; template undo; toasts | revert S3; legacy key kept until import verified |
| 4 | Docs + a11y + PropsPanel split | PR 4 (base=PR 3) | `bunx tsx scripts/docs-search.ts && bun lint` | `bun dev`: TOC/search, keyboard, focus trap, skip link; axe no critical | revert S4; categories revert with CATEGORY_ORDER |

## S1 — Foundations (PR 1)

- [x] S1.1 Fix all ESLint errors in `src/**`. ✓ `bun lint` exit 0; no `any` fixes (02/08).
- [x] S1.2 Add `@custom-variant dark` to `app/globals.css`; make `ThemeProvider.tsx`/`ThemeToggle.tsx` toggle+persist `.dark`, default light (drop OS auto-detect) (dark-1/2). ✓ dark survives reload.
- [x] S1.3 Dark-safe canvas colors from theme: `canvas/{GridLayer,TerrainLayer,RoomLayer,WallLayer,FixtureLayer}.tsx` (dark-3). ✓ grid+shapes visible in dark.
- [x] S1.4 Per-domain Konva layers, memoized, fine selectors: `canvas/*` + `PlanCanvas.tsx` (render-1/2). ✓ pan/zoom skips shadow recompute.
- [x] S1.5 Viewport-only grid: new `lib/grid.ts` + rewrite `canvas/GridLayer.tsx` + `scripts/grid-range.ts`. ✓ script passes; fluid zoom-out.

## S2 — Correctness (PR 2)

- [x] S2.1 `Fixture.floorId` in `types/plan.ts`; `stores/fixtures.store.ts` stamps active floor + `getFixturesForFloor`; `canvas/FixtureLayer.tsx` filters (fixtures-1). ✓ floor switch filters.
- [x] S2.2 Storage v3: new `lib/migrate.ts`; `lib/storage.ts` CURRENT_VERSION→3; `scripts/migrate.ts` backfill (fixtures-1 legacy). ✓ legacy fixture → first floor.
- [x] S2.3 Keyboard delete: new `hooks/useEditorShortcuts.ts` + `stores/selection.store.ts` (fixtures-2). ✓ Backspace removes, 1 undo; input no-op.
- [x] S2.4 Gesture history: `stores/history.store.ts` captureSnapshot/beginGesture/endGesture; wire drag (`FixtureLayer.tsx`) + compass (`NorthArrowLayer.tsx`) (history-1/2/3). ✓ drag = 1 entry.
- [x] S2.5 Cascade openings: `cascadeOpenings` in new `lib/walls.ts`; `stores/rooms.store.ts` removeRoom; `scripts/cascade.ts` (fixtures-3). ✓ shared-wall opening kept.
- [x] S2.6 Enclosed: `getRoomWallSegments` in `lib/walls.ts`; `canvas/WallLayer.tsx` open gap; toggle in `panel/PropertiesPanel.tsx` (render-3); `scripts/walls.ts`. ✓ toggle visibly changes.
- [x] S2.7 PNG export: new `lib/compass.ts` + `lib/export.ts` + `panel/ExportDialog.tsx`; `toolbar/Toolbar.tsx` entry (export-1/2/3). ✓ compass 1x/2x/4x; hidden→excluded.

## S3 — Product UX (PR 3)

- [x] S3.1 Landing RSC at `/` (`app/page.tsx` + new `components/landing/LandingPage.tsx`); editor → new `app/editor/page.tsx` (landing-1/2/3). ✓ CTA→/editor; deep link ok.
- [x] S3.2 Autosave: new `hooks/useEditorLifecycle.ts` (landing-3). ✓ reload restores.
- [x] S3.3 Projects v3: `lib/storage.ts` index+per-project keys; `lib/migrate.ts` legacy→"Mi Plano" (key kept); new `sidebar/ProjectSection.tsx`; `scripts/{storage-v3,import-guard}.ts` (persistence-1..4). ✓ round-trip; invalid rejected.
- [x] S3.4 Template confirm+preview: new `panel/TemplatePreviewDialog.tsx`; `sidebar/TemplateList.tsx`; `lib/templates.ts` (templates-1/2). ✓ cancel untouched; 1 undo; fixtures kept.
- [x] S3.5 Feedback: new `stores/toast.store.ts` + `components/feedback/{Toaster,ErrorBoundary,FirstRunHint}.tsx` + empty states; `app/layout.tsx` (feedback-1..4). ✓ error persists; hint once.

## S4 — Docs + A11y + PropsPanel (PR 4)

- [x] S4.1 TOC + prev/next: `lib/docs.ts` getDocHeadings/getDocNeighbors + rehype ids; new `components/docs/DocToc.tsx`; `app/docs/[slug]/page.tsx` (docs-1). ✓ boundary hides missing link.
- [x] S4.2 Body search: new `lib/docs-search.ts` + `components/docs/DocsSearch.tsx` + `scripts/docs-search.ts` (docs-2). ✓ body term; named clear.
- [x] S4.3 Categories: `gestion`→`seguridad` + assign 11 uncategorized in `content/docs/*.mdx`; `lib/docs.ts` CATEGORY_ORDER (docs-3/4). ✓ seguridad-obra visible.
- [x] S4.4 Theme-adaptive code colors: `app/globals.css` + `components/docs/MDXContent.tsx` (docs-5). ✓ legible dark. ✓ FIX: rehypeHighlight passed as `[plugin, opts]` tuple — pre-instantiated `rehypeHighlight({detect:true})` crashed every MDX compile (`commit 5d12998`).
- [x] S4.5 Controls: native `ui/select.tsx`; new `ui/switch.tsx` (role=switch); wire `sidebar/SunSettings.tsx`, `FloorList.tsx`, `RoomList.tsx`, `DocsSearch.tsx` (a11y-4). ✓ aria-checked; icon buttons named.
- [x] S4.6 Keyboard canvas + zoom: extend `hooks/useEditorShortcuts.ts`; `stores/{selection,canvas}.store.ts` (a11y-1/2). ✓ arrows 10cm/Shift resize each a gesture; input-guarded zoom.
- [x] S4.7 PropsPanel split: new `panel/dialog-shell.tsx` + `{room,fixture,opening,stair}-editor.tsx`; route via `stores/panel.store.ts` (design 12). ✓ editors render via shell. Note: sub-split if diff >400.
- [x] S4.8 Modal/menu a11y: `panel/PropertiesPanel.tsx` modal (focus trap/Escape/return); `context-menu/ContextMenu.tsx` menu keys; skip link+main in `app/layout.tsx`; `DocsSidebar.tsx` aria-current (a11y-3/5). ✓ focus cycles; Esc returns.

## Dependency Notes

- S1.3→S1.2; S1.5→S1.4; S2.2→S2.1; S2.4→S2.1/S2.3; S2.5→S2.1; S3.2→S3.1; S3.3→S2.2; S4.8→S4.7; S4.6→S2.3. Slices are sequential (S2 needs S1 layers; S3 needs S2 migrate; S4 needs S2/S3 hooks + S3 layout).
- Test-first: unit scripts (`bunx tsx scripts/*.ts`) accompany each pure-lib task (rule 08); manual browser validation per slice (04/08/09). Threat matrix rows are all N/A (MDX rendered via compileMDX; no shell/VCS boundary) — no RED tests required.
