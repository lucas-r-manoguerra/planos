# Terrain Specification (Modified)

## Purpose

Extend the Terrain type with a `northAt` field for cardinal orientation and persist sun settings to localStorage with version migration.

## MODIFIED Requirements

### Requirement: Terrain Type Extension

The Terrain interface SHALL include a `northAt` field with type `"top" | "bottom" | "left" | "right"`, defaulting to `"top"`. Existing Terrain objects without `northAt` MUST be treated as `northAt: "top"` for backward compatibility.

(Previously: Terrain had no orientation field)

#### Scenario: New terrain defaults to northAt "top"

- GIVEN a terrain object created without specifying northAt
- WHEN the system reads the terrain
- THEN northAt SHALL default to "top"

#### Scenario: Existing serialized terrain without northAt

- GIVEN a localStorage entry with a Terrain object lacking northAt
- WHEN the system loads the terrain
- THEN northAt SHALL be "top" (backward compatible default)

### Requirement: localStorage Persistence

Sun settings (latitude, longitude, date, floorHeight, northAt) SHALL be persisted to localStorage under a versioned key. The system SHALL support migration from unversioned to versioned storage.

#### Scenario: Save and restore sun settings

- GIVEN sun settings with lat −33.0, lon −60.0, date "2025-01-15", floorHeight 280
- WHEN the user closes and reopens the app
- THEN all sun settings SHALL be restored to the saved values

#### Scenario: Version migration from v0 to v1

- GIVEN a localStorage key `planos-sun-settings` with unversioned data (no `version` field)
- WHEN the app loads
- THEN the data SHALL be migrated to version 1 format
- AND the original values SHALL be preserved

### Requirement: northAt in TerrainStore

The TerrainStore SHALL expose a `setNorthAt` action that updates the terrain's northAt field and records history.

#### Scenario: setNorthAt updates terrain

- GIVEN terrain northAt = "top"
- WHEN setNorthAt("left") is called
- THEN terrain.northAt SHALL be "left"
- AND the change SHALL be recorded in history
