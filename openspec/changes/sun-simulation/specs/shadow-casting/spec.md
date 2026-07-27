# Shadow Casting Specification

## Purpose

Project 2D shadow polygons for each room based on solar position, floor height, and north orientation. Shadows render between the terrain and room layers for accurate visual layering.

## Requirements

| # | Requirement | Strength |
|---|-------------|----------|
| SC-1 | Shadow polygon SHALL be computed from room corners projected along the shadow vector | SHALL |
| SC-2 | Shadow vector direction MUST be derived from solar azimuth + terrain northAt orientation | MUST |
| SC-3 | Shadow length MUST equal floorHeight × cot(elevation) in cm | MUST |
| SC-4 | Shadow color MUST be black at 15% opacity (`rgba(0,0,0,0.15)`) | MUST |
| SC-5 | Shadows MUST NOT render when solar elevation < 2° | MUST |
| SC-6 | Shadows MUST NOT render when projected shadow length > 5000 cm (50 m) | MUST |
| SC-7 | ShadowLayer MUST render between TerrainLayer and RoomLayer in canvas z-order | MUST |
| SC-8 | Shadow recomputation SHALL occur only when sun position or room geometry changes | SHALL |
| SC-9 | Each room's shadow SHALL be an independent polygon (no cross-room occlusion in V1) | SHALL |

### Requirement: Shadow Vector from Solar Azimuth

The shadow vector direction MUST be opposite to the sun's azimuth, rotated by the terrain's northAt mapping. Shadow length MUST equal `floorHeight × cot(elevation)` in centimeters.

#### Scenario: Sun due North casts shadow South

- GIVEN terrain northAt = "top", solar azimuth = 0° (North), elevation = 45°, floorHeight = 280 cm
- WHEN computing shadow for a room at (100, 100)
- THEN the shadow polygon SHALL extend in the South direction (positive Y in canvas)
- AND shadow length SHALL be 280 cm (280 × cot(45°))

#### Scenario: Low sun produces long shadows

- GIVEN solar elevation = 5°, floorHeight = 280 cm
- WHEN computing shadow length
- THEN shadow length SHALL be approximately 3194 cm (280 × cot(5°))

### Requirement: Shadow Polygon from Room Corners

For each room, the system SHALL take all 4 corner points and project each along the shadow vector. The resulting 8 points (4 original + 4 projected) form the shadow polygon.

#### Scenario: Rectangular room produces trapezoid shadow

- GIVEN a room with corners (0,0), (300,0), (300,200), (0,200)
- AND shadow vector pointing South with length 280 cm
- WHEN computing the shadow polygon
- THEN the polygon SHALL contain 8 vertices
- AND the projected corners SHALL be offset by (0, 280) from each original corner

### Requirement: Elevation Threshold

Shadows MUST NOT render when solar elevation is below 2°, as the shadow would be unrealistically long and visually noisy.

#### Scenario: Near-horizon sun suppresses shadows

- GIVEN solar elevation = 1.5°
- WHEN the canvas renders shadows
- THEN no shadow polygons SHALL be drawn for any room

### Requirement: Shadow Length Cap

Shadows MUST NOT render when the projected shadow length exceeds 5000 cm (50 m), to avoid rendering artifacts far outside the terrain.

#### Scenario: Very low sun with long theoretical shadow

- GIVEN solar elevation = 0.5°, floorHeight = 280 cm
- WHEN computing shadow length
- THEN shadow length = 31942 cm which exceeds 5000 cm
- AND no shadow SHALL be rendered

### Requirement: Shadow Layer Z-Order

ShadowLayer MUST render between TerrainLayer and RoomLayer in the canvas composition, so shadows appear on the terrain but behind rooms.

#### Scenario: Visual layering order

- GIVEN terrain, rooms, and shadows are all present
- WHEN the canvas renders
- THEN shadow polygons SHALL appear above the terrain fill
- AND shadow polygons SHALL appear below the room rectangles

### Requirement: Selective Recomputation

Shadow recomputation SHALL occur only when the sun position changes (time slider moves) or room geometry changes (move/add/remove). Stale shadows SHALL not recompute on unrelated state changes.

#### Scenario: Moving a room triggers shadow update

- GIVEN sun mode is active with shadows visible
- WHEN a room is moved from (100, 100) to (200, 200)
- THEN the shadow polygon for that room SHALL update to the new position
- AND other rooms' shadows SHALL remain unchanged
