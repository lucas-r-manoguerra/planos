# Floor Overlay Specification

## Purpose

Let the user align the active floor against the adjacent floor by rendering the
adjacent floor's structure (columns, beams) and walls in transparency over the
active floor (product decision 3). The overlay is a render-only aid for
alignment: it MUST NOT participate in geometry, selection, or history. Toggling
is session-only display state (rule 05) and MUST NOT be persisted.

## Requirements

### Requirement: floor-overlay-1: Overlay toggle

The system MUST provide a display toggle (`floorOverlayEnabled`) in the canvas
store. When enabled, the overlay renders on the active floor; when disabled, it
MUST NOT render. The toggle is session-only and MUST NOT be persisted across
reloads.

#### Scenario: Toggle on shows the overlay

- GIVEN two floors exist and the toggle is off
- WHEN the user enables the toggle
- THEN the adjacent floor's structure and walls render over the active floor

#### Scenario: Toggle off hides the overlay

- GIVEN the overlay is rendering
- WHEN the user disables the toggle
- THEN no overlay shapes remain on the active floor

#### Scenario: Toggle state is session-only

- GIVEN the user enabled the overlay
- WHEN the session reloads
- THEN the overlay is off again

### Requirement: floor-overlay-2: Adjacent floor selection

The overlay MUST show the floor whose level is nearest to the active floor's
level (deterministic tie-break: when two floors are equidistant, the floor
below wins). When the active floor is the only floor, or has no other floor at
a different level, the overlay MUST render nothing.

#### Scenario: Nearest floor by level is shown

- GIVEN floors at levels 0, 3, and 6, with level 3 active
- WHEN the overlay is enabled
- THEN the overlay renders floor at level 0 (nearest below, equidistant tie-break)

#### Scenario: Only floor shows no overlay

- GIVEN a project with a single floor
- WHEN the overlay is enabled
- THEN nothing renders

### Requirement: floor-overlay-3: Overlay content and transparency

The overlay MUST render ONLY the adjacent floor's `Wall` entities and structural
elements (`Column`, `Beam`) from their stores — no rooms, fixtures, or
annotations. Overlay shapes MUST render semi-transparent (opacity below 1) and
visually distinct from the active floor's solid shapes.

#### Scenario: Structure and walls only

- GIVEN an adjacent floor with walls, columns, beams, and fixtures
- WHEN the overlay is enabled
- THEN walls, columns, and beams render translucent and fixtures do not render

#### Scenario: Translucent rendering

- GIVEN the overlay is enabled
- WHEN the adjacent floor's wall renders
- THEN it renders with an opacity value below 1

### Requirement: floor-overlay-4: Render-only, non-interactive

Overlay shapes MUST be render-only: they MUST NOT respond to clicks, selection,
drag, or deletion, and MUST NOT affect snap targets or placement of new
geometry on the active floor. Overlay drawing MUST NOT create history entries.

#### Scenario: Overlay shapes are not selectable

- GIVEN an overlay wall is visible under the cursor
- WHEN the user clicks it
- THEN nothing is selected and no history entry is recorded

#### Scenario: Overlay does not capture snap

- GIVEN an overlay column overlaps the active floor
- WHEN the user draws a beam ending near it
- THEN the beam does not snap to the overlay column's center

### Requirement: floor-overlay-5: Performance

The overlay layer MUST be memoized and subscribe to fine selectors for the
adjacent floor's walls and structural elements. Overlay geometry MUST NOT
recompute on pan/zoom (rule 09) and MUST NOT recompute when the active floor's
own geometry changes.

#### Scenario: Pan/zoom skips overlay work

- GIVEN the overlay is rendering
- WHEN the user pans or zooms
- THEN the overlay geometry is not recomputed

#### Scenario: Editing the active floor leaves the overlay stable

- GIVEN an overlay is rendering from the adjacent floor
- WHEN a wall on the active floor is moved
- THEN the overlay shapes stay unchanged
