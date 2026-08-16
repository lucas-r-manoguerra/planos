# Delta for editor-rendering

## ADDED Requirements

### Requirement: editor-rendering-4: Wall draw preview feedback [ADDED]

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
