# Delta for Editor Rendering

## MODIFIED Requirements

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
