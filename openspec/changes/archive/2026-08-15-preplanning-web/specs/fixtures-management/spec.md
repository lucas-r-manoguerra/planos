# Fixtures Management Specification

## Purpose

Scope fixtures to a floor, allow deleting a selected fixture with the keyboard,
and remove openings (doors/windows) when their host room is deleted.

## Requirements

### Requirement: fixtures-management-1: Fixtures scoped per floor

Every fixture MUST record the `floorId` of the floor it belongs to. The editor
MUST render only the fixtures of the active floor, and adding a fixture MUST
assign the active floor. Fixtures persisted without a `floorId` MUST be assigned
to the first floor on load.

#### Scenario: Floor switch filters fixtures

- GIVEN two floors each containing fixtures
- WHEN the user switches to floor A
- THEN only floor A's fixtures render on the canvas

#### Scenario: Legacy fixture without floorId

- GIVEN a persisted fixture lacking a `floorId`
- WHEN the project loads
- THEN the fixture is assigned to the first floor and rendered there

### Requirement: fixtures-management-2: Keyboard delete of fixtures

When a fixture is selected and canvas has keyboard focus, pressing `Delete` or
`Backspace` MUST remove the fixture. The removal MUST be recorded in the undo
history. When focus is inside a text input, these keys MUST NOT delete a fixture.

#### Scenario: Delete selected fixture

- GIVEN a fixture is selected and canvas focus is active
- WHEN `Delete` is pressed
- THEN the fixture is removed and a single undo step records the removal

#### Scenario: Typing in an input does not delete

- GIVEN focus is inside a text input
- WHEN `Backspace` is pressed
- THEN the text is edited and no fixture is removed

### Requirement: fixtures-management-3: Cascade-delete openings with rooms

Removing a room MUST also remove every opening (door/window) anchored to a wall
of that room when the wall ceases to exist. Openings anchored to walls that
remain (e.g. shared walls) MUST NOT be removed.

#### Scenario: Room removal cleans its openings

- GIVEN a room with a door anchored to one of its walls
- WHEN the room is removed
- THEN the door is removed as well and no orphaned opening remains

#### Scenario: Shared wall keeps its opening

- GIVEN an opening anchored to a wall shared by two rooms
- WHEN one of the rooms is removed
- THEN the opening remains because the wall still exists
