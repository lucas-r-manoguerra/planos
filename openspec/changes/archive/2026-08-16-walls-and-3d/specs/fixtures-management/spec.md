# Delta for Fixtures Management

## ADDED Requirements

### Requirement: fixtures-management-4: wallId anchors to wall entities

Every opening (door/window) MUST anchor to a wall entity: `Fixture.wallId` MUST
reference a `Wall` id (no longer a room id, `plan.ts:178`), with `wallSide` and
`wallOffset` preserved. Opening placement MUST require a valid wall target, and
MUST NOT create an opening without one.

#### Scenario: Opening placed on a wall records the wall id

- GIVEN the user places a door on a wall
- THEN the fixture's `wallId` is the wall's id, with its side and offset

#### Scenario: Placement without a wall target is rejected

- GIVEN the user clicks far from any wall while placing a door
- THEN no fixture is created

## MODIFIED Requirements

### Requirement: fixtures-management-3: Cascade openings when a wall ceases to exist

Removing a wall MUST remove every opening anchored to it, unless the opening can
be re-anchored to a coincident remaining wall, in which case the opening MUST be
re-anchored preserving its `wallOffset`. Room removal MUST remove the wall
entities materialized from that room's geometry, so its openings cascade through
the same wall rules (mirroring `cascadeOpenings` in `src/lib/walls.ts`).
(Previously: cascade ran on room removal, reassigning openings to the adjacent
room that shared the wall, or dropping them when none existed.)

#### Scenario: Wall removal cleans its openings

- GIVEN a wall with a door anchored to it
- WHEN the wall is removed
- THEN the door is removed as well and no orphaned opening remains

#### Scenario: Coincident wall keeps the opening

- GIVEN an opening anchored to a wall that is overlapped by another wall
- WHEN the anchored wall is removed
- THEN the opening remains, re-anchored to the coincident wall at the same offset

#### Scenario: Room removal cascades through its walls

- GIVEN a room whose wall entities host openings
- WHEN the room is removed
- THEN the room's wall entities are removed and the openings cascade per wall rules
