# Editor Rendering Specification

## Purpose

Structure the canvas as per-domain Konva layers with memoized components, avoid
unnecessary re-renders during pan/zoom, and make the `enclosed` toggle actually
change wall rendering.

## Requirements

### Requirement: editor-rendering-1: Per-domain Konva layers

The editor canvas MUST render each domain (grid, terrain, rooms, walls,
fixtures, measurements, shadow, sun arc, isometric preview) on its own Konva
layer, and each layer MUST draw only its own domain's shapes. The wall domain
MUST render wall entities from the walls store as the single source of truth;
no layer MAY derive wall geometry from room rects at render time.
(Previously: wall geometry was derived per render from room rectangles via
`getRoomWallSegments`, `src/lib/walls.ts`.)

#### Scenario: One layer per domain

- GIVEN the editor is rendering
- WHEN the Konva stage is inspected
- THEN each domain is drawn on a dedicated layer

#### Scenario: No cross-layer drawing

- GIVEN a layer is rendering
- WHEN its shapes are inspected
- THEN it contains only shapes of its own domain

#### Scenario: Wall layer draws wall entities only

- GIVEN walls exist on the active floor
- WHEN the wall layer renders
- THEN it draws shapes from wall entities and no room-derived segments

### Requirement: editor-rendering-2: Memoized layers and fine selectors

Canvas layers MUST be memoized and subscribe to fine-grained store selectors so
that pan, zoom, and selection changes do not re-render unrelated layers. Shadow
and sun-arc results MUST NOT be recomputed on pan/zoom.

#### Scenario: Pan/zoom skips shadow work

- GIVEN the editor is rendering with shadows
- WHEN the user pans or zooms
- THEN the shadow layer does not recompute its geometry

#### Scenario: Only affected layers re-render

- GIVEN a room is moved
- WHEN the state updates
- THEN only the layers affected by the room change re-render

### Requirement: editor-rendering-3: Wall settings regenerate wall entities

Changing a room's wall settings (`wallWidth`, `enclosed`) MUST regenerate that
room's wall entities so the toggle still visibly changes wall rendering: an
enclosed room MUST receive a closed perimeter of wall entities; a non-enclosed
room MUST receive wall entities leaving open gaps per its configured settings.
(Previously: the settings were read directly at render time to derive segments,
so a toggle re-rendered walls automatically.)

#### Scenario: Enclosing a room closes its perimeter

- GIVEN a room with wall entities and `enclosed` enabled
- WHEN the setting changes
- THEN the regenerated wall entities form a closed perimeter

#### Scenario: Open walls when disabled

- GIVEN `enclosed` is disabled for a room
- WHEN the setting changes
- THEN the regenerated wall entities leave open gaps as configured

### Requirement: editor-rendering-4: Wall draw preview feedback

While a wall stroke or resize drag is in progress with the `wall` tool active, the system MUST render preview-only feedback: an angle readout near the cursor showing the stroke angle in degrees, a length readout at the stroke midpoint in cm, and a snap indicator when the preview end is magnetized (point or angle snap applied). Readouts MUST be render-only — they MUST NOT affect geometry — and MUST NOT recompute on pan/zoom beyond the preview's existing memoization (rule 09).

#### Scenario: Angle readout follows the cursor

- GIVEN the `wall` tool is active and a stroke is in progress
- WHEN the pointer moves
- THEN a readout near the cursor shows the stroke angle in degrees, computed from start to pointer

#### Scenario: Length readout at the midpoint

- GIVEN a stroke is in progress
- WHEN the pointer moves
- THEN a readout at the stroke midpoint shows the wall length in cm

#### Scenario: Snap indicator marks a magnetized end

- GIVEN the preview end falls within 25 cm of a wall endpoint or within 4° of an angle target
- WHEN the pointer moves
- THEN a distinct visual indicator marks the preview end as snapped

#### Scenario: Readouts skip recompute on pan/zoom

- GIVEN a stroke preview is being rendered
- WHEN the user pans or zooms without moving the pointer
- THEN the readouts are not recomputed and the preview stays consistent
