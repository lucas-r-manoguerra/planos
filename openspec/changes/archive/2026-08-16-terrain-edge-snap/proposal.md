# Proposal: Terrain-Edge Snap & Wall-Junction Polish

## Intent

Free walls ignore the terrain boundary today: draws near an edge leave arbitrary gaps/overhangs, and perpendicular endpoint magnetizing is rejected. User: "Walls near the terrain edge must adjust to it depending on the case — whether the wall ends AT the edge or runs PARALLEL to it. Also review and polish the wall-end junctions that magnetize." Principle: UX as easy as possible — terrain edges become first-class snap targets; L/T joins magnetize.

## Scope

**In** (all for free walls, `roomId` absent): terrain-edge snap in draw, move, resize · parallel case — band inside terrain, center line at `thickness/2` · de-punta case — endpoint snaps onto the edge · 25 cm threshold (`SNAP_THRESHOLD`) · L/T perpendicular endpoint magnetize (anti-collapse kept) · collinear merge extended to move/resize · magnetize gate applied to move.

**Out**: T-junction onto a wall's LINE (endpoints only) · miter corner joins · room-derived walls · `northAngle` rotation geometry (display-only; edges stay axis-aligned).

## Capabilities

**New**: None.

**Modified**: `wall-drawing` — terrain edge joins the draw/resize chain and move lock (wd-3/4); magnetism gates all snaps including move (wd-6); merge on move/resize (wd-7); L/T endpoint magnetize relaxes the orientation filter (wd-3).

## Approach

New pure lib `src/lib/terrain-snap.ts` (rule 01 — no stores/components):

- `snapWallEndToTerrain(p, thickness, terrain)`: de-punta — snap endpoint onto nearest edge ≤ 25 cm; parallel — snap center-line coordinate to `edge ∓ thickness/2`, clamp inside.
- Thread optional `terrain`/`thickness` through `resolveWallEnd` (default-safe); terrain snap joins the chain after point/angle, gated by magnetize.
- WallLayer move: terrain lock + magnetize gate (parity with draw/resize).
- walls.store: run `tryMergeCollinearWalls` in `moveWall`/`resizeWall`.

Rejected: terrain as room-like candidate in `snapWallPointDirectional` (mixes concerns, breaks orientation filter); post-commit clamping (no preview UX); Konva edge rendering (display-only, wrong layer).

## Affected Areas

| Area | Impact | What changes |
|---|---|---|
| `src/lib/terrain-snap.ts` | New | Terrain snap logic |
| `src/lib/wall-angle-snap.ts` | Modified | `resolveWallEnd` terrain params + chain |
| `src/lib/wall-snap.ts` | Modified | L/T orientation filter relaxed; `collides()` guard kept |
| `src/stores/walls.store.ts` | Modified | Merge on move/resize |
| `src/components/canvas/PlanCanvas.tsx` | Modified | `resolveCanvasWallEnd` terrain/thickness |
| `src/components/canvas/WallLayer.tsx` | Modified | Move lock + magnetize gate |
| `tests/terrain-snap.test.ts` | New | Terrain snap unit tests |
| `tests/wall-angle-snap.test.ts` | Modified | Chain integration; decision-4 contract test (:142) |
| `tests/wall-snap.test.ts` | Modified | L/T magnetize coverage |

Note: decision 4's "test expecting NO snap" is `anti-collapse (S2)` at `tests/wall-angle-snap.test.ts:142` (verified), not `tests/wall-snap.test.ts`.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Walls outside terrain must never clamp | Med | Snap only within 25 cm; outside walls untouched |
| Thick wall near edge jumps to `thickness/2` | Med | Closed decision; preview shows snapped end |
| Zero-length guards exact (≤ 0), not EPS | Low | Keep guard semantics; boundary tests |
| Shift magnetize-off must gate move too | Med | Gate all new snaps (wd-6) |

## Rollback Plan

Revert the feature branch (auto_chain): remove terrain lib + chain params, restore orientation filter, revert merge-on-move/resize, update affected tests; delta spec removal restores `wall-drawing`.

## Dependencies

None external. Prerequisite: current `wall-drawing` spec requirements.

## Success Criteria

- [ ] Draw/move/resize snap to edges per decisions 1–3.
- [ ] Parallel walls sit inside terrain at `thickness/2`.
- [ ] L/T endpoints magnetize; updated anti-collapse test green.
- [ ] Merge on move/resize yields one wall + single undo step.
- [ ] `bun test` / `bunx tsc --noEmit` / `bun lint` / `bun build` green.

## Decisions Log (contract)

1. Terrain-edge snap applies to DRAW, MOVE, and RESIZE of free walls (roomId absent).
2. Parallel case: wall sits INSIDE the terrain — outer face of the band (thickness/2) touches the edge; center line at thickness/2 from the boundary.
3. Threshold: 25 cm (reuse SNAP_THRESHOLD).
4. Junction polish — L/T junctions: ALLOW a free-wall endpoint to magnetize to the endpoint of a PERPENDICULAR wall (L corners, T crosses), while KEEPING the anti-collapse protection (no degenerate ~zero-length strokes). Relaxes the existing orientation filter in snapWallPointDirectional but keeps the collides() axis-collapse guard. One existing test currently expects NO snap for a perpendicular wall-end case — that contract changes and the test must be updated with spec justification.
5. Junction polish — merge: extend automatic collinear+contiguous merge of free walls to MOVE and RESIZE (currently only on draw via tryMergeCollinearWalls in addWall).

NOT in scope: T-junction onto a wall's LINE (only endpoints); miter corner joins; walls of rooms (room-derived walls regenerate from rooms).
