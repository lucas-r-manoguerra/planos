# Delta for Wall Drawing

## ADDED Requirements

### Requirement: wall-drawing-8: Terrain-edge snap

The system MUST snap free walls (no `roomId`) to the axis-aligned terrain boundary during DRAW, MOVE, and RESIZE, only when effective magnetism is ON. De-punta: when the stroke/wall is perpendicular to an edge and the endpoint's perpendicular distance to the edge is within `SNAP_THRESHOLD` (25 cm), the endpoint MUST snap onto the edge (draw/resize end; on move, the end nearest the edge). Parallel: when the stroke/wall is parallel to an edge and its center line is within `SNAP_THRESHOLD` of the snap position, the center line MUST snap to `edge ∓ thickness/2` so the band sits INSIDE the terrain (outer face at the edge). Terrain snap MUST resolve after point/angle snap, before raw, MUST NOT override a point/angle result, and MUST NOT clamp: geometry beyond `SNAP_THRESHOLD` stays untouched — walls outside the terrain remain allowed. Terrain edges are axis-aligned in world space (`y=0`, `y=height`, `x=0`, `x=width`); `northAngle` is display-only and MUST NOT affect snapping. Non-goals: T-junction onto a wall's LINE (endpoints only), miter corner joins, room-derived walls.

#### Scenario: De-punta draw ends on the edge

- GIVEN magnetism ON, horizontal stroke ending 10 cm inside the right edge
- WHEN released
- THEN the endpoint commits exactly at the edge (`x = width`), `y` preserved

#### Scenario: Parallel draw sits inside at thickness/2

- GIVEN magnetism ON, vertical stroke 15 cm from the right edge
- WHEN released
- THEN the center line commits at `width − thickness/2`, band inside

#### Scenario: Move locks de-punta onto the edge

- GIVEN a horizontal free wall, magnetism ON
- WHEN dragged so its right end lands 12 cm from the right edge
- THEN the end locks onto the edge

#### Scenario: Move locks parallel at thickness/2

- GIVEN a vertical free wall 20 cm from the right edge, magnetism ON
- WHEN dragged toward the edge
- THEN the center line locks at `width − thickness/2`

#### Scenario: Resize endpoint snaps onto the edge

- GIVEN a selected horizontal wall, magnetism ON
- WHEN the right endpoint is dragged to 8 cm inside the right edge
- THEN the endpoint commits at the edge

#### Scenario: Beyond threshold is never clamped

- GIVEN a free wall whose center line is 60 cm from the right edge
- WHEN drawn or moved
- THEN it stays where it is — no snap, no clamp

#### Scenario: Diagonal stroke near an edge does not terrain-snap

- GIVEN a ~45° stroke ending 10 cm from the right edge
- WHEN released
- THEN no terrain snap (neither case); point/angle results still win, else raw

#### Scenario: Magnetism OFF disables terrain snap

- GIVEN magnetism OFF (toggle or Shift held)
- WHEN drawing or moving near an edge
- THEN the geometry commits at the raw position

## MODIFIED Requirements

### Requirement: wall-drawing-3: Free-form draw tool

The system MUST extend the `activeTool` union (`plan.ts:95`) with a `wall` value. A click-and-drag with the tool active MUST create a wall from start to end, with a live preview. With magnetism ON, the draw end MUST resolve in priority order: (1) direction-aware point snap — room corners and wall endpoints within `SNAP_THRESHOLD` (25 cm), now INCLUDING endpoints of PERPENDICULAR free walls (L corners, T crosses; endpoints only, never a wall's line), skipping candidates that would collapse the stroke to near-zero length; (2) angle snap — nearest target in {0, 45, 90, 120, 135}° normalized to [0, 180) within strict 4° tolerance, adjusting the end along the target ray, drawn length preserved; (3) terrain-edge snap (wall-drawing-8); (4) raw pointer. Point snap MUST win over angle snap; terrain snap MUST NOT override a point/angle result. `Escape` MUST cancel the draw.

(Previously: point candidates were same-orientation only — perpendicular wall endpoints never magnetized; the chain ended at raw pointer.)

Note: the anti-collapse scenario for perpendicular wall ends is superseded — L/T joins are the intended UX (decision 4); wall-drawing-8 keeps the axis-collapse guard. The test `anti-collapse (S2)` at `tests/wall-angle-snap.test.ts:142` MUST be updated to the L/T contract.

#### Scenario: Draw a wall between two points

- GIVEN the `wall` tool is active
- WHEN click-drag-release from (100, 100) to (400, 100)
- THEN a wall from (100, 100) to (400, 100) is created

#### Scenario: Endpoint snaps to a room corner

- GIVEN a room corner at (500, 300)
- WHEN a dragged endpoint lands within 25 cm of (500, 300)
- THEN the endpoint is committed exactly at (500, 300)

#### Scenario: Endpoint joins an existing wall

- GIVEN a wall whose endpoint is at (600, 200)
- WHEN a new wall's endpoint lands within 25 cm of (600, 200)
- THEN the new endpoint is committed exactly at (600, 200)

#### Scenario: Escape cancels the draw

- GIVEN the `wall` tool is active and a drag is in progress
- WHEN `Escape` is pressed
- THEN no wall is created and the preview disappears

#### Scenario: Overlapping walls are permitted

- GIVEN a wall from (0, 0) to (1000, 0)
- WHEN a second wall from (200, 0) to (800, 0) is drawn
- THEN both walls exist and render (no collision rejection; collinear overlap merges per wall-drawing-7)

#### Scenario: Diagonal stroke magnetizes to 45 degrees

- GIVEN magnetism ON, stroke ends 44° off horizontal
- WHEN released
- THEN the wall is committed on the exact 45° ray, length preserved

#### Scenario: Point snap wins over angle snap

- GIVEN a wall endpoint within 25 cm of the pointer while the stroke is ~44° off horizontal
- WHEN released
- THEN the endpoint commits exactly at the wall endpoint, not on the 45° ray

#### Scenario: Endpoint magnetizes to a perpendicular wall endpoint (L/T)

- GIVEN a vertical free wall whose endpoint is at (600, 200)
- WHEN a horizontal draw's endpoint lands within 25 cm of (600, 200)
- THEN the endpoint commits exactly at (600, 200), forming an L corner

#### Scenario: Anti-collapse guard rejects degenerate candidates

- GIVEN the only candidate would collapse the stroke to near-zero length
- WHEN released
- THEN the candidate is skipped and the endpoint is not committed there

### Requirement: wall-drawing-4: Edit operations

The user MUST select a wall, move it (translate both endpoints), resize it (drag one endpoint), and delete it with `Delete`/`Backspace` when the canvas has focus (mirroring `fixtures-management-2`). Move MUST apply point snap and terrain-edge lock (wall-drawing-8), both gated by effective magnetism — OFF or Shift held means a raw translation with no snapping of any kind. With magnetism ON, resize MUST resolve the dragged endpoint like drawing: point snap, then angle snap to the nearest target within 4° from the stationary endpoint, then terrain-edge snap (wall-drawing-8), then raw.

(Previously: move applied ungated point snap only; resize resolved point → angle → raw without terrain.)

#### Scenario: Move a wall

- GIVEN a wall is selected on the canvas
- WHEN the wall body is dragged
- THEN both endpoints translate by the same delta

#### Scenario: Resize by dragging an endpoint

- GIVEN a wall is selected on the canvas
- WHEN one endpoint is dragged
- THEN only that endpoint moves and the wall length updates

#### Scenario: Keyboard delete removes the wall

- GIVEN a wall is selected and the canvas has focus
- WHEN `Delete` is pressed
- THEN the wall is removed

#### Scenario: Resize endpoint magnetizes to a target angle

- GIVEN a selected wall with magnetism ON
- WHEN an endpoint is dragged to ~46° from the stationary endpoint
- THEN the endpoint commits on the 45° ray and the length updates

#### Scenario: Move honors the magnetism toggle

- GIVEN magnetism OFF
- WHEN a wall is dragged near a wall endpoint or a terrain edge
- THEN both endpoints translate by the raw delta — no point snap, no terrain lock

### Requirement: wall-drawing-6: Magnetism toggle

The system MUST expose a toolbar magnetism toggle (`aria-pressed`, default ON) as session-only canvas-store state, not persisted. OFF MUST disable ALL snapping — no point snap, angle snap, terrain-edge snap, or move snap — raw pointer only. Holding `Shift` during a draw, move, or resize gesture MUST invert the toggle for that gesture.

(Previously: OFF disabled point/angle snap on draw/resize only; move snapping was not gated.)

#### Scenario: Toggle OFF disables all snapping

- GIVEN magnetism OFF
- WHEN an endpoint is drawn within 25 cm of a wall endpoint, or a wall is moved within 25 cm of the terrain edge
- THEN the geometry is committed at the raw position — no snap of any kind

#### Scenario: Shift temporarily inverts the toggle

- GIVEN magnetism OFF
- WHEN `Shift` is held during a draw, move, or resize gesture
- THEN the gesture magnetizes as if magnetism were ON

#### Scenario: Toggle state is session-only

- GIVEN the user toggles magnetism OFF
- WHEN the session reloads
- THEN magnetism is ON again

### Requirement: wall-drawing-7: Collinear merge of free-form walls

When a free-form wall (no `roomId`) is ADDED (`addWall`), MOVED (`moveWall`), or RESIZED (`resizeWall`) so it becomes collinear (same orientation), contiguous or overlapping, and same thickness as an existing free-form wall on the same floor, the system MUST merge them into one entity spanning the union. The geometry change and its merge MUST complete within a single store action so the undo history records ONE step (no intermediate state is pushed between the move/resize and the merge), MUST re-anchor openings that referenced the merged-away wall, and MUST NOT merge room-derived walls (`roomId` set).

(Previously: automatic collinear merge ran only on `addWall`; move and resize never merged.)

#### Scenario: Contiguous collinear segments merge into one

- GIVEN a free-form wall from (0, 100) to (400, 100), thickness 10
- WHEN a free-form wall from (400, 100) to (700, 100) is drawn
- THEN one wall from (0, 100) to (700, 100) exists and one undo restores both segments

#### Scenario: Room-derived wall is never merged

- GIVEN a room-derived wall (`roomId` set) collinear and adjacent to a free-form wall
- WHEN the free-form wall is added
- THEN both remain separate and the room-derived wall is untouched

#### Scenario: Openings follow the merged wall

- GIVEN a free-form wall with an anchored opening, followed by a contiguous free-form wall
- WHEN the merge occurs
- THEN the opening is re-anchored to the merged wall at an equivalent offset

#### Scenario: Move-then-merge records one undo step

- GIVEN a free-form wall that becomes collinear and contiguous with another after a move, magnetism ON
- WHEN the move commits
- THEN one merged wall exists and one undo restores both source walls

#### Scenario: Resize-then-merge records one undo step

- GIVEN a free-form wall that becomes collinear and contiguous with another after a resize
- WHEN the resize commits
- THEN one merged wall exists, openings re-anchor, and one undo restores both source walls
