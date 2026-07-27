# Cardinal Orientation Specification

## Purpose

Provide visual cardinal orientation (North arrow) on the canvas and define how the terrain's northAt field maps canvas directions to geographic directions for sun calculations.

## Requirements

| # | Requirement | Strength |
|---|-------------|----------|
| CO-1 | Terrain SHALL have a `northAt` field: `"top" | "bottom" | "left" | "right"` (default: `"top"`) | SHALL |
| CO-2 | North arrow SHALL render as a compass rose in the terrain corner | SHALL |
| CO-3 | North arrow SHALL be visible only when sun simulation mode is active | SHALL |
| CO-4 | North arrow MUST rotate to match the current northAt value | MUST |
| CO-5 | Cardinal labels (N, S, E, W) MUST be positioned relative to the northAt orientation | MUST |
| CO-6 | northAt changes SHALL be undoable via the history system | SHALL |

### Requirement: North Arrow Rendering

A compass rose SHALL be rendered in the top-left corner of the terrain when sun simulation is active. The rose includes a North pointer (triangle/arrow) and four cardinal labels (N, S, E, W).

#### Scenario: North at top shows standard compass

- GIVEN terrain northAt = "top" and sun mode is active
- WHEN the canvas renders
- THEN a compass rose SHALL appear in the terrain's top-left corner
- AND the "N" label SHALL point toward the top of the canvas

#### Scenario: North at left rotates compass

- GIVEN terrain northAt = "left" and sun mode is active
- WHEN the canvas renders
- THEN the compass rose "N" label SHALL point toward the left of the canvas
- AND "E" SHALL point toward the top

### Requirement: North Arrow Visibility Toggle

The north arrow MUST be visible only when the sun simulation toggle is active. When sun mode is off, the north arrow MUST NOT render.

#### Scenario: Sun mode off hides compass

- GIVEN sun simulation mode is inactive
- WHEN the canvas renders
- THEN no compass rose or cardinal labels SHALL be visible

#### Scenario: Sun mode on shows compass

- GIVEN sun simulation mode is active
- WHEN the canvas renders
- THEN the compass rose SHALL be visible in the terrain corner

### Requirement: northAt Mapping to Sun Calculations

The northAt field SHALL define how geographic North maps to canvas coordinates. The sun azimuth (geographic) MUST be rotated by the northAt offset before computing shadow vectors on canvas.

#### Scenario: North at top — standard mapping

- GIVEN northAt = "top", solar azimuth = 90° (geographic East)
- WHEN computing canvas shadow direction
- THEN the shadow vector SHALL point toward canvas Right (East = 90° from North = 0° in canvas)

#### Scenario: North at bottom — 180° rotation

- GIVEN northAt = "bottom", solar azimuth = 0° (geographic North)
- WHEN computing canvas shadow direction
- THEN the shadow vector SHALL point toward canvas Top (North maps to canvas Down, so shadow points Up)

### Requirement: Undo/Redo for northAt

Changes to northAt SHALL be recorded in the history store, enabling undo/redo.

#### Scenario: Undo reverts northAt change

- GIVEN terrain northAt = "top"
- WHEN the user changes northAt to "left"
- AND then presses Undo
- THEN northAt SHALL be "top" again
