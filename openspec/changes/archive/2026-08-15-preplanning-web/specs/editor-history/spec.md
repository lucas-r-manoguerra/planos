# Editor History Specification

## Purpose

Make drag interactions undo-friendly: one drag = exactly one undo step, with no
history churn from intermediate pointer-move events.

## Requirements

### Requirement: editor-history-1: Fixture drag is one undo step

Dragging a fixture across the canvas MUST record exactly one history entry,
committed when the drag ends. Undoing MUST restore the pre-drag position.

#### Scenario: One drag, one entry

- GIVEN a fixture is dragged across many pointer-move events
- WHEN the drag is released
- THEN exactly one undo step exists for the drag

#### Scenario: Undo restores original position

- GIVEN a fixture was moved in a completed drag
- WHEN undo is triggered once
- THEN the fixture returns to its position before the drag

### Requirement: editor-history-2: Compass drag is one undo step

Rotating the compass / north angle MUST record exactly one history entry per
completed drag, and a single undo MUST restore the previous angle.

#### Scenario: Compass rotation undone

- GIVEN the compass was rotated in a single drag
- WHEN undo is triggered once
- THEN the compass returns to its previous angle

### Requirement: editor-history-3: No intermediate history entries

The history MUST NOT record transient positions while a drag is in progress;
entries MUST be added only when a drag completes.

#### Scenario: Mid-drag history is clean

- GIVEN a drag is in progress
- WHEN the history is inspected before release
- THEN no new entries exist for the in-progress drag
