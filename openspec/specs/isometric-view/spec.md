# Isometric View Specification

## Purpose

A zero-dependency isometric (3/4) preview of the plan: a `ViewMode` toggle
(default 2D), a pure `projectToIsometric` projection in `src/lib/isometric.ts`,
and a preview layer that reuses wall entity geometry at a fixed camera.
Perspective, orbit camera, per-fixture 3D models, and 3D shadows are out of
scope (rule 07.3: no new dependencies without approval).

## Requirements

### Requirement: isometric-view-1: ViewMode toggle, 2D by default

The editor MUST expose a `ViewMode` toggle between `2d` (default) and
`isometric`. Switching to isometric MUST NOT modify plan geometry, and switching
back to 2D MUST restore the exact prior 2D rendering (3D is additive, per the
rollback plan).

#### Scenario: Default view is 2D

- GIVEN the editor opens
- THEN the canvas renders the standard 2D plan

#### Scenario: Toggle round-trip is lossless

- GIVEN a plan rendered in 2D
- WHEN the user toggles to isometric and back to 2D
- THEN the 2D rendering is unchanged

### Requirement: isometric-view-2: Pure projection function

The system MUST provide `projectToIsometric` in `src/lib/isometric.ts` as a pure
function: it MUST NOT import stores or components, MUST receive geometry by
parameter, and MUST be deterministic for identical inputs (lib/ rule 01). The
projection MUST use a fixed camera — no orbit and no 3D zoom.

#### Scenario: Projection is deterministic

- GIVEN the same wall endpoints and camera parameters
- WHEN `projectToIsometric` is called twice
- THEN both results are identical

### Requirement: isometric-view-3: Isometric layer reuses wall entities

In isometric view the system MUST render wall entities (the single source of
truth, `wall-drawing-1`) extruded to `SunSettings.floorHeight`
(`constants.ts:68`, default 280 cm), plus wall-grounded openings, on a dedicated
isometric layer. The layer MUST subscribe to fine-grained selectors and MUST NOT
recompute the projection on pan/zoom (mirroring the shadow layer behavior,
`editor-rendering-2`).

#### Scenario: Walls extrude at floor height

- GIVEN `SunSettings.floorHeight` is 280 cm
- WHEN isometric view renders
- THEN each wall is drawn as a 280 cm extrusion of its segment

#### Scenario: Openings appear on walls

- GIVEN a door anchored to a wall
- WHEN isometric view renders
- THEN the door is drawn on its wall at the anchored offset

#### Scenario: Pan/zoom does not recompute the projection

- GIVEN isometric view is active
- WHEN the user pans or zooms
- THEN the projected geometry is not recomputed

### Requirement: isometric-view-4: No new dependencies

The isometric view MUST be implemented with plain math over existing geometry
types and MUST NOT add any runtime dependency (rule 07.3).

#### Scenario: Bundle has no new 3D library

- GIVEN the isometric view is built
- THEN no three.js or equivalent dependency is added to the project
