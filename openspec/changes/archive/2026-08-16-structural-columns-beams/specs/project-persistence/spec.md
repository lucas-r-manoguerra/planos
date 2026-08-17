# Delta for project-persistence

## MODIFIED Requirements

### Requirement: project-persistence-4: Import/export JSON and legacy migration [CHANGED]

The system MUST export the active project as a downloadable JSON snapshot
including wall entities and structural elements (schema v5) and MUST import a
valid JSON snapshot into a project, migrating it to v5 when older. On first load
with legacy single-key data and no new-format data, the system MUST migrate the
legacy data into the project list without data loss and MUST keep the legacy key
intact.
(Previously: export/import carried wall entities at v4, with no structural
elements.)

#### Scenario: Export/import round-trip

- GIVEN an exported project JSON file
- WHEN it is imported in a fresh browser
- THEN the project is restored with its floors, rooms, walls, fixtures, and structural elements

#### Scenario: Legacy data migrates on load

- GIVEN legacy data exists under the old single key and no new-format data
- WHEN the app loads
- THEN the legacy data appears as a project and the legacy key is preserved

#### Scenario: Invalid JSON is rejected

- GIVEN a malformed JSON file is chosen for import
- WHEN the import is attempted
- THEN an error is surfaced and the editor state is unchanged

## ADDED Requirements

### Requirement: project-persistence-6: v4→v5 migration adds the structural slice [ADDED]

Loading or importing a project at v4 MUST migrate it to v5: add a `structural`
slice to `ProjectData` initialized to an empty array, set `version: 5`, and
bump `CURRENT_VERSION` in `src/lib/storage.ts`. The migration MUST be
idempotent and additive: it MUST NOT delete, rewrite, or reorder existing
fields (walls, fixtures, floors, terrain, settings), MUST NOT assign
floor-scoped structural entities to floors that do not exist, and MUST follow
the existing `migrateProjectData` guard pattern in `src/lib/migrate.ts`
(return data unchanged when `version >= 5`). Importing JSON without a
`structural` key MUST normalize to an empty array rather than fail. The legacy
single-key backup MUST remain intact until import is verified.

#### Scenario: v4 project loads with an empty structural slice

- GIVEN a v4 project with walls but no structural key
- WHEN the project loads
- THEN `version` becomes 5 and `structural` is an empty array

#### Scenario: Migration is additive and idempotent

- GIVEN a v4 project with walls, fixtures, and a sun configuration
- WHEN the project loads and loads again
- THEN the second load returns the data unchanged, and walls, fixtures, and settings are preserved

#### Scenario: Missing structural key normalizes to empty

- GIVEN an imported JSON snapshot without a `structural` key
- WHEN the snapshot is imported
- THEN the project loads with `structural: []` and no import error

#### Scenario: Round-trip preserves structural elements

- GIVEN a project with a column and a beam at v5
- WHEN it is exported and re-imported
- THEN the column and beam are restored with the same id, floor, and dimensions

#### Scenario: Migration guard skips v5 data

- GIVEN a project already at v5
- WHEN it loads again
- THEN the data is returned unchanged
