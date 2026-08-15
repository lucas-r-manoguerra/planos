# Design: Preplanning Web — Product Front Door & Editor Hardening

## Technical Approach

11 specs in 4 chained PRs, each green on lint/tsc/build: **S1** lint + dark mode + layers; **S2** fixtures per floor, gesture history, enclosed, export; **S3** landing, projects, templates, feedback; **S4** docs + a11y + PropsPanel split. Storage v-bump + `floorId` migration land in S2 before S3 persistence. No new deps.

## Architecture Decisions

| # | Decision | Choice & rationale |
|---|---|---|
| 1 | Routing | Flat routes: `/` RSC landing, `/editor` client editor; effects → `useEditorLifecycle` + `useEditorShortcuts`. Autosave preserves session |
| 2 | Layer split | One Konva `Layer` per domain (Grid→SunArc), all memo'd, prop-less, fine selectors → pan/zoom re-renders only PlanCanvas. Wall-preview → FixtureLayer. Grid draws viewport-visible lines only |
| 3 | Fixtures/floor | Flat array + `Fixture.floorId`; add stamps active floor; `getFixturesForFloor` filters. Backfill on load/import. `removeRoom` → `cascadeOpenings` (opening dies unless adjacent room shares its wall; shared walls reassign `wallId`). Delete resolves `selectedId` room-first |
| 4 | History | `captureSnapshot()` (adds fixtures — fixes undo-without-fixtures). `beginGesture()` pushes one snapshot, suppresses pushes; `endGesture()` resumes → one step/gesture; MAX 50 |
| 5 | Enclosed | `getRoomWallSegments`; `enclosed=false` → two Lines per side with central gap; merged walls solid |
| 6 | Persistence | v3: index `planos:projects:v1` + per-project keys; CRUD + import/export. Legacy key migrates as "Mi Plano" when no index. Import: versioned JSON, shape-guard + migrate; invalid → toast |
| 7 | Export | `exportPlanPNG`: `stage.toDataURL({pixelRatio})` (1x/2x/4x) + `drawCompassIntoCanvas` from shared `lib/compass.ts` (no canvas-capture). Compass hidden (sun off) → skipped |
| 8 | Templates | `TemplatePreviewDialog` (modal): room list + grid preview from `applyTemplate()` math, no store writes; Confirm → `applyFloorTemplate` (one undo). Floor fixtures untouched — documented |
| 9 | A11y | Native `<select>`, `ui/switch.tsx` (`role=switch`); arrows move 10cm / Shift resize 10cm, each a gesture; zoom shortcuts (clamped, input-guarded); PropertiesPanel modal (focus trap, return focus); ContextMenu menu + arrows + Escape; skip link + `main` + `aria-current`; `:focus-visible` |
| 10 | Docs | Server `getDocHeadings` + `getDocNeighbors`; inline rehype plugin adds ids (no dep); `lib/docs-search.ts` pure index; `seguridad-obra`→`seguridad`, assign 11 docs; hljs colors hand-written |
| 11 | Feedback | Hand-rolled: `toast.store.ts` + `Toaster` (aria-live; info auto-dismiss, error persists), `ErrorBoundary`, `FirstRunHint` (flag), empty states |
| 12 | PropsPanel | Split 776ln → modal shell routing by `panel.store` type to `room/fixture/opening/stair-editor.tsx` over shared `dialog-shell` |

## Data Flow

```
Landing (RSC) ─CTA─▶ /editor ─autosave─▶ storage v3 (index + projects)
actions ─▶ stores ─captureSnapshot─▶ history (begin/endGesture)
memo layers ◀─ fine selectors ◀─ stores ◀── gestures
Export: Stage.toDataURL(pixelRatio) + compass draw ─▶ PNG
```

## File Changes

| File | Action | Slice |
|---|---|---|
| `components/canvas/*` (9 files) | Modify | S1+S2 layers, grid, enclosed, floorId, gesture, lint |
| `app/globals.css`, `ThemeProvider.tsx`, `ThemeToggle.tsx` | Modify | S1 dark variant, toggle, focus-visible |
| `types/plan.ts`, `stores/{history,fixtures,floors,rooms}.store.ts` | Modify | S2 floorId, gesture, cascade, snapshot |
| `lib/{snapshot,walls,migrate,compass,export}.ts` | Create | S2 pure helpers |
| `panel/ExportDialog.tsx`, `toolbar/Toolbar.tsx` | Create/Modify | S2 |
| `app/page.tsx` (landing), `app/editor/page.tsx`, `hooks/useEditor{Lifecycle,Shortcuts}.ts`, `landing/LandingPage.tsx` | Modify/Create | S3 |
| `lib/storage.ts`, `sidebar/ProjectSection.tsx`, `sidebar/TemplateList.tsx`, `panel/TemplatePreviewDialog.tsx` | Modify/Create | S3 |
| `stores/toast.store.ts`, `components/feedback/*`, `app/layout.tsx` | Create/Modify | S3 |
| `lib/docs.ts`, `lib/docs-search.ts`, `components/docs/*`, `ui/{select,switch}.tsx`, `ContextMenu.tsx`, `panel/PropertiesPanel.tsx` + editors + `dialog-shell.tsx` | Modify/Create | S4 |
| `content/docs/*.mdx` (12) | Modify | S4 categories |

## Interfaces / Contracts

```ts
captureSnapshot(): HistoryEntry               // { floors; activeFloorId; terrain; fixtures }
beginGesture(); endGesture();                 // history.store
planos:projects:v1 → { projects: {id,name,savedAt}[], activeProjectId }
exportPlanPNG(stage, { scale: 1|2|4, compassAngle: number|null })
cascadeOpenings(removed, remaining, fixtures): Fixture[]
getRoomWallSegments(room, merged, enclosed): WallSegment[]
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | migrate, cascade, walls, search scoring, import guard, grid range | `bunx tsx` scripts (rule 08) |
| Integration | gesture→1 entry, floor filter, template undo, import/export round-trip | `bun dev` flows |
| Manual | layer regressions, dark grid, PNG compass/scale, keyboard, focus trap | Browser (08.4) |

## Threat Matrix

| Boundary | Applicability | Design response | RED tests |
|---|---|---|---|
| MDX docs | N/A — rendered via compileMDX, never executed | — | — |
| Git/commit/push/PR | N/A — no shell/VCS/PR automation | — | — |

Routing is App Router structure only — no shell/subprocess/VCS/PR boundary.

## Migration / Rollout

S2 bumps `CURRENT_VERSION`→3 + fixture backfill (schema precedes consumers). S3 adds index/project keys; legacy key migrates when no index (kept per spec 4). Import/export reuse the migrate pipeline. Slice = one chained PR; rollback = revert slice; dark rollback = drop `@custom-variant`.

## Open Questions

- [ ] Fixture arrow-resize semantics (width-only vs proportional) — default move-side grow.
- [ ] Template apply keeps floor fixtures — keep (documented) or clear?
