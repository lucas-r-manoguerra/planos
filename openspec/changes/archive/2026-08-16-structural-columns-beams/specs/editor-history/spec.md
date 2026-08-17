# Delta for editor-history

## ADDED Requirements

### Requirement: editor-history-4: History snapshot covers the structural slice [ADDED]

The history entry snapshot and the shared snapshot helper (`captureSnapshot` /
`pushState` in `history.store.ts`) MUST include the structural slice — the
project's `Column` and `Beam` entities — exactly as they already include
`floors`, `activeFloorId`, `terrain`, `fixtures`, and `walls`. The snapshot MUST
be extended in ONE place (the shared helper) so every structural action is
recorded, restored, undone, and redone automatically. Restoring an entry MUST
replace the full structural slice (never merge), and MUST restore the exact
snapshot captured for that entry.

#### Scenario: Undo restores the captured structural state

- GIVEN two columns and one beam exist, then a second beam is added (one entry)
- WHEN undo is triggered
- THEN the structural slice returns to exactly the two columns and one beam

#### Scenario: Redo restores the removed element

- GIVEN a column was removed (one entry)
- WHEN undo then redo are triggered
- THEN the column reappears exactly as it was before removal

#### Scenario: Restore replaces, not merges

- GIVEN an entry captured with columns A and B
- WHEN that entry is restored after column C was added
- THEN the structural slice is exactly A and B, with no C

### Requirement: editor-history-5: Structural actions record single undo steps [ADDED]

Structural gestures MUST follow the same granularity contract as fixture and
compass drags (editor-history-1, editor-history-2): one placement, move, or
removal equals exactly one undo step. In-progress strokes MUST NOT create
intermediate entries, and each action MUST be recorded through the shared
snapshot helper so undo/redo stay consistent with the rest of the editor.

#### Scenario: Moving a column is one undo step

- GIVEN a column is dragged across many pointer-move events
- WHEN the drag is released
- THEN exactly one history entry exists for the move

#### Scenario: Mid-stroke history is clean

- GIVEN a beam stroke is in progress
- WHEN the history is inspected before release
- THEN no entries exist for the in-progress stroke
