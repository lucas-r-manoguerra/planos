# Dark Mode Specification

## Purpose

Make dark mode work: the Tailwind `dark:` variant must be driven by an explicit
user toggle (not the OS preference), the editor canvas must be dark-safe, and the
chosen theme must persist across sessions.

## Requirements

### Requirement: dark-mode-1: Tailwind dark variant via custom variant

The global stylesheet MUST declare `@custom-variant dark` so that `dark:`
utilities activate on an explicit `.dark` class on the root element, independent
of `prefers-color-scheme`.

#### Scenario: Light OS, dark class wins

- GIVEN the OS prefers light colors
- WHEN the `.dark` class is present on the root element
- THEN `dark:`-styled elements render in dark theme

#### Scenario: Dark OS, no opt-in

- GIVEN the OS prefers dark colors
- WHEN no `.dark` class is present
- THEN `dark:`-styled elements do not activate and the app stays in the light theme

### Requirement: dark-mode-2: Toggle switches and persists theme

The system MUST provide a theme toggle that adds/removes the `.dark` class,
re-themes both the editor and the docs, and MUST persist the user's choice. On
load, the rendered theme MUST match the stored preference.

#### Scenario: Toggle re-themes app

- GIVEN the user is on the light theme
- WHEN the toggle is activated
- THEN the `.dark` class is applied, the editor and docs re-theme, and the choice is persisted

#### Scenario: Stored preference restored

- GIVEN the user previously chose dark theme
- WHEN the app loads
- THEN the dark theme is applied on first render

### Requirement: dark-mode-3: Dark-safe canvas rendering

In dark theme, all canvas domains MUST remain distinguishable: the grid MUST be
visible against the canvas background, and terrain, rooms, walls, and fixtures
MUST contrast sufficiently to be identified.

#### Scenario: Grid visible in dark theme

- GIVEN dark theme is active
- WHEN the grid layer renders
- THEN grid lines are visible against the dark canvas background

#### Scenario: Shapes distinguishable in dark theme

- GIVEN dark theme is active
- WHEN terrain, rooms, and fixtures render
- THEN each shape type remains visually distinguishable from the background
