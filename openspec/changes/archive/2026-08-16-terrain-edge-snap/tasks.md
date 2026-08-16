# Tasks: Terrain-Edge Snap & Wall-Junction Polish

## Review Workload Forecast

Estimated changed lines: ~620 (U1 310, U2 140, U3 145, U4 50)
Budget risk: High overall, Low–Med per unit
Chained PRs: Yes — 4 PRs below
Delivery: auto-chain (config default: feature-branch-chain)

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Terrain snap lib + tests | PR 1 | `bun test tests/terrain-snap.test.ts` | N/A — pure lib until U4 | Revert lib + test |
| 2 | Chain terrain + L/T joins | PR 2 | `bun test tests/wall-angle-snap.test.ts tests/wall-snap.test.ts` | N/A — pure libs; UI in U4 | Revert filter + test flips |
| 3 | Merge on move/resize | PR 3 | `bun test tests/wall-merge.test.ts tests/walls.test.ts` | N/A — covered by tests | Revert fixpoint + store |
| 4 | Component wiring | PR 4 | `bun test && bunx tsc --noEmit && bun lint && bun run build` | `bun dev`: edges, Shift, L/T | Revert components |

## Phase 1: Terrain Snap Lib + Tests (U1)

- [x] 1.1 Create `src/lib/terrain-snap.ts`: `TERRAIN_ANGLE_TOLERANCE=4`, `angleDist` (circular [0,180)), `pickNearestLock` (strict `<`); imports: `@/types/plan`, `SNAP_THRESHOLD`, `snapWallPoint`.
- [x] 1.2 `snapWallEndToTerrain(p,start,terrain,thickness?,threshold?)`: de-punta (4°): end onto edge, other coord kept; parallel → center at `edge ∓ t/2`; both axes (corner); skip stroke≤0/collapsing lock; never clamp.
- [x] 1.3 `snapWallToTerrain(wall,terrain,threshold?)`: exact-axis only (`y1===y2`/`x1===x2`); parallel lock to `edge ∓ t/2` nearest; de-punta nearest end (`−x1`, `w−x2`); else same ref.
- [x] 1.4 `snapWallStart(p,rooms,walls,terrain?,threshold?)`: `snapWallPoint` first; then 4 corners, lowest priority, strict `<`.
- [x] 1.5 `tests/terrain-snap.test.ts` (wd-8): de-punta y-preserved, parallel `width−t/2`, band y=0→t/2, corner, 25 no/24.9 yes, 60°&45° untouched, move end/parallel lock, outside, degenerate no-op.

## Phase 2: Chain + L/T Joins (U2)

- [x] 2.1 `resolveWallEnd` + optional `terrain`/`thickness`; terrain stage after angle, wins by value, never overrides point/angle.
- [x] 2.2 Drop orientation filter in `snapWallPointDirectional` (wall-snap.ts:146–149) → L/T; keep `collides()`.
- [x] 2.3 Flip wall-angle-snap.test.ts:142 → L/T snap (295,100); collides kept.
- [x] 2.4 Flip wall-snap.test.ts:80 → L/T snap (295,0); add L/T cases.
- [x] 2.5 Chain tests: point>terrain, angle>terrain, terrain>raw (de-punta + parallel), OFF raw, no-terrain compat.

## Phase 3: Merge on Move/Resize (U3)

- [x] 3.1 `mergeWallToFixpoint(walls,targetId)`: loop `tryMergeCollinearWalls(candidate,rest)` until null (A…W…B); fresh id else null.
- [x] 3.2 walls.store `moveWall`/`resizeWall`: geometry map then `mergeWallToFixpoint(mapped,id) ?? mapped`; one undo; `reanchorOpenings` after.
- [x] 3.3 wall-merge.test.ts: fixpoint single/sandwiched/fresh-id/null.
- [x] 3.4 walls.test.ts: move/resize merge → one wall + ONE undo; room walls never merged; opening re-anchors.

## Phase 4: Component Wiring + Gate (U4)

- [x] 4.1 WallLayer move: gate `effectiveMagnetism`; ON → point-snap; `!isSnapped && !roomId` → `snapWallToTerrain`; OFF raw.
- [x] 4.2 WallLayer resize: pass `terrain` + `live.thickness` to `resolveWallEnd`.
- [x] 4.3 PlanCanvas: `snapToCanvasPoint` → `snapWallStart(p,rooms,walls,terrain)`; `resolveCanvasWallEnd`/`completeDraw`: terrain + `DEFAULT_WALL_THICKNESS`.
- [x] 4.4 Gate: `bun test`, `bunx tsc --noEmit`, `bun lint`, `bun run build` green; `bun dev` manual (Shift, L/T, band). Verified live (a)–(f) all PASS (commit b13bd03).
