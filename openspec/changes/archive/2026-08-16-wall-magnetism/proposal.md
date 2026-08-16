# Proposal: Wall Magnetism — Angle Snap, Collinear Merge, Drawing Polish

## Intent

Free-form wall drawing (walls-and-3d S2) snaps endpoints but can't express precise diagonals; contiguous collinear segments stay separate entities. Goal: CAD-like magnetism — exact target-angle strokes, collinear free-form merge, professional draw feedback.

## Scope

### In Scope
- Angle snap {0,45,90,120,135}° ([0,180), undirected), strict 4° tolerance, length preserved
- Resolution: point-snap → angle-snap → raw (point wins; anti-collapse kept). Draw end + free-form resize end; move unchanged
- Toggle: toolbar button (aria-pressed, default ON, canvas.store, session-only) + hold-Shift invert. OFF = fully free drawing (no snap at all)
- Collinear merge: free-form (`!roomId`), contiguous/overlapping, same orientation+thickness, on `addWall`; one undo; openings follow
- Polish: angle/length readout + snap indicator in preview (render-only, memoized)

### Out of Scope
- T-junction split — future work; thickness selector (no walls panel)
- Room-derived wall merge (`regenerateFloorWalls` owns them); persisted toggle

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `wall-drawing`: draw semantics — angle snap + toggle (OFF = no snap); collinear merge on add
- `editor-rendering`: preview angle/length readouts + snap indicator

## Approach

Pure libs into existing flow (no new deps). P1: `lib/wall-angle-snap.ts` (`wallAngleDeg`, `snapWallAngle`, `ANGLE_SNAP_TARGETS`, `TOLERANCE=4` strict) + PlanCanvas resolution + canvas.store toggle + Toolbar + Shift + tests. P2: `lib/wall-merge.ts` (`tryMergeCollinearWalls`) in `addWall` (free-form only; `reanchorOpenings` on change) + tests. P3: WallLayer readouts (MeasurementLayer pattern), memoized (09).

## Affected Areas

- New: `src/lib/wall-angle-snap.ts`, `src/lib/wall-merge.ts`, `tests/wall-angle-snap.test.ts`
- Modified: `src/stores/canvas.store.ts` (`magnetismEnabled`), `src/types/plan.ts`, `src/stores/walls.store.ts` (`addWall` merge), `src/components/canvas/PlanCanvas.tsx` (resolution + Shift), `src/components/canvas/WallLayer.tsx` (readouts/indicator), `src/components/toolbar/Toolbar.tsx` (toggle), `tests/{walls,wall-snap}.test.ts`

## Risks

- Merge hits room-derived walls → regen break (Med) — `!roomId` guard + tests
- Point/angle priority regresses S2 fix (Med) — point wins; S2 re-run
- Double undo on add+merge (Low) — `addWall` records once
- Mousemove perf (09) (Med) — O(n), memo, tool-only

## Rollback Plan

Revert slice commit (feature-branch-chain). Default ON is additive — revert restores prior semantics; no schema/persistence change.

## Dependencies

None new (vitest installed).

## Success Criteria

- [ ] Snap to {0,45,90,120,135} ≤4° strict, length kept
- [ ] Point beats angle; S2 anti-collapse green
- [ ] OFF = free draw; Shift inverts; aria-pressed state
- [ ] Free-form merge: one undo, openings follow; room-derived untouched
- [ ] Readouts/indicator render without jank
- [ ] lint/tsc/build/tests green per slice

## Size / Delivery

3 chained PRs < 400 lines each (config 800): P1 ~300, P2 ~250, P3 ~250.

`Decision needed before apply: No` · `Chained PRs recommended: Yes` · `400-line budget risk: Low`
