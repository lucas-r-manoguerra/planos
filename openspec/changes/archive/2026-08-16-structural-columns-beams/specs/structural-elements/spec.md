# Structural Elements Specification

## Purpose

Introduce a first-class structural domain: `Column` and `Beam` entities scoped
per floor, placement tools, a dedicated Zustand store, a Konva layer, and
properties UI. Structural elements are domain entities (rule 03), NOT fixtures:
beams are spans between points and columns carry section dimensions, which the
closed `FixtureCategory` union (plan.ts:141) cannot represent. Coordinate
system contract: 1 unit = 1 cm (rule 03).

## Requirements

### Requirement: structural-elements-1: Column entity

The system MUST define a `Column` type in `src/types/plan.ts` with `id`
(`crypto.randomUUID()`), `floorId`, `x`, `y` (section center, cm), and editable
`sectionWidth` / `sectionHeight` (cm). Placement MUST offer section presets of
20×20, 25×25, and 30×30 cm; the chosen preset initializes both dimensions, and
both dimensions MUST remain editable after placement.

#### Scenario: Place a column with a preset section

- GIVEN the `column` tool is active and preset 25×25 is selected
- WHEN the user clicks at canvas point (300, 200)
- THEN a column is created with `x=300`, `y=200`, `sectionWidth=25`, `sectionHeight=25`

#### Scenario: Column section is editable after placement

- GIVEN a selected column with section 20×20
- WHEN the user edits its section to 30×40 in the properties panel
- THEN `sectionWidth=30` and `sectionHeight=40` persist and re-render

### Requirement: structural-elements-2: Beam entity

The system MUST define a `Beam` type in `src/types/plan.ts` with `id`
(`crypto.randomUUID()`), `floorId`, span endpoints `(x1, y1)`–`(x2, y2)` on the
center line (cm), and editable `width` (cm). The default beam width MUST be
20 cm and MUST remain editable after placement.

#### Scenario: Draw a beam between two points

- GIVEN the `beam` tool is active
- WHEN the user clicks at (200, 200), drags, and releases at (600, 200)
- THEN a beam from (200, 200) to (600, 200) with `width=20` is created

#### Scenario: Beam width is editable

- GIVEN a selected beam with width 20
- WHEN the user edits its width to 30 in the properties panel
- THEN `width=30` persists and re-renders

### Requirement: structural-elements-3: Placement tools

The system MUST extend the `activeTool` union in `CanvasState`
(`plan.ts:114`) with `"column"` and `"beam"`. Column placement MUST commit on
click. Beam placement MUST commit on click-drag-release; `Escape` MUST cancel an
in-progress beam stroke and MUST NOT create geometry. When `viewMode` is
`isometric`, NO structural geometry MAY be created (display-only mode, matching
the wall tool behavior in `PlanCanvas.tsx:129`).

#### Scenario: Column tool commits on click

- GIVEN `activeTool === "column"`
- WHEN the user clicks the canvas
- THEN a column is added at the click point on the active floor

#### Scenario: Beam tool commits on drag release

- GIVEN `activeTool === "beam"`
- WHEN the user drags from (100, 100) to (500, 300)
- THEN a beam spanning (100, 100)–(500, 300) is created

#### Scenario: Escape cancels a beam stroke

- GIVEN a beam stroke is in progress
- WHEN `Escape` is pressed
- THEN no beam is created and the preview disappears

#### Scenario: Isometric view does not create geometry

- GIVEN `viewMode === "isometric"`
- WHEN the user clicks with the column tool active
- THEN no column is created

### Requirement: structural-elements-4: Structural store CRUD

The system MUST provide a `structural.store.ts` (Zustand) with actions
`addColumn`, `addBeam`, `moveColumn`, `updateColumn`, `updateBeam`,
`removeColumn`, `removeBeam`, `replaceStructural` (project load / undo-redo
restore) and a fine selector `getStructuralForFloor(floorId)`. Adding MUST
assign the active floor's `floorId`. All mutations MUST be immutable (rule 05):
spread/copy, never in-place edits. Destructive actions MUST record history via
the shared snapshot helper (see editor-history).

#### Scenario: Add assigns the active floor

- GIVEN two floors exist and floor B is active
- WHEN a column is added
- THEN the column's `floorId` is floor B's id

#### Scenario: Immutable move

- GIVEN a column at (100, 100)
- WHEN it is moved to (120, 140)
- THEN the column is recreated at (120, 140) and the previous state is untouched

#### Scenario: Remove filters the array

- GIVEN a column and a beam on the active floor
- WHEN the column is removed
- THEN the array contains only the beam and the removed column is gone

### Requirement: structural-elements-5: Terrain bounds and snapping

Columns and beams MUST stay within terrain bounds: placement or movement that
would leave the terrain MUST be rejected or snapped to the terrain edge
(mirroring the terrain snap pattern in `src/lib/terrain-snap.ts`). Beam
endpoints MUST snap to column centers and wall endpoints within the existing
snap threshold (25 cm, `SNAP_THRESHOLD`) and to the grid, when magnetism is
enabled. A beam with zero-length span MUST be rejected. `Escape` behavior and
the magnetism toggle MUST apply to beam drawing as they do to wall drawing
(`wall-drawing-6`).

#### Scenario: Column placement outside terrain is rejected

- GIVEN terrain is 1000×800 cm
- WHEN the user tries to place a column at (1500, 400)
- THEN no column is created

#### Scenario: Column moved to the terrain edge

- GIVEN a column at (900, 400) on a 1000 cm-wide terrain
- WHEN the user drags it to x=1100
- THEN the column snaps to x=1000 (the terrain edge)

#### Scenario: Beam endpoint snaps to a column center

- GIVEN a column whose center is at (500, 300) and magnetism is ON
- WHEN a beam endpoint is released within 25 cm of (500, 300)
- THEN the endpoint commits exactly at (500, 300)

#### Scenario: Beam endpoint snaps to a wall endpoint

- GIVEN a wall with an endpoint at (600, 200)
- WHEN a beam endpoint is released within 25 cm of (600, 200)
- THEN the endpoint commits exactly at (600, 200)

#### Scenario: Zero-length beam span is rejected

- GIVEN a beam stroke starts and ends at the same point
- WHEN the user releases the stroke
- THEN no beam is created

### Requirement: structural-elements-6: StructuralLayer rendering and selection

The system MUST render structural elements in `StructuralLayer.tsx`, one Konva
layer per file that draws ONLY columns and beams of the active floor (rule 04).
The layer MUST subscribe to fine selectors (`getStructuralForFloor`) and be
memoized (rule 09). Columns MUST render as section-sized squares (fill +
stroke); beams MUST render as a band on each side of the center line at
`width / 2`, mirroring `wallBandPoints` (WallLayer.tsx:127). Selection MUST
coexist with rooms/walls/fixtures via per-layer id equality: a structural
element is selected when `selectedId === element.id`; selecting a structural
element MUST clear room/wall/fixture highlights and vice versa.

#### Scenario: Layer renders only the active floor

- GIVEN columns on floor A and floor B
- WHEN floor A is active
- THEN only floor A's columns render in StructuralLayer

#### Scenario: Column renders with its section size

- GIVEN a column with `sectionWidth=30`, `sectionHeight=30`
- WHEN StructuralLayer renders
- THEN the column is drawn 30×30 cm at its (x, y) center

#### Scenario: Beam renders as a width band

- GIVEN a beam from (0, 0) to (600, 0) with `width=20`
- WHEN StructuralLayer renders
- THEN a band from y=-10 to y=10 spans x=0 to x=600

#### Scenario: Selection highlight by id equality

- GIVEN a column whose id equals `selectedId`
- WHEN the layer renders
- THEN the column draws with the selection highlight

#### Scenario: Selecting a structural element clears other selections

- GIVEN a wall is selected
- WHEN the user clicks a column
- THEN `selectedId` becomes the column's id and the wall loses its highlight

### Requirement: structural-elements-7: Keyboard delete

When a column or beam is selected and the canvas has keyboard focus, pressing
`Delete` or `Backspace` MUST remove it and MUST record a single undo step
(mirroring `fixtures-management-2`). When focus is inside a text input, these
keys MUST NOT delete a structural element.

#### Scenario: Delete a selected column

- GIVEN a column is selected and canvas focus is active
- WHEN `Delete` is pressed
- THEN the column is removed and one undo step records the removal

#### Scenario: Typing in an input does not delete

- GIVEN focus is inside a text input
- WHEN `Backspace` is pressed
- THEN the text is edited and no structural element is removed

### Requirement: structural-elements-8: Properties UI

The system MUST expose a structural section in the editor sidebar to place
columns (preset picker 20×20 / 25×25 / 30×30) and activate the `column` /
`beam` tools, and MUST extend `PanelType` in `panel.store.ts` with structural
members so the `PropertiesPanel` edits the selected element's dimensions
(column section, beam width). UI labels MUST be in Spanish (rule INDEX.5).

#### Scenario: Preset picker places a column

- GIVEN the sidebar structural section is visible
- WHEN the user picks preset 30×30 and clicks the canvas
- THEN a column with `sectionWidth=30`, `sectionHeight=30` is created

#### Scenario: Properties panel edits the selected beam

- GIVEN a beam is selected
- WHEN its width is changed in the properties panel
- THEN the beam re-renders with the new width and the change is undoable

#### Scenario: Structural panel routes by element id

- GIVEN a column is selected
- WHEN the panel opens
- THEN the panel shows the column's editable section dimensions
