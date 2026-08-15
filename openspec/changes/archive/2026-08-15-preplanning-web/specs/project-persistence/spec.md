# Project Persistence Specification

## Purpose

Replace the single autosave slot with a list of named projects, explicit
save/load/clear actions, JSON import/export, and migration of legacy storage.

## Requirements

### Requirement: project-persistence-1: Multiple named projects

The system MUST support a list of named projects, each persisted under its own
storage key, with the active project tracked. The project list MUST be available
in the editor UI.

#### Scenario: Project list shows saved projects

- GIVEN two saved projects exist
- WHEN the project list is opened
- THEN both projects are listed and the active one is marked

### Requirement: project-persistence-2: Rename project

The user MUST be able to rename the active project. The new name MUST be
persisted and reflected in the project list and the editor.

#### Scenario: Rename persists

- GIVEN an active project named "Mi Plano"
- WHEN it is renamed to "Casa 2"
- THEN the list shows "Casa 2" and the name survives a reload

### Requirement: project-persistence-3: Save, load, and clear project

The system MUST keep autosaving the active project and MUST provide explicit
Save, Load, and Clear-project actions. Clearing MUST remove the stored project
data and reset the editor, and MUST require confirmation.

#### Scenario: Clear project after confirmation

- GIVEN an active project with data
- WHEN the user confirms Clear project
- THEN the project's stored data is removed and the editor resets to empty

#### Scenario: Cancelled clear changes nothing

- GIVEN the user selects Clear project
- WHEN the confirmation is cancelled
- THEN the project data remains untouched

### Requirement: project-persistence-4: Import/export JSON and legacy migration

The system MUST export the active project as a downloadable JSON snapshot and
MUST import a valid JSON snapshot into a project. On first load with legacy
single-key data and no new-format data, the system MUST migrate the legacy data
into the project list without data loss and MUST keep the legacy key intact.

#### Scenario: Export/import round-trip

- GIVEN an exported project JSON file
- WHEN it is imported in a fresh browser
- THEN the project is restored with its floors, rooms, and fixtures

#### Scenario: Legacy data migrates on load

- GIVEN legacy data exists under the old single key and no new-format data
- WHEN the app loads
- THEN the legacy data appears as a project and the legacy key is preserved

#### Scenario: Invalid JSON is rejected

- GIVEN a malformed JSON file is chosen for import
- WHEN the import is attempted
- THEN an error is surfaced and the editor state is unchanged
