# Proposal: Walls & 3D — Free-form Walls, Wall-grounded Openings, Isometric View

## Intent

Free-form walls and a 3D view need a real `Wall` entity, but none exists: walls are derived from `Room` rects (`Room.wallWidth`/`enclosed`, `src/types/plan.ts:50-51`, `getRoomWallSegments` `src/lib/walls.ts:203`) and `Fixture.wallId` is actually a room id (`plan.ts:178`). Door/window glyphs are flat anchored rects (`FixtureLayer.tsx:144-249`). Goal: first-class walls, wall-grounded openings, zero-dependency 3D view.

## Scope

### In Scope
- `Wall` entity (id, x1/y1/x2/y2, thickness, floorId, height?) + per-floor walls
- Free-form draw tool + edit (move/resize/delete, snap); extends `activeTool` (`plan.ts:95`)
- Storage migration v3→v4 remapping `Fixture.wallId` room→wall (`storage.ts:401` pattern)
- Isometric pseudo-3D: `ViewMode` toggle + pure `projectToIsometric` + preview layer reusing wall geometry, fixed camera
- Better door/window glyphs; new subtypes only where cheap

### Out of Scope
- three.js/r3f, perspective/orbit camera (needs approval, rule 07.3)
- Per-fixture 3D models; 3D shadows; free-form rooms

## Capabilities

### New Capabilities
- `wall-drawing`: Wall entity, draw tool, editing, snap
- `isometric-view`: ViewMode toggle, projection, preview layer
- `openings-visualization`: glyphs + new door/window subtypes

### Modified Capabilities
- `fixtures-management`: `wallId` semantics room→wall; cascade re-anchors to wall entities
- `editor-rendering`: WallLayer renders wall entities; new isometric layer
- `project-persistence`: schema v4 migration (walls + wallId remap)

## Approach

Full entity change (not room synthesis) — a real `Wall` is what 3D extrusion needs. Sequence: wall entity + migration → draw/edit tool → anchoring migration → isometric view. Chained PRs at 800-line budget (`config.yaml`), each slice green (lint/tsc/build) with canvas flows validated (04/08/09).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/types/plan.ts` | Modified | `Wall`, `activeTool` union, wallId docs |
| `src/lib/walls.ts` | Modified | Wall ops; cascade → walls |
| `src/lib/isometric.ts` | New | `projectToIsometric` |
| `src/stores/walls.store.ts` | New | Wall state + actions |
| `src/components/canvas/WallLayer.tsx` | Modified | Render wall entities |
| `src/components/canvas/IsometricLayer.tsx` | New | 3/4 view preview |
| `src/components/canvas/FixtureLayer.tsx` | Modified | Glyph rework |
| `src/lib/fixtures-catalog.ts` | Modified | New subtypes |
| `src/lib/storage.ts` | Modified | v3→v4 migration |
| `src/lib/utils.ts`, `PlanCanvas.tsx` | Modified | findNearestWall → walls; tool wiring |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration breaks saved projects | Med | v3→v4 in-place remap; legacy key kept; round-trip test |
| Blast radius stores/layers/export | High | Chained slices; fine selectors; manual canvas validation |
| Canvas perf regression | Med | Fine selectors + memo (rule 09) |
| Cascade regression (opening re-anchor) | Med | Pure-logic tests; vitest proposed (rule 08) |

## Rollback Plan

Per-slice revertible commits (feature-branch-chain); legacy backup key kept until import verified; `ViewMode` defaults to 2D — 3D is additive.

## Dependencies

None new (rule 07.3). `vitest` **proposed** for `walls.ts`/`isometric.ts` pure logic — not installed without approval.

## Success Criteria

- [ ] Draw free-form walls; move/resize/delete with snap; undo covers wall ops
- [ ] Openings anchor to wall entities; wall removal re-anchors/drops openings per cascade rules
- [ ] v3 projects load remapped; import/export round-trip intact
- [ ] Isometric toggle renders walls + openings at fixed camera; 2D unchanged
- [ ] lint/tsc/build green on every slice

## Proposal question round

Open questions for user review (unanswered by exploration):
1. **Materialization**: room-derived walls become Wall entities (single source of truth, clean migration); free-form walls additive. Alt: derived + separate free-form list (two render paths).
2. **Snap/join**: free-form walls snap to room corners and wall endpoints at draw time.
3. **Height**: 3D extrusion uses `SunSettings.floorHeight` (exists) as default wall height.
4. **Subtypes**: glyph quality first; new subtypes only if cheap.
