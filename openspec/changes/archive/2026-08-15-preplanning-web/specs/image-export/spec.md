# Image Export Specification

## Purpose

Produce professional-ready PNG exports of the floor plan that include the compass
overlay, offer a scale option for high-resolution output, and are reachable from
the editor UI.

## Requirements

### Requirement: image-export-1: Full plan with compass overlay

The system MUST export a PNG of the complete floor plan including the HTML
compass overlay. The export MUST NOT rely on capturing only the first canvas
element.

#### Scenario: Compass included in export

- GIVEN the compass is visible in the editor
- WHEN the user exports a PNG
- THEN the exported image contains the compass overlay

#### Scenario: Hidden compass excluded

- GIVEN the compass is hidden in the editor
- WHEN the user exports a PNG
- THEN the exported image does not contain the compass

### Requirement: image-export-2: Scale option for high resolution

The export UI MUST offer a scale option (e.g. 1x and 2x) and MUST produce an
image whose pixel dimensions scale accordingly.

#### Scenario: 2x export is higher resolution

- GIVEN the user selects the 2x scale option
- WHEN the export completes
- THEN the PNG dimensions are approximately double the 1x export
- AND the rendered shapes remain sharp

### Requirement: image-export-3: Export reachable and downloadable

The export action MUST be reachable from the editor UI and MUST produce a valid
downloadable `.png` file.

#### Scenario: Export downloads a PNG

- GIVEN the user triggers Export from the editor
- WHEN the export completes
- THEN the browser downloads a valid PNG file containing the floor plan
