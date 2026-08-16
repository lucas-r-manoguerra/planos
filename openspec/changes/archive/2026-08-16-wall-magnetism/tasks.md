# Tasks: Wall Magnetism — Angle Snap, Collinear Merge, Drawing Polish

Keys: `wd` = wall-drawing, `er` = editor-rendering. Strict TDD (walls-and-3d convention): RED → GREEN → REFACTOR, tests first.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~715 (P1 ~330, P2 ~300, P3 ~85) |
| 400-line budget risk | Low (each slice < 400) |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|----|---------------------|-----------------|-------------------|
| 1 | Angle snap + toggle | PR 1 (→ tracker `wall-magnetism`) | `bun test tests/wall-angle-snap.test.ts` | `bun dev`: 44° stroke → 45° snap; toggle/Shift | Revert PR 1 → S2 point-snap only |
| 2 | Collinear merge | PR 2 (→ PR 1) | `bun test tests/wall-merge.test.ts` | `bun dev`: contiguous walls → one entity, one undo | Revert PR 2 → append-only |
| 3 | Preview polish | PR 3 (→ PR 2) | `bunx tsc --noEmit && bun build` (render-only) | `bun dev`: pan/zoom mid-stroke, readouts stable | Revert PR 3 → plain preview |

## Slice P1: Angle Magnetism + Toggle (~330)

- [x] **P1.1 RED** tests/wall-angle-snap.test.ts (new): wallAngleDeg [0,180) undirected, 179.4°→0, zero-length guard (wd-3)
- [x] **P1.2 RED** same file: snapWallAngle 44°→45°, length kept, strict <4°, tie→first (wd-3)
- [x] **P1.3 RED** same file: resolveWallEnd point-wins-angle, OFF=raw (wd-3, wd-6)
- [x] **P1.4 GREEN** src/lib/wall-angle-snap.ts (new): targets, tol=4, wallAngleDeg, snapWallAngle, resolveWallEnd (pure, no stores) (wd-3)
- [x] **P1.5** src/types/plan.ts: CanvasState.magnetismEnabled: boolean (wd-6)
- [x] **P1.6** src/stores/canvas.store.ts: magnetismEnabled=true + toggleMagnetism, session-only (wd-6)
- [x] **P1.7** src/components/canvas/PlanCanvas.tsx: draw/resize chain via resolveWallEnd; effective = flag XOR shiftKey; preview.snapped (wd-3, wd-6)
- [x] **P1.8** src/components/toolbar/Toolbar.tsx: aria-pressed toggle → toggleMagnetism (wd-6)
- [x] **P1.9** src/components/canvas/WallLayer.tsx: resize handleMove via resolveWallEnd(pivot=stationary) (wd-4)
- [x] **P1.10 REGRESSION** tests/wall-snap.test.ts (S2 anti-collapse) + tests/walls.test.ts green

## Slice P2: Collinear Merge (~300)

- [x] **P2.1 RED** tests/wall-merge.test.ts (new): contiguous segments → union (0,100)-(700,100) (wd-7)
- [x] **P2.2 RED** same file: overlap/diagonal union, gap>EPS no-merge, floor/thickness guards, room-derived untouched, openings re-anchor (wd-7)
- [x] **P2.3 RED** tests/walls.test.ts: addWall merge = ONE undo, reanchorOpenings called (wd-7)
- [x] **P2.4 GREEN** src/lib/wall-merge.ts (new): tryMergeCollinearWalls (EPS=1, !roomId, dot≥1−1e-3, gap≤EPS, fresh id) (wd-7)
- [x] **P2.5 GREEN** src/stores/walls.store.ts: addWall merge path + reanchorOpenings + single undo (wd-7)

## Slice P3: Preview Polish (~85)

- [x] **P3.1 RED** tests/wall-angle-snap.test.ts (extend): pure readout helpers in wall-angle-snap.ts — `wallReadout` (angle° + length cm from the segment), `formatAngleReadout`, `formatLengthReadout` (er-4)
- [x] **P3.2 RED** same file: `isSnapped` — preview.snapped flag semantics (end changed by the resolution chain vs raw pointer; angle-snap + point-snap propagation, OFF = raw/unsnapped) (er-4)
- [x] **P3.3 GREEN** src/components/canvas/WallPreviewReadout.tsx (new, memoized): rotated angle readout near cursor + length readout at midpoint (MeasurementLayer pattern) + amber snap indicator when `preview.snapped`; wired into `WallLayer` draw preview; `PlanCanvas` uses `isSnapped` for both `snapped` assignments (behavior-identical) (er-4)
- [x] **P3.4 GREEN** Memoize: `WallPreviewReadout` is `memo` + reads NO store (props only); `WallLayer` stays memo'd; preview reference stable across pan/zoom → readouts never recompute on wheel/dragmove (er-4, rule 09; verified by code inspection + selector discipline — manual `bun dev` pass deferred to sdd-verify, rule 08.4)

Each slice gated: `bun lint` + `bunx tsc --noEmit` + `bun build` + `bun test` (rule 08).
