# Editor Rendering Specification

## Purpose

Structure the canvas as per-domain Konva layers with memoized components, avoid
unnecessary re-renders during pan/zoom, and make the `enclosed` toggle actually
change wall rendering.

## Requirements

### Requirement: editor-rendering-1: Per-domain Konva layers

The editor canvas MUST render each domain (grid, terrain, rooms, walls, fixtures,
measurements, shadow, sun arc) on its own Konva layer, and each layer MUST draw
only its own domain's shapes.

#### Scenario: One layer per domain

- GIVEN the editor is rendering
- WHEN the Konva stage is inspected
- THEN each domain is drawn on a dedicated layer

#### Scenario: No cross-layer drawing

- GIVEN a layer is rendering
- WHEN its shapes are inspected
- THEN it contains only shapes of its own domain

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

### Requirement: editor-rendering-3: Enclosed toggle renders

The `enclosed` setting MUST control wall rendering: when enabled, walls MUST form
a closed perimeter; when disabled, walls MUST render open per their configured
endpoints. Toggling the setting MUST visibly change the wall rendering.

#### Scenario: Enclosed walls close the perimeter

- GIVEN a room with walls and `enclosed` enabled
- WHEN the room renders
- THEN the walls form a closed perimeter

#### Scenario: Open walls when disabled

- GIVEN `enclosed` is disabled
- WHEN the walls render
- THEN wall endpoints render open as configured
