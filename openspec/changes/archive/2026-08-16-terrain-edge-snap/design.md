# Design: Terrain-Edge Snap — Draw/Move/Resize Magnetism to the Terrain Boundary

## Technical Approach

Extend the S2 wall draw/edit flow with a new pure lib `src/lib/terrain-snap.ts`, no new dependencies. Terrain is a **fourth stage** of the existing resolution chain — point → angle → terrain → raw — added to `resolveWallEnd` (wall-angle-snap) via optional `terrain`/`thickness` params, so draw/resize/PlanCanvas wiring inherit it with one call-site change each. Move gets a separate pure `snapWallToTerrain` (whole-wall lock) called from the WallLayer move handler, which is also fixed to gate on effective magnetism (the wd-6 bug). L/T endpoint joins (wall-drawing-3) are enabled by dropping the orientation filter in `snapWallPointDirectional`; the merge contract (wall-drawing-7) extends to move/resize via a new fixpoint `mergeWallToFixpoint` in wall-merge.ts. All snapping resolves **after** point/angle (never overrides them, spec wd-8) and is strict-`<` `SNAP_THRESHOLD` (25 cm) — no clamping.

## Architecture Decisions

| # | Option | Tradeoff | Decision |
|---|---|---|---|
| D1 | Angular classification | Tolerance-based windows vs exact axis tests | `TERRAIN_ANGLE_TOLERANCE = 4` (degrees, strict `<`), matching `ANGLE_SNAP_TOLERANCE`. Draw/resize: parallel when `angleDist(stroke, edgeAngle) < 4` (edge 0° horizontal / 90° vertical), de-punta when within 4° of the edge normal. In practice EXACT because angle snap (0/90 are targets, same 4° window) runs first — the terrain stage only sees axis-aligned strokes. Move: classify the wall by EXACT equality (`y1===y2` horizontal, `x1===x2` vertical; degenerate or diagonal → untouched) — a rigid translation of a near-axis wall cannot keep the band inside the terrain (wd-8 band contract) |
| D2 | Chain placement | Standalone call vs extend `resolveWallEnd` | Extend `resolveWallEnd(p, start, rooms, walls, magnetize, terrain?, thickness?)`; terrain stage skipped when `terrain` is undefined (all existing tests pass 5 args → backward compatible). Stage resolves by VALUE (early return if it changed the point), preserving "terrain MUST NOT override a point/angle result" |
| D3 | Move lock semantics | Lock the dragged axis only vs both axes | `snapWallToTerrain(wall, terrain, threshold?)` in terrain-snap.ts: parallel → y-lock for horizontal (`dy ∈ {t/2−y1, h−t/2−y1}`, nearest wins) / x-lock for vertical; de-punta → nearest END snaps to the edge (`dx ∈ {−x1, w−x2}`). Both axes may fire independently (corner). WallLayer move handler: point snap translates the wall, terrain lock applies ONLY when the point snap did not change the pointer (`isSnapped` false) and the wall is free (`!wall.roomId`); whole handler gated by `effectiveMagnetism` |
| D4 | Merge on move/resize | Single-pass vs fixpoint | New `mergeWallToFixpoint(walls, targetId)` in wall-merge.ts: loop `tryMergeCollinearWalls(working, candidate)` until null (handles A…W…B sandwiched unions), fresh-id union (D4 semantics preserved). Store action: `recordHistory()` → `set(state => geometry map; if free → mergeWallToFixpoint ?? state)` → `reanchorOpenings()` — ONE undo step (wd-7). Room walls never merge (existing `tryMergeCollinearWalls` guard) |
| D5 | Draw start | Terrain corners on start? | YES (perimeter drawing UX): new `snapWallStart(p, rooms, walls, terrain?, threshold?)` = `snapWallPoint` (room corners → wall ends, existing priority) then, if unchanged, the 4 terrain corners `(0,0),(w,0),(0,h),(w,h)` as lowest-priority targets, strict `<` 25. End chain never re-hits corners → no collapse |
| D6 | Degenerate guards | Reuse EPS vs exact zero | Repo convention (moveWall:87, wallAngleDeg): exact `≤ 0`. Stroke `length ≤ 0` → return p; a lock that would collapse the stroke to `≤ 0` → skip that axis; zero-delta locks are no-ops (already-on-edge stays) |
| D7 | Module shape | Inline in components vs pure lib | New `src/lib/terrain-snap.ts` (~150 lines, rule 01: imports only types + constants, no stores/components). Keep under 300 lines |
| D8 | Move magnetism gate (wd-6 fix) | Leave move ungated vs gate | WallLayer move handler currently calls `snapWallPoint` unconditionally — the wd-6 "OFF disables ALL snapping" bug. Gate the whole move handler on `effectiveMagnetism(canvas.magnetismEnabled, e.evt.shiftKey)`; OFF → raw translation |

## Data Flow

```
draw/resize:
  mousedown ── start = magnetize ? snapWallStart(p, rooms, walls, terrain) : p
  mousemove  ── resolveWallEnd(p, start, rooms, walls, magnetize, terrain, thickness)
  mouseup    ── same resolve ──> addWall ── tryMergeCollinearWalls ── reanchorOpenings
                chain: point (L/T) → angle → TERRAIN → raw, each wins by value
move:
  mousemove (gated by magnetize)
    ├─ snapWallPoint(p, rooms, others) → translate wall by (snapped − start)
    └─ if !isSnapped && !wall.roomId: snapWallToTerrain(wall, terrain) → lock
  moveWall ── recordHistory → set(geometry + mergeWallToFixpoint) → reanchorOpenings
resize: resolveWallEnd(p, pivot, …, terrain, live.thickness) ──> resizeWall (same merge path)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/lib/terrain-snap.ts` | Create | Pure terrain snap: constants, `angleDist`, `pickNearestLock`, `snapWallEndToTerrain`, `snapWallToTerrain`, `snapWallStart` (D1/D3/D5/D6) |
| `tests/terrain-snap.test.ts` | Create | Unit coverage of the new lib (wd-8 scenarios S1–S8 + guards) |
| `src/lib/wall-angle-snap.ts` | Modify | `resolveWallEnd` gains optional `terrain`/`thickness`; terrain stage after angle (D2) |
| `src/lib/wall-snap.ts` | Modify | Remove orientation filter (`wallHorizontal`/`wallVertical` continue, lines 146–149); keep `collides()` anti-collapse — enables L/T joins (wall-drawing-3) |
| `src/lib/wall-merge.ts` | Modify | Add `mergeWallToFixpoint` (D4); `tryMergeCollinearWalls` untouched |
| `src/stores/walls.store.ts` | Modify | `moveWall`/`resizeWall`: merge free walls after geometry map, before `reanchorOpenings` (one undo step) |
| `src/components/canvas/WallLayer.tsx` | Modify | Move handler: magnetism gate (D8) + terrain lock; resize: pass `terrain` + `live.thickness` to `resolveWallEnd` |
| `src/components/canvas/PlanCanvas.tsx` | Modify | `snapToCanvasPoint` → `snapWallStart` with terrain; `resolveCanvasWallEnd`/`completeDraw` pass terrain + `DEFAULT_WALL_THICKNESS` |
| `tests/wall-angle-snap.test.ts` | Modify | FLIP anti-collapse case (line 142) → L/T magnetize `(295,100)`; add chain + magnetize-OFF terrain cases |
| `tests/wall-snap.test.ts` | Modify | FLIP line 80 case → L/T snap `(295,0)`; add L/T cases; keep collides cases |
| `tests/walls.test.ts` | Modify | move/resize merge: one wall, one undo, sandwiched fixpoint, room wall never merged, opening re-anchor |

## Interfaces / Contracts

```ts
// src/lib/terrain-snap.ts (new)
export const TERRAIN_ANGLE_TOLERANCE = 4;            // degrees, strict <
export function angleDist(a: number, b: number): number;        // circular in [0,180)
export function pickNearestLock(deltas: readonly number[], threshold: number): number | null;
export function snapWallEndToTerrain(p: Point, start: Point, terrain: Terrain,
  thickness?: number, threshold?: number): Point;               // draw/resize end
export function snapWallToTerrain(wall: Wall, terrain: Terrain,
  threshold?: number): Wall;                                    // move whole-wall lock
export function snapWallStart(p: Point, rooms: Room[], walls: Wall[],
  terrain?: Terrain, threshold?: number): Point;                // draw start (corners last)
// src/lib/wall-angle-snap.ts (modified)
export function resolveWallEnd(p: Point, start: Point, rooms: Room[], walls: Wall[],
  magnetize: boolean, terrain?: Terrain, thickness?: number): Point;
// src/lib/wall-merge.ts (new export)
export function mergeWallToFixpoint(walls: Wall[], targetId: string): Wall[] | null;
```

Locks: parallel lock snaps the center line to `edge ∓ thickness/2` (band INSIDE, outer face at edge — wd-8); de-punta snaps the endpoint onto the edge. Threshold strict `<` (24.9 snaps, 25.0 does not — parity with `snapWallPoint`/`snapWallAngle`). Terrain edges axis-aligned in world space (`y=0`, `y=height`, `x=0`, `x=width`); `northAngle` display-only (wd-8). Anti-collapse: `collides()` stays; L/T drops only the same-orientation filter. `snapWallToTerrain` returns the same wall reference when no lock applies (caller compares `!==`).

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | De-punta draw S1 (end → edge, y preserved), parallel draw S2 (`width−t/2`), band-inside (stroke on `y=0` → center `t/2`), corner (both locks), strict threshold (25 no, 24.9 yes), beyond threshold (60 untouched), diagonal 45° untouched, magnetize OFF raw, `terrain` undefined backward-compat, degenerate no-recollapse, already-on-edge no-op | `tests/terrain-snap.test.ts` |
| Unit | Move: S3 end-lock (`x2→width`), S4 parallel (`x→width−t/2`), diagonal untouched, far untouched, outside-terrain untouched; start: corner snap + room-corner priority | same |
| Unit | L/T: `snapWallPointDirectional` now magnetizes perpendicular endpoints; flips at `wall-angle-snap.test.ts:142` (`(295,100)`) and `wall-snap.test.ts:80` (`(295,0)`); collides cases still reject | modified suites |
| Unit | Chain: point wins over terrain, angle wins over terrain (44°→45° near edge stays 45°); `mergeWallToFixpoint` single/sandwiched union, fresh id, null when no merge | `wall-angle-snap.test.ts`, `tests/wall-merge.test.ts` |
| Integration | `moveWall`/`resizeWall`: merged wall + ONE undo step; room wall never merged; opening re-anchored at equivalent offset | `tests/walls.test.ts` |
| Manual | Draw/move/resize near each edge with toggle and Shift; verify L/T joins and band-inside rendering | `bun dev` (rule 08.4) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration. All behavior additive behind existing state (magnetism toggle); reverting the change restores prior semantics.

## Open Questions

- None blocking. (Accepted: a mid-drag merge absorbs the moved wall's id, so the drag freezes at the fused state — correct geometry, one undo step; documented in D4. Near-axis walls, e.g. 2° off, do NOT terrain-lock on MOVE — exact-axis classification, documented in D1.)
