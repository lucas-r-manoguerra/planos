# Tasks: Walls & 3D — Free-form Walls, Wall-grounded Openings, Isometric View

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,050 total (S1 ~650 · S2 ~700 · S3 ~450 · S4 ~250) |
| Review budget (config.yaml) | 800 lines per slice |
| 400-line budget risk | Low — every slice < 800 (config budget) |
| Chained PRs recommended | Yes |
| Suggested split | 4 chained PRs S1→S2→S3→S4 on feature branch |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain (cached in config.yaml) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Low

> Decision needed = confirm (a) vitest adoption — **APPROVED** (installed, suite live in `tests/`) — and (b) the S4 subtype list (task S4.2 below). Chain slicing is resolved by auto-chain: no per-PR approval.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| S1 | Wall entity + materializer + v3→v4 migration + WallLayer | PR 1 (base=tracker) | `bunx tsx scripts/walls-v4.ts && bun lint && bunx tsc --noEmit && bun build` | `bun dev`: v3 project loads remapped; legacy key intact | Revert S1; data re-migrates on reload |
| S2 | Wall tool/snap/edit + opening re-anchor + room lifecycle | PR 2 (base=PR 1) | `bunx tsx scripts/wall-snap.ts && bun lint && bunx tsc --noEmit && bun build` | `bun dev`: draw/snap/undo; cascade; room removal | Revert S2 |
| S3 | Isometric projection + ViewMode + IsometricLayer | PR 3 (base=PR 2) | `bunx tsx scripts/isometric.ts && bun lint && bunx tsc --noEmit && bun build` | `bun dev`: iso toggle round-trip; pan/zoom no recompute | Revert S3; ViewMode defaults 2D |
| S4 | Glyph polish + cheap subtypes | PR 4 (base=PR 3) | `bun lint && bunx tsc --noEmit && bun build` | `bun dev`: glyph states + interactions | Revert S4 |

## S1 — Wall Entity + Persistence (PR 1)

- [x] S1.1 `types/plan.ts`: add `Wall` (id, floorId, x1/y1/x2/y2 cm, thickness default 10, height?, roomId?); `ViewMode = "2d"\|"isometric"`; `activeTool` union + `"wall"`; re-doc `Fixture.wallId` = wall id (wall-drawing-1, fixtures-management-4)
- [x] S1.2 `lib/walls.ts`: move `findMergedWalls`/`isCovered` from WallLayer; add `wallKey`, `segmentsCoincide`, `materializeFloorWalls` (deterministic, merged-aware, first-room-wins, stable ids by roomId+coords); replace room-based `cascadeOpenings` with wall-based `reanchorOpenings(fixtures, walls)` (design D5/D7; editor-rendering-3)
- [x] S1.3 `lib/migrate.ts`: `migrateProjectData` v3→v4 — idempotent guard `version >= 4`; v2→v3 first; materialize per floor/room-pair; remap openings room→wall (nearest containing span, clamp offset; no wall → keep fixture, clear wallId); untouched unrelated fields (project-persistence-5)
- [x] S1.4 `lib/storage.ts`: `CURRENT_VERSION = 4`; `walls` in `ProjectData` + `isProjectDataShape` guard; save/load/import carry walls; legacy key `planos-project` untouched (project-persistence-4/5)
- [x] S1.5 Create `stores/walls.store.ts`: flat `walls: Wall[]` with `floorId`; `getWallsForFloor`; actions add/move/resize/remove/regenerateFloorWalls/reanchorOpenings; `addWall` rejects zero-length; recordHistory incl. walls (design D1/D3; wall-drawing-1/2/5)
- [x] S1.6 `stores/history.store.ts`: `HistoryEntry.walls?`; `captureSnapshot` includes walls (wall-drawing-5)
- [x] S1.7 `stores/{floors,rooms}.store.ts`: recordHistory +walls; `setRoomEnclosed`/`setRoomWallWidth`/geometry actions call `regenerateFloorWalls` (one undo step); `addRoom` materializes walls; `removeFloor` clears floor walls (editor-rendering-3; design D3/D4)
- [x] S1.8 `stores/fixtures.store.ts`: recordHistory +walls (fixtures-management-4)
- [x] S1.9 `components/canvas/WallLayer.tsx`: render wall entities only — no room-derived segments, drop local `findMergedWalls`/`isCovered` (editor-rendering-1)
- [x] S1.10 `hooks/useEditorLifecycle.ts`: `collectEditorState`/`applyProjectData` carry walls; `hooks/useEditorShortcuts.ts` `applyHistoryEntry` restores walls (project-persistence-4, wall-drawing-5)
- [x] S1.11 `scripts/walls-v4.ts` (bunx tsx): materialize merged/solid/gap + winner rule; remap offset-clamp/gap-anchor/no-wall detach; idempotency; export/import round-trip (project-persistence-5)
- [x] S1.12 Verify: full command chain + `bun dev` — v3 project loads remapped, legacy key intact; commit `feat(walls): wall entities, materializer, v3→v4 migration`

## S2 — Wall Tool + Openings (PR 2)

- [x] S2.1 Create `lib/wall-snap.ts`: `snapWallPoint(p, rooms, walls, SNAP_THRESHOLD)` (room corners + wall endpoints, corner priority), `findNearestWallEntity` (wall-based; replaces utils `findNearestWall`) (wall-drawing-3, fixtures-management-4)
- [x] S2.2 `lib/utils.ts`: remove `findNearestWall` (moved to wall-snap) — explicit no-op note: rest of file untouched
- [x] S2.3 `stores/walls.store.ts` + `stores/selection.store.ts`: wall selection; move/resize with snap; keyboard Delete resolution room→fixture→wall (wall-drawing-4)
- [x] S2.4 `components/canvas/WallLayer.tsx`: wall draw preview (drag line) + endpoint handles for resize (wall-drawing-3/4)
- [x] S2.5 `components/canvas/PlanCanvas.tsx`: wall tool wiring — drag/snap/Escape cancel; opening placement via `findNearestWallEntity` requiring valid wall target; `wallId` = wall id (wall-drawing-3, fixtures-management-4)
- [x] S2.6 `lib/walls.ts` + `stores/fixtures.store.ts`: after any wall mutation, recompute anchored openings via `reanchorOpenings` (x/y/rotation from wall+offset); placement without wall target rejected (fixtures-management-4, design D7)
- [x] S2.7 `stores/rooms.store.ts` (floors): `removeRoom` cascades — remove room-derived walls, openings drop or re-anchor to coincident wall per wall rules; `duplicateRoom` materializes copy walls (fixtures-management-3)
- [x] S2.8 `hooks/useEditorShortcuts.ts`: wall ops in keyboard delete + `applyHistoryEntry` walls (wall-drawing-4/5)
- [x] S2.9 `scripts/wall-snap.ts` (bunx tsx): corner vs endpoint priority, threshold, nearest-wall containment/clamp (wall-drawing-3)
- [x] S2.10 Verify: full command chain + `bun dev` — draw/snap/Escape, move-resize-delete, opening re-anchor on wall move, room-removal cascade, undo; commit `feat(walls): draw/edit tool, snap, wall-grounded openings` (chain + dev compile verified in S2; interactive browser validation + commit recorded then — checkbox was stale, marked [x] during S4)

## S3 — Isometric View (PR 3)

- [x] S3.1 Create `lib/isometric.ts`: `projectToIsometric(x, y, z)` (2:1 dimetric), `isoWallFaces(wall, height)` — pure, no stores/components (isometric-view-2/4)
- [x] S3.2 `stores/canvas.store.ts`: `viewMode` default `"2d"` + `setViewMode` (display state, rule 05) (isometric-view-1)
- [x] S3.3 Create `components/canvas/IsometricLayer.tsx`: extruded walls (z = `SunSettings.floorHeight`, default 280) + anchored openings at fixed camera; fine selectors + memo; projection memoized, never recomputed on pan/zoom (isometric-view-3, rule 09)
- [x] S3.4 `components/canvas/PlanCanvas.tsx`: iso layer switch; `components/toolbar/Toolbar.tsx`: wall tool button + ViewMode toggle (isometric-view-1/3)
- [x] S3.5 `scripts/isometric.ts` (bunx tsx): determinism, known-points, `isoWallFaces` extrusion at 280 (isometric-view-2/3)
- [x] S3.6 Verify: full command chain + `bun dev` — toggle round-trip lossless, pan/zoom no recompute, 2D unchanged; commit `feat(isometric): pure projection, ViewMode, isometric layer`

## S4 — Openings Glyphs + Subtypes (PR 4)

- [x] S4.1 `components/canvas/FixtureLayer.tsx`: glyph states — open door (hinge+leaf+dashed arc), closed leaf, sliding track; window pane/sliding/closed; preserve selection/drag/rotation/keyboard-delete (openings-visualization-1) — drawing delegada a `components/canvas/glyphs/{DoorGlyph,WindowGlyph,StairGlyph,FixedGlyphGroup}.tsx` + tema `glyph-theme.ts`; hover solo en aberturas; indicador de anclaje a pared al seleccionar; arco corregido (sigue la punta de la hoja; lib/openings.ts)
- [x] S4.2 **Task decision (approved)**: add 3 cheap subtypes reusing existing props — door `puerta-doble` (width 160, double mirrored leaf+arc), windows `ventana-fija` (props `isOpen: false` → closed-pane path) and `ventana-oscilobatiente` (batiente pane at openingAngle 45); no new rendering machinery (openings-visualization-2)
- [x] S4.3 `lib/fixtures-catalog.ts`: catalog entries for the 3 subtypes (dimensions/color drive glyph) (openings-visualization-2) — puerta-doble 160×10 #7c5a33 props {isOpen,openingAngle:90,openingSide:"right",double}; ventana-fija 120×10 #d8eef5 props {isOpen:false}; ventana-oscilobatiente 100×10 #6fa8c8 props {isOpen,openingAngle:45,openingSide:"right"}
- [x] S4.4 `types/plan.ts`: extend `DoorSubtype`/`WindowSubtype` unions — type + catalog + renderer in one PR (rule 03) (openings-visualization-2) — DoorSubtype += `puerta-doble`; WindowSubtype += `ventana-fija | ventana-oscilobatiente`
- [x] S4.5 Verify: full command chain + `bun dev` — each glyph state visible; new subtypes render via existing path; commit `feat(openings): glyph states + cheap door/window subtypes` — lint/tsc/build/tests verdes (106 tests, 23 nuevos en tests/openings.test.ts); dev smoke 200 en / y /editor; interacción visual en navegador pendiente de validación humana

## Dependency Notes

- S1.3→S1.1; S1.4→S1.3; S1.7→S1.5; S2.3→S1.5; S2.5→S2.1/S2.4; S2.7→S1.7; S3.2→S1.1; S3.3→S2.5/S3.1; S4.2→S2.6. Slices sequential (feature-branch-chain: PR n base = PR n−1 branch; if a child diff shows prior slices, retarget/rebase).
- Threat matrix rows all N/A (no shell/VCS/MDX-exec boundary) — no RED tests required.
- vitest **APPROVED and installed** (rule 07.3): `vitest@4.1.10` as devDependency, `bun test` script, `tests/{walls,migrate,storage}.test.ts`; scripts `bunx tsx scripts/*.ts` remain as quick smoke checks (rule 08).
- Work-unit commits per slice (skill work-unit-commits): test+impl+docs in one commit; docs/UI Spanish neutral, code/commits English (rule INDEX.5).
