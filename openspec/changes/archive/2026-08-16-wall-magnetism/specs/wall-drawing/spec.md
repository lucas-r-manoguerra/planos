# Delta for wall-drawing

## MODIFIED Requirements

### Requirement: wall-drawing-3: Free-form draw tool [CHANGED]

The system MUST extend the `activeTool` union (`plan.ts:95`) with a `wall` value. A click-and-drag with the tool active MUST create a wall from start to end, with a live preview. With magnetism ON, the draw end MUST resolve in priority order: (1) direction-aware point snap — room corners and same-orientation wall endpoints within `SNAP_THRESHOLD` (25 cm), skipping candidates that would collapse the stroke to near-zero length; (2) angle snap — nearest target in {0, 45, 90, 120, 135} degrees normalized to [0, 180) within strict 4° tolerance, adjusting the end along the target ray, drawn length preserved; (3) raw pointer. Point snap MUST win over angle snap. `Escape` MUST cancel the draw.

(Previously: draw end applied direction-aware point snap only.)

#### Scenario: Draw a wall between two points

- GIVEN the `wall` tool is active
- WHEN the user clicks at (100, 100), drags, and releases at (400, 100)
- THEN a wall from (100, 100) to (400, 100) is created

#### Scenario: Endpoint snaps to a room corner

- GIVEN a room with a corner at (500, 300)
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
- WHEN the user draws a second wall from (200, 0) to (800, 0)
- THEN both walls exist and render (no collision rejection is defined)

#### Scenario: Diagonal stroke magnetizes to 45 degrees

- GIVEN magnetism is ON and the stroke ends 44° off horizontal
- WHEN the user releases the draw
- THEN the wall is committed on the exact 45° ray, length preserved

#### Scenario: Point snap wins over angle snap

- GIVEN a wall endpoint lies within 25 cm of the pointer while the stroke is ~44° off horizontal
- WHEN the user releases the draw
- THEN the endpoint commits exactly at the wall endpoint, not on the 45° ray

#### Scenario: Anti-collapse regression — perpendicular endpoint cannot bend the stroke

- GIVEN a vertical wall endpoint 20 cm from the pointer during a horizontal stroke
- WHEN the user releases the draw
- THEN the wall stays horizontal (dominant axis preserved) and does not collapse

### Requirement: wall-drawing-4: Edit operations [CHANGED]

The user MUST select a wall, move it (translate both endpoints), resize it (drag one endpoint), and delete it with `Delete`/`Backspace` when the canvas has focus (mirroring `fixtures-management-2`). Move MUST apply point snap only. With magnetism ON, resize MUST resolve the dragged endpoint like drawing: point snap, then angle snap to the nearest target within 4° from the stationary endpoint, then raw.

(Previously: moving and resizing applied point snap only.)

#### Scenario: Move a wall

- GIVEN a wall is selected on the canvas
- WHEN the user drags the wall body
- THEN both endpoints translate by the same delta

#### Scenario: Resize by dragging an endpoint

- GIVEN a wall is selected on the canvas
- WHEN the user drags one endpoint
- THEN only that endpoint moves and the wall length updates

#### Scenario: Keyboard delete removes the wall

- GIVEN a wall is selected and the canvas has focus
- WHEN `Delete` is pressed
- THEN the wall is removed

#### Scenario: Resize endpoint magnetizes to a target angle

- GIVEN a selected wall with magnetism ON
- WHEN the user drags an endpoint to ~46° from the stationary endpoint
- THEN the endpoint commits on the 45° ray and the length updates

## ADDED Requirements

### Requirement: wall-drawing-6: Magnetism toggle [ADDED]

The system MUST expose a toolbar magnetism toggle (`aria-pressed`, default ON) as session-only canvas-store state, not persisted. OFF MUST disable all snapping — no point snap, no angle snap — raw pointer only. Holding `Shift` during a draw or resize gesture MUST invert the toggle for that gesture.

#### Scenario: Toggle OFF disables all snapping

- GIVEN magnetism is OFF
- WHEN the user draws an endpoint within 25 cm of a wall endpoint
- THEN the wall is committed at the raw pointer position

#### Scenario: Shift temporarily inverts the toggle

- GIVEN magnetism is OFF
- WHEN the user holds `Shift` while drawing a stroke
- THEN the stroke end magnetizes as if magnetism were ON

#### Scenario: Toggle state is session-only

- GIVEN the user toggles magnetism OFF
- WHEN the session reloads
- THEN magnetism is ON again

### Requirement: wall-drawing-7: Collinear merge of free-form walls [ADDED]

When `addWall` adds a free-form wall (no `roomId`) that is collinear (same orientation), contiguous or overlapping, and same thickness as an existing free-form wall on the same floor, the system MUST merge them into one entity spanning the union. Add+merge MUST record a single undo step, MUST re-anchor openings that referenced the merged-away wall, and MUST NOT merge room-derived walls (`roomId` set).

#### Scenario: Contiguous collinear segments merge into one

- GIVEN a free-form wall from (0, 100) to (400, 100), thickness 10
- WHEN the user draws a free-form wall from (400, 100) to (700, 100)
- THEN one wall from (0, 100) to (700, 100) exists and one undo restores both segments

#### Scenario: Room-derived wall is never merged

- GIVEN a room-derived wall (`roomId` set) collinear and adjacent to a drawn free-form wall
- WHEN the free-form wall is added
- THEN both remain separate and the room-derived wall is untouched

#### Scenario: Openings follow the merged wall

- GIVEN a free-form wall with an anchored opening, followed by a contiguous free-form wall
- WHEN the merge occurs
- THEN the opening is re-anchored to the merged wall at an equivalent offset
