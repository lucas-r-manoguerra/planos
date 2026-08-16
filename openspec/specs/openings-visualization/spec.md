# Openings Visualization Specification

## Purpose

Improve the 2D glyphs for doors and windows in `FixtureLayer` so that hinge
side, opening arc, and sliding behavior are visually distinguishable, and add
new door/window subtypes only when they reuse the existing render path cheaply
(proposal default: glyph quality first, cheap subtypes only).

## Requirements

### Requirement: openings-visualization-1: Door and window glyphs convey state

Door glyphs MUST visually distinguish: open leaf (hinge + leaf + opening arc),
closed leaf, and sliding track — driven by the props already consumed by
`FixtureLayer` (`isOpen`, `sliding`, `openingAngle`, `openingSide`). Window
glyphs MUST distinguish opening pane, sliding, and closed states. Glyphs MUST
preserve selection, drag, rotation, and keyboard-delete behavior.

#### Scenario: Open door draws leaf and arc

- GIVEN a door with `isOpen: true` and `openingAngle: 90`
- WHEN the fixture renders
- THEN a leaf and a dashed opening arc are drawn from the hinge side

#### Scenario: Sliding door draws track

- GIVEN a door with `sliding: true`
- WHEN the fixture renders
- THEN the sliding panel and its track line render

#### Scenario: Glyph interactions are preserved

- GIVEN a door glyph is rendered
- WHEN the user clicks, drags, or presses `Delete` on it
- THEN it selects, moves, and deletes as before

### Requirement: openings-visualization-2: New subtypes only when cheap

New door/window subtypes MAY be added only when they reuse existing props and
render paths (no new rendering machinery). Each new subtype MUST be added in the
same change to the subtype union in `src/types/plan.ts`, the catalog in
`src/lib/fixtures-catalog.ts`, and the renderer in `FixtureLayer` (domain-change
rule 03: type + catalog + render in one PR).

#### Scenario: New subtype renders via existing path

- GIVEN a new door subtype is added to the union and the catalog
- WHEN a fixture of that subtype renders
- THEN it renders through the existing door glyph path without new machinery

#### Scenario: Catalog entry drives the glyph

- GIVEN a new window subtype with distinct width and color
- WHEN the fixture is placed
- THEN the glyph uses the catalog dimensions and color
