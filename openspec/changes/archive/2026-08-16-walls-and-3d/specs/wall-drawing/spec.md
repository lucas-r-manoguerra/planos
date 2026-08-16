# Wall Drawing Specification

## Purpose

First-class free-form `Wall` entities per floor: a draw tool, edit operations
with snapping, and undo coverage. Walls become the single source of truth for
wall geometry, replacing render-time derivation from room rects
(`getRoomWallSegments`, `src/lib/walls.ts`).

## Requirements

### Requirement: wall-drawing-1: Wall entity model

The system MUST model a wall as an entity with `id`, `x1`, `y1`, `x2`, `y2`
(cm, same coordinate system as `Room`), `thickness` (cm), `floorId`, and an
optional `height` (cm). Wall endpoints MUST be absolute positions in the terrain
coordinate system (origin `(0,0)`, 1 unit = 1 cm, rule 03). The default
`thickness` MUST be 10 cm, matching `Room.wallWidth` (`plan.ts:50`).

#### Scenario: Wall stores absolute segment geometry

- GIVEN the user draws a wall from (100, 100) to (300, 100)
- WHEN the wall is committed
- THEN the wall records x1=100, y1=100, x2=300, y2=100, thickness 10, and its floorId

#### Scenario: Zero-length wall is rejected

- GIVEN the user ends a draw at the same point where it started
- WHEN the draw is committed
- THEN no wall is created

### Requirement: wall-drawing-2: Walls scoped per floor

Every wall MUST record the `floorId` of the floor it belongs to. The editor MUST
render only the walls of the active floor, and drawing MUST assign the active
floor (same pattern as fixtures-1 in `fixtures.store.ts`).

#### Scenario: Floor switch filters walls

- GIVEN two floors each containing walls
- WHEN the user switches to floor A
- THEN only floor A's walls render on the canvas

### Requirement: wall-drawing-3: Free-form draw tool

The system MUST extend the `activeTool` union (`plan.ts:95`) with a `wall`
value. With the tool active, a click-and-drag gesture MUST create a wall from
the start to the end point, showing a live preview while dragging. At draw time
endpoints MUST snap to room corners and to endpoints of other walls within
`SNAP_THRESHOLD` (25 cm, `constants.ts:20`). `Escape` MUST cancel the draw
(mirroring fixture placement cancel in `PlanCanvas.tsx`).

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
- THEN both walls exist and render (no collision rejection is defined for wall segments)

### Requirement: wall-drawing-4: Edit operations

The user MUST be able to select a wall and move it (translate both endpoints),
resize it (drag one endpoint), and delete it with `Delete`/`Backspace` when the
canvas has focus (mirroring fixture keyboard delete, `fixtures-management-2`).
Moving and resizing MUST apply the same snapping as drawing.

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

### Requirement: wall-drawing-5: Undo covers wall operations

Wall creation, move, resize, and delete MUST be recorded in the undo history as
single steps, and undo/redo MUST restore the wall geometry (extending the
snapshot pattern in `history.store.ts`, which currently captures
floors/terrain/fixtures).

#### Scenario: Undo removes a drawn wall

- GIVEN a wall was just drawn
- WHEN the user triggers undo
- THEN the wall disappears

#### Scenario: Undo restores a deleted wall

- GIVEN a wall was deleted
- WHEN the user triggers undo
- THEN the wall reappears with its endpoints intact
