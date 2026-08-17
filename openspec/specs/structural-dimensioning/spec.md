# Structural Dimensioning Specification

## Purpose

Automatically annotate structural spans on the active floor — distances
between column centers and beam lengths — reusing the ruler /
`MeasurementLayer` patterns (red committed annotations, labels in meters).
Scope is structural spans ONLY (product decision 4): rooms and walls are NOT
auto-dimensioned. The result is derived state computed from the structural
store, never persisted, and never recomputed on pan/zoom (rule 09).

## Requirements

### Requirement: structural-dimensioning-1: Automatic structural-span annotations

When automatic dimensioning is enabled, the system MUST annotate on the active
floor: (1) the length of every beam; (2) the center-to-center distance of each
pair of columns connected by a beam whose endpoints coincide with column
centers; (3) for columns not connected by a beam, the center-to-center distance
to the nearest other column on the same floor (each column annotated at most
once). The scope MUST be limited to structural spans — no room or wall spans MAY
be annotated.

#### Scenario: Beam length is annotated

- GIVEN a beam from (200, 200) to (700, 200) and dimensioning is enabled
- WHEN the active floor renders
- THEN an annotation shows 5.00 m at the beam midpoint

#### Scenario: Column pair distance is annotated

- GIVEN two columns at (100, 100) and (400, 100) on the active floor
- WHEN the active floor renders
- THEN an annotation shows 3.00 m between the column centers

#### Scenario: Unconnected columns annotate nearest neighbors

- GIVEN three columns at (0, 0), (300, 0), and (600, 0)
- WHEN the active floor renders
- THEN each column is annotated to its nearest neighbor once (two annotations total)

#### Scenario: Rooms and walls are never annotated

- GIVEN a room and a wall on the active floor with dimensioning enabled
- WHEN the active floor renders
- THEN no annotation appears for the room or the wall

#### Scenario: No structural elements, no annotations

- GIVEN a floor with no columns or beams
- WHEN dimensioning is enabled
- THEN no annotations render

### Requirement: structural-dimensioning-2: Annotation rendering pattern

Span annotations MUST render following the `MeasurementLayer` pattern
(MeasurementLayer.tsx:13): red (`#ef4444`) line with end circles, dashed
stroke, and a bold monospace label at the midpoint showing the distance in
meters with two decimals. Annotations MUST be render-only (no hit testing) and
MUST draw on the measurement layer so committed ruler measurements and
structural annotations coexist without duplication.

#### Scenario: Annotation matches the measurement visual language

- GIVEN a structural span of 350 cm
- WHEN the annotation renders
- THEN a red dashed line with end circles and a centered "3.50 m" label appears

#### Scenario: Annotations coexist with ruler measurements

- GIVEN a committed ruler measurement and an enabled structural span
- WHEN the layer renders
- THEN both render on the measurement layer without overlap artifacts

### Requirement: structural-dimensioning-3: Visibility toggle

The system MUST provide a display toggle to show/hide automatic dimensioning
(`structuralDimensioningEnabled`) in the canvas store. The toggle is
session-only display state (rule 05) and MUST NOT be persisted. When disabled,
no structural annotation renders.

#### Scenario: Toggle off hides annotations

- GIVEN dimensioning is enabled and annotations render
- WHEN the user turns the toggle off
- THEN all structural annotations disappear from the active floor

#### Scenario: Toggle state is session-only

- GIVEN the user turns dimensioning off
- WHEN the session reloads
- THEN dimensioning is enabled again

### Requirement: structural-dimensioning-4: No recompute on pan/zoom

Structural span annotations MUST be computed as derived state from the
structural geometry (columns and beams), memoized per floor, and MUST NOT
recompute on pan/zoom (rule 09). Annotations MUST update only when the
structural geometry of the active floor changes (add/move/remove/update).

#### Scenario: Pan/zoom skips dimensioning work

- GIVEN dimensioning is enabled with spans computed
- WHEN the user pans or zooms
- THEN no annotation geometry is recomputed

#### Scenario: Moving a column updates its annotation

- GIVEN a column at (100, 100) annotated against a column at (400, 100)
- WHEN the column moves to (250, 100)
- THEN the annotation updates to 1.50 m and the other annotations stay unchanged

### Requirement: structural-dimensioning-5: Span range guidance (configurable default)

The system SHOULD highlight spans that fall outside a configurable target range
with a warning style (e.g. amber label) to flag unusual structural layouts. The
default range is a configurable constant (placeholder pending verification of
CIRSOC 201 column-grid guidance against the reglamento — rule 06); the system
MUST NOT assert any span range as regulatory fact. When the range is not
verified, the default is a documented application default only.

#### Scenario: Span inside the range renders normal

- GIVEN the configurable default range is 300–600 cm
- WHEN a beam of 450 cm is annotated
- THEN the annotation renders in the normal style

#### Scenario: Span outside the range renders a warning

- GIVEN the configurable default range is 300–600 cm
- WHEN a beam of 900 cm is annotated
- THEN the annotation renders with the warning style
