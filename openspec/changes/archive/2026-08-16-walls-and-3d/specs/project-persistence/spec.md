# Delta for Project Persistence

## ADDED Requirements

### Requirement: project-persistence-5: v3→v4 migration materializes walls

Loading or importing a project older than v4 MUST migrate it to v4: materialize
each floor's room-derived walls as `Wall` entities, remap every opening's
`wallId` from the room id to the wall entity that covers the anchored segment
(preserving `wallSide` and `wallOffset`), and set `version: 4`. Migration MUST
be idempotent and MUST NOT delete or rewrite unrelated fields (same pattern as
the v2→v3 `migrateProjectData` in `src/lib/migrate.ts`). The legacy single-key
backup (`planos-project`, `storage.ts:31`) MUST remain intact until import is
verified.

#### Scenario: Old project loads with walls and remapped openings

- GIVEN a v3 project with a room and a door anchored to that room
- WHEN the project loads
- THEN wall entities exist per floor and the door's `wallId` points to a wall entity

#### Scenario: Migration is idempotent

- GIVEN a project already at v4
- WHEN the project loads again
- THEN the data is returned unchanged

#### Scenario: Openings keep their position

- GIVEN a door anchored at offset 100 on a room's top wall
- WHEN migration runs
- THEN the door is anchored at offset 100 on the corresponding wall entity

## MODIFIED Requirements

### Requirement: project-persistence-4: Import/export JSON and legacy migration

The system MUST export the active project as a downloadable JSON snapshot
including wall entities (schema v4) and MUST import a valid JSON snapshot into a
project, migrating it to v4 when older. On first load with legacy single-key
data and no new-format data, the system MUST migrate the legacy data into the
project list without data loss and MUST keep the legacy key intact.
(Previously: export/import carried floors, rooms, and fixtures at v3, with no
wall entities.)

#### Scenario: Export/import round-trip

- GIVEN an exported project JSON file
- WHEN it is imported in a fresh browser
- THEN the project is restored with its floors, rooms, walls, and fixtures

#### Scenario: Legacy data migrates on load

- GIVEN legacy data exists under the old single key and no new-format data
- WHEN the app loads
- THEN the legacy data appears as a project and the legacy key is preserved

#### Scenario: Invalid JSON is rejected

- GIVEN a malformed JSON file is chosen for import
- WHEN the import is attempted
- THEN an error is surfaced and the editor state is unchanged
