# Design: Walls & 3D — Free-form Walls, Wall-grounded Openings, Isometric View

## Technical Approach

Full-entity materialization (proposal default): walls become first-class `Wall` entities stored per floor, the single source of truth for wall geometry. Room rects stay the source for room fill; `Room.wallWidth`/`enclosed` are **materialization parameters**, not render inputs. Migration v3→v4 materializes room-derived walls and remaps `Fixture.wallId` room→wall deterministically. Isometric view is a pure `projectToIsometric` + a dedicated `IsometricLayer` at a fixed camera; 2D rendering untouched. Delivery: 4 chained PRs (auto_chain, 800-line budget, feature-branch-chain), each green on lint/tsc/build + manual canvas validation. No new dependencies; vitest proposed, not installed.

## Architecture Decisions

| # | Decision | Options | Tradeoff | Choice |
|---|---|---|---|---|
| 1 | Walls store shape | Dedicated `walls.store.ts` vs walls inside floors store | Floors store is already 489 lines (rule 01); walls span rooms (merged walls have 2 owners) and free-form walls have none — room-owned walls can't express either. Flat floor-scoped array mirrors fixtures.store exactly (rule 05). | **New `src/stores/walls.store.ts`**: flat `walls: Wall[]`, each with `floorId`; `getWallsForFloor()` filter |
| 2 | Wall provenance | `roomId?: string` on Wall vs source enum vs none | Regeneration (`enclosed`/`wallWidth`), room-removal cascade and move re-materialization must identify room-derived walls; free-form walls need `roomId: undefined`. Enum adds noise. | **Optional `roomId`** — presence = room-derived; winner of a merged span owns it |
| 3 | `enclosed`/`wallWidth` trigger | Store action regenerating entities vs computed reconciliation at render | Reconciliation = second render path (proposal risk, spec editor-rendering-3 forbids deriving at render). Store action keeps ONE path: entities are truth, regeneration is a discrete mutation. | **Store action**: `regenerateFloorWalls(floorId)` called from `setRoomEnclosed`/`setRoomWallWidth`/geometry actions; one undo step |
| 4 | Room↔wall lifecycle | Full-floor regeneration vs per-room | Per-room misses merged-wall neighbors (moving room A changes shared wall B). Floors have few rooms; full-floor regen is deterministic, simple, keeps stable ids by canonical key. | **Regenerate active floor on any room geometry/settings change**; keep id when canonical key `roomId+coords` unchanged, else new id |
| 5 | Migration remap winner | First-room-in-floor-order owns coincident span vs last vs arbitrary | Determinism required (pure migrate, testable). Merged walls are precomputed per pair (i<j) with owner = first room; room sides fully covered by a merged wall are skipped. | **First room in floor order wins**; dedupe via `segmentsCoincide`; remap = nearest wall on the anchored side containing/clamping the offset |
| 6 | Isometric projection | Pure `lib/isometric.ts` fixed camera vs orbit/perspective | Spec isometric-view-4 forbids deps; orbit needs camera state + interactions (out of scope per proposal). Fixed orthographic camera = pure function of geometry. | **`projectToIsometric(x,y,z)`**, classic 2:1 dimetric; `ViewMode` in canvas.store (display state, rule 05); projection memoized, never recomputed on pan/zoom |
| 7 | Opening position source | Derived at render from wall vs stored x/y recomputed on wall mutation | Render-derived breaks drag/rotate (glyphs preserve interactions, openings-visualization-1). Stored x/y stays truth; walls.store recomputes anchored openings' x/y/rotation after any wall mutation (rule 04: moving the wall moves the opening). | **Stored x/y; recompute on wall mutation** via pure `reanchorOpenings(fixtures, walls)` |

## Data Flow

```
wall tool drag ─▶ PlanCanvas ─▶ snapWallPoint(rooms,walls) ─▶ walls.store.addWall ─▶ WallLayer (2D) / IsometricLayer
room action (move/settings/remove) ─▶ floors.store ─▶ walls.store.regenerateFloorWalls ─▶ reanchorOpenings ─▶ fixtures.store
load/import ─▶ migrate v3→v4 (materialize + remap) ─▶ applyProjectData ─▶ stores (walls restored)
undo/redo ─▶ history (floors+terrain+fixtures+walls) ─▶ applyHistoryEntry
ViewMode "isometric" ─▶ canvas.store ─▶ PlanCanvas renders IsometricLayer (walls+openings extrude, z=floorHeight)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/types/plan.ts` | Modify | `Wall` interface; `activeTool` union +`"wall"`; `wallSide?` optional; `ViewMode` type |
| `src/stores/walls.store.ts` | Create | Flat wall list + actions (add/move/resize/remove/regenerate/reanchor), recordHistory incl. walls |
| `src/lib/walls.ts` | Modify | Move `findMergedWalls`/`isCovered` from WallLayer; `materializeFloorWalls`; wall-based `cascadeOpenings` (re-anchor coincident or drop); `wallKey`; `reanchorOpenings`; delete room-based cascade |
| `src/lib/wall-snap.ts` | Create | `snapWallPoint` (room corners + wall endpoints ≤ SNAP_THRESHOLD), `findNearestWallEntity` (replaces utils `findNearestWall`) |
| `src/lib/isometric.ts` | Create | `projectToIsometric(x,y,z)`, `isoWallFaces(wall, height)` polygon math |
| `src/lib/migrate.ts` | Modify | `migrateProjectData` v3→v4 (materialize + remap, idempotent guard `version >= 4`) |
| `src/lib/storage.ts` | Modify | `CURRENT_VERSION = 4`; `walls` in `ProjectData`, shape-guard, save/load/import |
| `src/lib/utils.ts` | Modify | Remove `findNearestWall` (moved to wall-snap) |
| `src/stores/{floors,fixtures,rooms}.store.ts` | Modify | recordHistory adds `walls`; floors: geometry/settings actions call regeneration; `removeRoom` cascade via walls; `duplicateRoom` materializes copy walls; `removeFloor` clears floor walls |
| `src/stores/history.store.ts` | Modify | `HistoryEntry.walls?`; `captureSnapshot` includes walls |
| `src/stores/canvas.store.ts` | Modify | `viewMode: "2d"\|"isometric"` + `setViewMode` |
| `src/hooks/useEditorLifecycle.ts` | Modify | `collectEditorState`/`applyProjectData` carry walls |
| `src/hooks/useEditorShortcuts.ts` | Modify | Delete resolution room→fixture→wall; `applyHistoryEntry` restores walls |
| `src/components/canvas/WallLayer.tsx` | Modify | Render wall entities only (no room-derived segments); wall draw preview + endpoint handles |
| `src/components/canvas/IsometricLayer.tsx` | Create | Extruded walls + anchored openings at fixed camera; fine selectors, memo (rule 09) |
| `src/components/canvas/FixtureLayer.tsx` | Modify | Opening placement/glyphs against wall entities; drag re-anchors |
| `src/components/canvas/PlanCanvas.tsx` | Modify | Wall tool wiring (drag/snap/Escape), iso layer switch, preview from walls |
| `src/components/toolbar/Toolbar.tsx` | Modify | Wall tool button + ViewMode toggle |
| `scripts/walls-v4.ts`, `scripts/isometric.ts` | Create | Pure-logic verification (rule 08, bunx tsx) |

## Interfaces / Contracts

```ts
interface Wall {
  id: string; floorId: string;
  x1: number; y1: number; x2: number; y2: number; // cm, absolute
  thickness: number;                              // default 10 (= Room.wallWidth)
  height?: number;                                // default SunSettings.floorHeight (280)
  roomId?: string;                                // provenance; undefined = free-form
}
type ViewMode = "2d" | "isometric";               // CanvasState.viewMode, default "2d"
// history.store
interface HistoryEntry { floors; activeFloorId; terrain; fixtures?; walls?: Wall[] }
// walls.store actions
addWall(w: { x1,y1,x2,y2, thickness? }): void      // rejects zero-length
moveWall(id, dx, dy): void;  resizeWall(id, x1,y1,x2,y2): void;  removeWall(id): void
regenerateFloorWalls(floorId): void;  getWallsForFloor(floorId): Wall[]
// lib
materializeFloorWalls(floor): Wall[]               // deterministic, merged-aware, first-room wins
reanchorOpenings(fixtures, walls): Fixture[]       // recompute x/y/rotation from wall+offset
snapWallPoint(p, rooms, walls, SNAP_THRESHOLD): Point
projectToIsometric(x, y, z = 0): { sx: number; sy: number }  // sx = (x-y)·u, sy = (x+y)·u/2 − z·u
```

## Migration v3→v4 (exact steps, pure `migrateProjectData`)

1. `if (data.version >= 4) return data` — idempotent.
2. Apply existing v2→v3 backfill first.
3. Per floor (in order), per room pair (i<j): compute merged segments (`findMergedWalls`, thickness = max wallWidth, owner = room i).
4. Per room (in order): `getRoomWallSegments(room, merged, enclosed)` → convert local→absolute, skip segments fully covered by a merged wall, skip spans coincident with an already-emitted wall (`segmentsCoincide`) → emit `Wall{ roomId }` with `crypto.randomUUID()`.
5. Remap fixtures: for each opening with `wallId` = a room id, compute anchor point from `wallSide`+`wallOffset`; match nearest wall entity on that side (containing span or closest edge, clamp offset); recompute `x/y/rotation` from wall geometry. No wall on that side → keep fixture, clear `wallId/wallSide/wallOffset` (no data loss on load; in-session wall removal per spec drops).
6. `return { ...data, version: 4, walls, fixtures }` — unrelated fields untouched; legacy key `planos-project` untouched.
7. `CURRENT_VERSION = 4`; export/import reuse the same pipeline.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Pure | `materializeFloorWalls` (merged/solid/gap cases, winner rule), remap (offset clamp, gap anchor, no-wall detach), idempotency, round-trip | `bunx tsx scripts/walls-v4.ts` (extends scripts/migrate.ts pattern) |
| Pure | `snapWallPoint`, `findNearestWallEntity` (corner vs endpoint priority, threshold) | `bunx tsx scripts/wall-snap.ts` |
| Pure | `projectToIsometric` determinism, `isoWallFaces` extrusion at floorHeight, known-points | `bunx tsx scripts/isometric.ts` |
| Store | undo covers add/move/resize/delete/regenerate; cascade re-anchor/drop; floor switch filters walls | Manual + gesture script (rule 08) |
| Manual | Draw/snap/Escape; move-resize-delete; opening re-anchor on wall move; room removal cascade; enclosed/wallWidth regen; v3 import → iso toggle round-trip; pan/zoom in iso does not recompute (perf, rule 09) | `bun dev` browser (08.4) |

vitest proposed for `walls.ts`/`isometric.ts` (rule 08) — not installed without approval.

## Threat Matrix

| Boundary | Applicability | Design response | RED tests |
|---|---|---|---|
| Routing/shell/subprocess | N/A — no shell, subprocess, or executable boundary; import is in-browser JSON parsing only | — | — |
| VCS/PR automation | N/A — no git/PR automation in app code | — | — |
| MDX/docs execution | N/A — content rendered via compileMDX, never executed | — | — |

## Migration / Rollout

4 chained PRs (auto_chain, feature-branch-chain, 800-line budget). Each slice: start = branch off previous; finish = lint+tsc+build green + manual canvas validation; rollback = revert slice commit (feature branch chain retarget keeps diffs clean).

| Slice | Scope | Capabilities | Verify | Rollback |
|---|---|---|---|---|
| S1 | `Wall` type, walls.store, lib materializer + cascade rework, migrate v3→v4, storage v4, history `walls?`, WallLayer from entities, materialize-on-addRoom | wall-drawing (entity), project-persistence, editor-rendering | scripts/walls-v4.ts; v3 project loads remapped; legacy key intact | Revert S1 commit; data re-migrates on reload |
| S2 | wall tool + snap + edit ops + keyboard; opening placement/re-anchor vs walls; room lifecycle (remove/move/duplicate/regenerate) | wall-drawing (tool/ops), fixtures-management | scripts/wall-snap.ts; draw/snap/undo; cascade; room removal | Revert S2 |
| S3 | `lib/isometric.ts`, ViewMode, IsometricLayer, iso switch | isometric-view | scripts/isometric.ts; toggle round-trip lossless; pan/zoom no recompute | Revert S3; ViewMode defaults 2D |
| S4 | Glyph polish (hinge/leaf/arc/sliding states), cheap subtypes only if approved | openings-visualization | Manual glyph states + interactions | Revert S4 |

`Decision needed before apply: Yes` — confirm vitest proposal + S4 subtype list. `Chained PRs recommended: Yes`. `400-line budget risk: Low` (each slice < 800).

## Open Questions

- [ ] New door/window subtypes for S4: propose concrete list at task phase (only cheap ones).
- [ ] vitest adoption: confirm with user before installing (rule 07.3).
