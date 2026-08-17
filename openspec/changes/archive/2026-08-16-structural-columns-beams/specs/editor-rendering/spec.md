# Delta for editor-rendering

## MODIFIED Requirements

### Requirement: editor-rendering-1: Per-domain Konva layers [CHANGED]

The editor canvas MUST render each domain (grid, terrain, rooms, walls,
fixtures, **structural elements**, measurements, shadow, sun arc, isometric
preview, **floor overlay**) on its own Konva layer, and each layer MUST draw
only its own domain's shapes. The wall domain MUST render wall entities from the
walls store as the single source of truth; no layer MAY derive wall geometry
from room rects at render time. Structural geometry MUST come from the
structural store as the single source of truth; the floor overlay MUST draw only
the adjacent floor's walls and structural elements.
(Previously: the domain list did not include structural elements or a floor
overlay, and structural geometry did not exist.)

#### Scenario: One layer per domain

- GIVEN the editor is rendering
- WHEN the Konva stage is inspected
- THEN each domain is drawn on a dedicated layer, including structural elements

#### Scenario: No cross-layer drawing

- GIVEN a layer is rendering
- WHEN its shapes are inspected
- THEN it contains only shapes of its own domain

#### Scenario: Structural layer draws structural entities only

- GIVEN columns and beams exist on the active floor
- WHEN the structural layer renders
- THEN it draws shapes from structural entities and no room-derived or wall-derived shapes

#### Scenario: Overlay layer draws adjacent-floor walls and structure only

- GIVEN the floor overlay is enabled
- WHEN the overlay layer renders
- THEN it draws only the adjacent floor's wall and structural entities

## ADDED Requirements

### Requirement: editor-rendering-5: Structural and overlay layer order [ADDED]

The structural layer MUST render above the room layer and below the wall layer
(columns sit on the slab, walls and infill render over them). The floor overlay
MUST render above all floor-level geometry (rooms, walls, fixtures, structural)
and below measurement and annotation layers, so translucent alignment shapes
read as an aid without occluding interactions or annotations. The z-order MUST
be enforced in `PlanCanvas.tsx` consistently with the existing layer order.

#### Scenario: Structural renders below walls

- GIVEN a column and a wall that overlap in plan
- WHEN the stage renders
- THEN the wall draws above the column

#### Scenario: Overlay renders below annotations

- GIVEN the overlay is enabled and an automatic dimensioning annotation exists
- WHEN the stage renders
- THEN the annotation draws above the translucent overlay shapes

### Requirement: editor-rendering-6: Structural elements render in 2D and isometric [ADDED]

Structural elements MUST render consistently in both view modes using the same
store geometry (no duplicated state): in 2D via `StructuralLayer`; in the
isometric preview, `IsometricLayer` MUST project columns as vertical prisms
(extruded to the floor height, mirroring the wall extrusion in
`lib/isometric.ts`) and beams as extruded bands along their span, using the
structural store's entities as the single source of truth. Structural geometry
MUST NOT be recomputed on pan/zoom in either mode.

#### Scenario: Column projects as a prism in isometric

- GIVEN a column on the active floor and `viewMode === "isometric"`
- WHEN the isometric layer renders
- THEN the column draws as a vertical prism with its section dimensions

#### Scenario: Beam projects along its span

- GIVEN a beam on the active floor and `viewMode === "isometric"`
- WHEN the isometric layer renders
- THEN the beam draws as an extruded band along the beam span

#### Scenario: Isometric geometry is store-derived

- GIVEN a beam whose span changes in the structural store
- WHEN the isometric view re-renders
- THEN the projected beam reflects the new span and no other source drives it

#### Scenario: Pan/zoom does not recompute isometric structure

- GIVEN the isometric view is rendering structure
- WHEN the user pans or zooms
- THEN the structural projection is not recomputed
