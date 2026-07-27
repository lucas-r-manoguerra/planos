# Sun Position Specification

## Purpose

Compute solar position (azimuth and elevation) for any geographic location, date, and time using the NOAA simplified solar position algorithm. Provides sunrise/sunset times for display in the sidebar.

## Requirements

| # | Requirement | Strength |
|---|-------------|----------|
| SP-1 | Sun position algorithm SHALL compute azimuth and elevation from latitude, longitude, date, and time-of-day | SHALL |
| SP-2 | Azimuth MUST be measured in degrees from North, clockwise (0–360°) | MUST |
| SP-3 | Elevation MUST be measured in degrees above horizon (−90° to +90°) | MUST |
| SP-4 | Sunrise and sunset times SHALL be computable for any given date and location | SHALL |
| SP-5 | All sun-position computations MUST be pure functions with no side effects | MUST |
| SP-6 | Default location MUST be Gualeguay, Entre Ríos, Argentina (lat: −32.05°, lon: −59.25°) | MUST |
| SP-7 | The SunSettings interface SHALL include: latitude, longitude, date, timeOfDay, floorHeight, isPlaying | SHALL |
| SP-8 | Time-of-day MUST support 5-minute increments (step: 5 min) across a 0–24h range | MUST |

### Requirement: Sun Position Algorithm

The system SHALL compute solar azimuth and elevation using the NOAA simplified algorithm. Inputs: latitude (degrees), longitude (degrees), date (year, month, day), time-of-day (hours decimal). Outputs: azimuth (degrees from North CW), elevation (degrees above horizon).

#### Scenario: Noon sun in Gualeguay on June 21

- GIVEN latitude −32.05°, longitude −59.25°
- WHEN computing solar position for June 21 at 12:00 local
- THEN elevation SHALL be between 30° and 35° (Southern Hemisphere winter noon)
- AND azimuth SHALL be approximately 0° (North)

#### Scenario: Sunrise produces low elevation

- GIVEN latitude −32.05°, longitude −59.25°
- WHEN computing solar position at sunrise time on March 20
- THEN elevation SHALL be approximately 0° (±2°)

### Requirement: Azimuth Convention

Azimuth MUST be measured in degrees from true North, increasing clockwise. North = 0°, East = 90°, South = 180°, West = 270°.

#### Scenario: East sun at morning

- GIVEN latitude −32.05°, longitude −59.25°
- WHEN computing position at 09:00 on March 20
- THEN azimuth SHALL be between 60° and 80° (sun is in the East-Northeast)

### Requirement: Sunrise/Sunset Computation

The system SHALL compute sunrise and sunset times for any given date and location using the same NOAA algorithm inverting elevation to 0°.

#### Scenario: Summer day has longer daylight

- GIVEN latitude −32.05°, longitude −59.25°
- WHEN computing sunrise/sunset for December 21
- THEN the daylight duration SHALL be greater than 14 hours

#### Scenario: Winter day has shorter daylight

- GIVEN latitude −32.05°, longitude −59.25°
- WHEN computing sunrise/sunset for June 21
- THEN the daylight duration SHALL be less than 11 hours

### Requirement: Pure Functions

All sun-position and shadow-projection functions MUST be pure — same inputs always produce same outputs, no mutation, no I/O.

#### Scenario: Deterministic output

- GIVEN identical inputs (lat, lon, date, time)
- WHEN calling the sun position function twice
- THEN both calls SHALL return identical azimuth and elevation values

### Requirement: Default Location

The system MUST default to Gualeguay, Entre Ríos, Argentina (lat: −32.05°, lon: −59.25°) when no user override is provided.

#### Scenario: New project uses Gualeguay coordinates

- GIVEN a user creates a new project
- WHEN the sun settings panel loads for the first time
- THEN latitude SHALL be −32.05 and longitude SHALL be −59.25
