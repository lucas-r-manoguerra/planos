# Specification: Project Scaffolding + Base 2D Canvas Architecture

## Canvas Grid

**Purpose**: Configurable grid overlay on react‑konva canvas with pan/zoom and coordinate display.

### Requirement: Grid Overlay
The system SHALL render a grid overlay aligned to the coordinate system (1 unit = 1 cm). Grid lines SHALL be visible at all zoom levels.

#### Scenario: Grid renders at default zoom
- GIVEN canvas is initialized
- WHEN canvas is displayed
- THEN grid lines are visible with default spacing (e.g., 10 cm)

#### Scenario: Grid scales with zoom
- GIVEN grid is visible
- WHEN user zooms in/out
- THEN grid lines scale proportionally and remain visible

### Requirement: Pan Canvas
The system SHALL allow panning the canvas by dragging (mouse or touch). The grid SHALL move with the pan.

#### Scenario: User pans canvas
- GIVEN canvas is focused
- WHEN user drags with middle mouse button (or two-finger touch)
- THEN canvas content moves and grid follows

### Requirement: Zoom Canvas
The system SHALL allow zooming via mouse wheel or pinch gestures. Zoom SHALL be bounded (min 0.1, max 5.0).

#### Scenario: User zooms with mouse wheel
- GIVEN canvas is focused
- WHEN user scrolls mouse wheel
- THEN canvas zooms in/out and grid scales

### Requirement: Coordinate Display
The system SHALL display the cursor's current position in centimeters (x, y) in a fixed UI element.

#### Scenario: Cursor moves over canvas
- GIVEN canvas is visible
- WHEN cursor moves
- THEN coordinate display updates with integer cm values

## Terrain Definition

**Purpose**: Define rectangular terrain area with width/height in meters, rendered on canvas.

### Requirement: Terrain Rectangle
The system SHALL render a filled rectangle representing terrain boundaries. The rectangle SHALL have a border and light fill.

#### Scenario: Terrain renders with default dimensions
- GIVEN terrain is defined
- WHEN canvas loads
- THEN rectangle appears with default width/height (e.g., 10m x 8m)

### Requirement: Dimension Input
The system SHALL provide input fields (in meters) for terrain width and height. Changes SHALL update the rectangle in real‑time.

#### Scenario: User sets terrain width
- GIVEN terrain width input is visible
- WHEN user enters a new value (e.g., 12)
- THEN terrain rectangle width updates to 1200 cm (12 m)

#### Scenario: User sets terrain height
- GIVEN terrain height input is visible
- WHEN user enters a new value (e.g., 9)
- THEN terrain rectangle height updates to 900 cm (9 m)

### Requirement: Dimension Labels
The system SHALL display width and height labels along the terrain rectangle edges (in meters).

#### Scenario: Labels show dimensions
- GIVEN terrain rectangle is rendered
- WHEN canvas is visible
- THEN width label appears above top edge, height label appears left of left edge

### Requirement: Terrain Bounds
The canvas viewport SHALL clip to terrain bounds (no scrolling beyond terrain). The grid SHALL align to terrain origin.

#### Scenario: User pans beyond terrain
- GIVEN terrain is defined
- WHEN user tries to pan beyond terrain edges
- THEN canvas stops at terrain boundary

## Room Placement

**Purpose**: Add rectangular rooms with name/type/dimensions, drag to position within terrain.

### Requirement: Add Room
The system SHALL provide a form to add a room with label, type (from enum), width, and height (in cm). On submit, a room rectangle SHALL appear at default position (center of terrain).

#### Scenario: User adds a room
- GIVEN add‑room form is visible
- WHEN user fills label "Dormitorio 1", type "Dormitorio", width 300, height 400
- THEN a rectangle labeled "Dormitorio 1 (300×400 cm)" appears at terrain center

#### Scenario: Missing required fields
- GIVEN add‑room form is visible
- WHEN user submits without label
- THEN form shows validation error and room is not added

### Requirement: Room Types
The system SHALL support the following room types: Dormitorio, Cocina, Baño, Estar‑Comedor, Lavadero, Pasillo.

#### Scenario: Room type dropdown
- GIVEN add‑room form is visible
- WHEN user opens type dropdown
- THEN all six types are listed

### Requirement: Drag Room
The system SHALL allow dragging a room rectangle to a new position within terrain bounds.

#### Scenario: User drags room
- GIVEN a room is placed on terrain
- WHEN user clicks and drags the room
- THEN room moves with cursor and stays within terrain bounds

#### Scenario: Room hits terrain edge
- GIVEN a room is near terrain edge
- WHEN user drags room toward edge
- THEN room stops at terrain boundary (does not go outside)

### Requirement: Snap to Grid
The system SHALL snap room positions to the nearest grid point (configurable snap threshold, default 10 cm).

#### Scenario: Room snaps to grid
- GIVEN snap threshold is 10 cm
- WHEN user drags room to position (105, 203)
- THEN room snaps to (110, 200)

### Requirement: Room Labels
The system SHALL display room label and dimensions (width × height) on the room rectangle.

#### Scenario: Room label visible
- GIVEN a room is placed
- WHEN canvas is visible
- THEN room rectangle shows label and dimensions inside

## UI Shell

**Purpose**: Sidebar with tools + main canvas area.

### Requirement: Layout
The system SHALL display a sidebar on the left (240px width) and a main canvas area filling remaining space.

#### Scenario: Initial layout
- GIVEN app loads
- WHEN canvas is displayed
- THEN sidebar appears left, canvas right

### Requirement: Sidebar Tools
The sidebar SHALL contain: terrain settings (width/height inputs), room list, add‑room button/form, and select tool.

#### Scenario: Terrain settings visible
- GIVEN sidebar is rendered
- WHEN user looks at sidebar
- THEN terrain width/height inputs are visible

#### Scenario: Room list visible
- GIVEN sidebar is rendered
- WHEN rooms exist
- THEN room list shows each room with label and type

### Requirement: Canvas Area
The main area SHALL contain the react‑konva canvas component with grid, terrain, and rooms.

#### Scenario: Canvas renders
- GIVEN app loads
- WHEN main area is visible
- THEN canvas component renders with grid and terrain

## Zustand Stores

**Purpose**: Manage application state for canvas and rooms.

### Requirement: Canvas Store
The system SHALL maintain a Zustand store for canvas state: zoom, pan offset, active tool, grid settings (visible, size).

#### Scenario: Store initialized
- GIVEN app loads
- WHEN store is created
- THEN default zoom = 1.0, pan = {x:0, y:0}, grid visible = true

#### Scenario: Zoom updated
- GIVEN canvas store exists
- WHEN user zooms
- THEN store.zoom updates to new value

### Requirement: Room Store
The system SHALL maintain a Zustand store for rooms: array of room objects (id, label, type, x, y, width, height).

#### Scenario: Room added
- GIVEN room store exists
- WHEN user adds a room
- THEN store.rooms array includes new room with generated id

#### Scenario: Room moved
- GIVEN room store exists
- WHEN user drags a room
- THEN store.rooms[id].x and .y update to new position

### Requirement: Store Actions
Each store SHALL expose actions to update state (setZoom, addRoom, moveRoom, etc.).

#### Scenario: Action called
- GIVEN store exists
- WHEN action is called with parameters
- THEN state updates accordingly

## Prisma Schema

**Purpose**: Define database schema for future persistence (blueprint only).

### Requirement: Project Model
The system SHALL have a Prisma model for Project (id, name, createdAt, updatedAt).

#### Scenario: Schema includes Project
- GIVEN prisma/schema.prisma exists
- WHEN schema is generated
- THEN Project model is defined with required fields

### Requirement: Floor Model
The system SHALL have a Floor model (id, projectId, level, order).

#### Scenario: Schema includes Floor
- GIVEN prisma/schema.prisma exists
- WHEN schema is generated
- THEN Floor model is defined with relation to Project

### Requirement: Room Model
The system SHALL have a Room model (id, floorId, label, type, x, y, width, height).

#### Scenario: Schema includes Room
- GIVEN prisma/schema.prisma exists
- WHEN schema is generated
- THEN Room model is defined with relation to Floor

### Requirement: Wall Model
The system SHALL have a Wall model (id, floorId, startX, startY, endX, endY) for future use.

#### Scenario: Schema includes Wall
- GIVEN prisma/schema.prisma exists
- WHEN schema is generated
- THEN Wall model is defined with relation to Floor

### Requirement: Fixture Model
The system SHALL have a Fixture model (id, roomId, type, x, y, width, height) for future use.

#### Scenario: Schema includes Fixture
- GIVEN prisma/schema.prisma exists
- WHEN schema is generated
- THEN Fixture model is defined with relation to Room