# Design: Wall Magnetism — Angle Snap, Collinear Merge, Drawing Polish

## Technical Approach

Extend the S2 wall draw/edit flow with pure libs, no new dependencies. One shared pure resolution chain `resolveWallEnd` (directional point snap → angle snap → raw) applies at every draw/resize commit point, gated by an effective-magnetism boolean (store flag XOR live Shift). A pure `tryMergeCollinearWalls` folds contiguous free-form walls inside `addWall` as one undo step. Preview readouts reuse the MeasurementLayer rotated-Text pattern. Delivered as three chained PRs (P1–P3), each < 400 lines.

## Architecture Decisions

| # | Option | Tradeoff | Decision |
|---|---|---|---|
| D1 | Angle logic inline vs pure lib | Inline is untestable, breaks rule 01 | New `src/lib/wall-angle-snap.ts`: `wallAngleDeg`, `snapWallAngle`, `resolveWallEnd`, `ANGLE_SNAP_TARGETS=[0,45,90,120,135]`, `ANGLE_SNAP_TOLERANCE=4` (strict `<`). Imports only wall-snap/walls/types (no store/component) |
| D2 | Shift via keydown/keyup listeners vs live `e.evt.shiftKey` | Listeners need lifecycle/ordering care; Konva events already expose shiftKey | Read `e.evt.shiftKey` at each resolution point (mousedown start, mousemove preview, mouseup commit via `handleWindowMouseUp(e)`, WallEntity resize `handleMove`). No useEditorShortcuts change; Shift stays free during mouse gestures. Preview may lag one frame if Shift changes mid-stroke — accepted |
| D3 | Chain order | Point must win (spec wall-drawing-3 + S2 fix 3506796) | `magnetize ? (directional point → angle → raw) : raw`. Point wins by `result !== input`. Angle snap preserves stroke length along the target ray using start's own coordinates — cannot collapse (anti-collapse safe). OFF = fully raw (no point snap either, incl. draw start) |
| D4 | Merge id: fresh vs keep-surviving | Fresh id sends ALL source-wall openings through existing `reanchorToWall` (visual-center → equivalent offset), one mechanism; keeping an id shifts `wallOffset` silently if the start side extends | Merged wall = new entity, fresh `generateId()`, both sources removed; store calls `reanchorOpenings()` after set. One merge per add (fixpoint/cascade out of scope) |
| D5 | Merge predicates | EPS=1cm is the codebase collinearity convention (walls.ts) | Same floor, both `!roomId`, thickness diff ≤ EPS, direction dot ≥ 1−1e-3, distance-to-line ≤ EPS, interval union on shared axis with gap ≤ EPS ("contiguous or overlapping", shared endpoint counts — unlike room `segmentsCoincide` which needs positive overlap) |
| D6 | Toggle persistence | Spec: session-only | `CanvasState.magnetismEnabled` (default `true`) in canvas.store + `toggleMagnetism` (grid pattern); storage.ts persists only ProjectData → session-only by construction; Toolbar button mirrors grid toggle (aria-pressed, blue highlight) |

## Data Flow

```
mousedown  ── start = magnetize ? snapToCanvasPoint(p) : p          (OFF: raw)
mousemove  ── end = resolveWallEnd(p, start, rooms, walls, magnetize)
mouseup    ── same resolve (fresh pointer + shiftKey) ──> addWall
                 ├─ directional point snap (S2) → wins
                 ├─ angle snap (nearest target, <4°, length kept)
                 └─ raw
addWall    ── tryMergeCollinearWalls → merged ? reanchorOpenings() : append
WallDrawPreview{x1,y1,x2,y2,snapped} ──> WallDrawPreviewLine readouts (render-only)
WallEntity resize ── resolveWallEnd(p, pivot=stationary endpoint, ...)
```

## Slice Boundaries (delivery order P1 → P2 → P3)

- **P1 Angle magnetism + toggle (~330)**: `lib/wall-angle-snap.ts` (~100) + `tests/wall-angle-snap.test.ts` (~160) + `types/plan.ts` (+2) + `stores/canvas.store.ts` (+8) + `PlanCanvas.tsx` chain/Shift/snapped-flag (+45) + `Toolbar.tsx` toggle (+15) + `WallLayer.tsx` resize chain (+10).
- **P2 Collinear merge (~300)**: `lib/wall-merge.ts` (~120) + `tests/wall-merge.test.ts` (~170) + `stores/walls.store.ts` addWall (+18).
- **P3 Polish (~85)**: `WallLayer.tsx` readouts/indicator (+70) + PlanCanvas passes `snapped` into preview (+10, field added P1).

P1 must land first (chain + flag); P2 stacks after (merge benefits from exact target angles); P3 consumes P1's `snapped` flag.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/lib/wall-angle-snap.ts` | Create | Angle math + resolution chain (D1) |
| `tests/wall-angle-snap.test.ts` | Create | P1 unit tests |
| `src/types/plan.ts` | Modify | `CanvasState.magnetismEnabled: boolean` — no `Wall` change (merge reuses the entity) |
| `src/stores/canvas.store.ts` | Modify | `magnetismEnabled: true` + `toggleMagnetism` |
| `src/components/canvas/PlanCanvas.tsx` | Modify | Chain in mousedown/mousemove/completeDraw; Shift threading; `snapped` in preview |
| `src/components/toolbar/Toolbar.tsx` | Modify | Magnetism toggle (grid-button pattern) |
| `src/lib/wall-merge.ts` | Create | `tryMergeCollinearWalls` (D5) |
| `tests/wall-merge.test.ts` | Create | P2 unit tests |
| `src/stores/walls.store.ts` | Modify | addWall merge path + reanchorOpenings |
| `src/components/canvas/WallLayer.tsx` | Modify | Resize chain (P1); readouts/indicator (P3) |

## Interfaces / Contracts

```ts
// lib/wall-angle-snap.ts
export const ANGLE_SNAP_TARGETS = [0, 45, 90, 120, 135] as const;
export const ANGLE_SNAP_TOLERANCE = 4; // degrees, strict <
export function wallAngleDeg(p1: Point, p2: Point): number; // [0,180), undirected
export function snapWallAngle(p: Point, start: Point, targets: readonly number[], tol: number): Point;
export function resolveWallEnd(p: Point, start: Point, rooms: Room[], walls: Wall[], magnetize: boolean): Point;
// lib/wall-merge.ts
export function tryMergeCollinearWalls(walls: Wall[], newWall: Wall): Wall[] | null; // null = no merge
```

`WallDrawPreview` gains `snapped?: boolean` (default false). `wallAngleDeg` = `(atan2*180/π + 360) % 180`; angle distance is circular in [0,180): `min(|a−t|, 180−|a−t|)`; zero-length stroke (`hypot ≤ EPS`) returns input. Merge: union interval re-projected onto the direction unit vector; degenerate candidates skipped.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | Angle normalization ([0,180), 179.4°→0), circular distance, length preserved, strict 4°, tie → first target, zero-length guard | `tests/wall-angle-snap.test.ts` |
| Unit | `resolveWallEnd`: point wins, angle, raw, OFF=raw | same |
| Unit | Merge: contiguous/overlap/diagonal union, room-derived untouched, floor/thickness guards, gap>EPS no-merge, openings equivalent-offset via reanchor | `tests/wall-merge.test.ts` |
| Regression | S2 anti-collapse (3506796) stays green | existing `tests/wall-snap.test.ts` |
| Manual | Toggle + Shift invert, readouts without jank on pan/zoom | `bun dev` (rule 08.4) |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration. Session-only flag; default ON is additive — reverting a slice commit restores prior semantics (proposal rollback plan).

## Open Questions

- None blocking. (Note: editor-rendering-4 scenarios scope readouts to the draw preview with the `wall` tool; resize-drag readouts are not covered by scenarios and are left out of P3.)
