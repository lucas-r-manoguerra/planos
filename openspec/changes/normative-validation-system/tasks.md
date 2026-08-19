# Tasks: Normative Validation System

## Task 1: Normative Rules Constants
**Files**: `src/lib/normative-rules.ts` (NEW)
**Lines**: ~80
**Dependencies**: None

Create the constants file with all normative values:
- `MIN_DIMENSIONS` per RoomType (CABA R1)
- `LIGHTING_RATIOS` per RoomType (CIRSOC 201 Table 3.1.3)
- `DEFAULT_SETBACKS` (CABA R1)
- `MIN_CLEAR_PASSAGE` (60cm)
- `MIN_STAIR_REST`, `MIN_HEADROOM`, `MAX_STAIR_SLOPE`, `MIN_STAIR_WIDTH` (IRAM 4001)
- `MIN_GARAGE` (250×500cm)
- `MIN_SUN_HOURS` (2h)
- `COLUMN_ALIGNMENT_TOLERANCE` (5cm)

---

## Task 2: Validation Types + Store
**Files**: `src/types/plan.ts`, `src/stores/validation.store.ts` (NEW)
**Lines**: ~120
**Dependencies**: Task 1

### plan.ts changes:
- Add `Violation` interface
- Add `SetbackConfig` type to `Terrain`
- Add `Wall.type` optional field

### validation.store.ts:
- `useValidationStore` with violations array
- Toggle states for each overlay
- `recompute()` function
- Selectors: `getViolationsByRoom`, `getErrorCount`, `getWarningCount`

---

## Task 3: Core Validation Engine
**Files**: `src/lib/normative-validation.ts` (NEW)
**Lines**: ~300
**Dependencies**: Task 1, Task 2

Implement pure validator functions:
- `validateMinDimensions(rooms)` — check area + side length
- `validateNaturalLighting(rooms, fixtures)` — window/floor ratio
- `validateBathroom(rooms, fixtures)` — fixture spacing
- `validateStairs(fixtures)` — IRAM compliance (extend calculateStairs)
- `validateGarage(rooms, fixtures)` — min dimensions
- `validateSetbacks(rooms, terrain)` — room vs setback lines
- `validateStructuralContinuity(columns, floors)` — column alignment
- `validateFurnitureCirculation(rooms, fixtures)` — 60cm passages
- `validateAll(state)` — runs all validators, returns combined Violation[]

---

## Task 4: Migration v5 → v6
**Files**: `src/lib/migrate.ts`, `src/lib/storage.ts`
**Lines**: ~40
**Dependencies**: Task 2

- Add v5→v6 migration: add `type: "interior"` to all walls, add `setbacks` to terrain
- Update `CURRENT_VERSION` to 6
- Ensure backward compatibility

---

## Task 5: Room Area Labels
**Files**: `src/components/canvas/RoomLayer.tsx`
**Lines**: ~50
**Dependencies**: Task 2

- Add `<Text>` inside each room `<Group>` showing m²
- Format: "{value} m²" with 1 decimal
- Center in room, monospace 11px
- Hidden if room < 80×60 cm
- Color adapts to room fill brightness

---

## Task 6: Automatic Dimensioning (Cotas)
**Files**: `src/components/canvas/CotaDimension.tsx` (NEW), `src/components/canvas/MeasurementLayer.tsx`
**Lines**: ~100
**Dependencies**: Task 2

### CotaDimension.tsx:
- Component: renders dimension line between two points with value text
- End markers (perpendicular ticks)
- Non-interactive

### MeasurementLayer.tsx:
- Add cotas toggle integration
- When enabled, render CotaDimension for each room side (top, left)
- Memoized computation

---

## Task 7: Wall Types
**Files**: `src/components/canvas/WallLayer.tsx`, `src/lib/wall-utils.ts`
**Lines**: ~80
**Dependencies**: Task 2, Task 4

- Auto-detect wall type: walls touching terrain edge → exterior
- Visual: exterior walls strokeWidth 3, interior strokeWidth 1
- Medianera: hatching pattern (diagonal lines)
- Warning if thickness below minimum for type
- Override via property panel (future)

---

## Task 8: Setback Layer
**Files**: `src/components/canvas/SetbackLayer.tsx` (NEW)
**Lines**: ~100
**Dependencies**: Task 2, Task 4

- Draw dashed orange lines at setback distances
- Respect `terrain.front` orientation
- Lines are non-interactive
- Toggle via validation store

---

## Task 9: Validation Overlay Layer
**Files**: `src/components/canvas/ValidationOverlayLayer.tsx` (NEW)
**Lines**: ~120
**Dependencies**: Task 2, Task 3

- Top-most Konva layer
- Renders ⚠️ badges near rooms with violations
- Badge position: room top-right corner
- Badge count shows number of violations
- Hover tooltip with details
- Color: red for errors, amber for warnings

---

## Task 10: Sun Hours Calculation
**Files**: `src/lib/sun-hours.ts` (NEW)
**Lines**: ~120
**Dependencies**: Task 1, solar.ts

- `computeSunHoursForRoom()` async function
- Sample sun position every 30min from 8:00–16:00 on June 21
- For each sample, check if room center is in shadow
- Uses existing `getSunPosition()` and `computeShadowPolygon()`
- Returns estimated hours
- Cached, only recompute on relevant changes

---

## Task 11: Validation Panel (Sidebar)
**Files**: `src/components/panel/ValidationPanel.tsx` (NEW)
**Lines**: ~150
**Dependencies**: Task 2, Task 3

- Collapsible sidebar panel
- Groups violations by category: Dimensiones, Iluminación, Seguridad, Estructural, Circulación
- Each item: severity icon + room name + message + normative ref link
- Click → select room on canvas
- Badge count on toolbar button
- Toggle visibility

---

## Task 12: Tests
**Files**: `tests/normative-validation.test.ts` (NEW), `tests/normative-rules.test.ts` (NEW)
**Lines**: ~200
**Dependencies**: Task 1, Task 3

- Unit tests for each validator function
- Test edge cases: empty rooms, no windows, single fixture, etc.
- Test migration v5→v6
- Test sun hours calculation with known values

---

## Task 13: Integration + Wiring
**Files**: Multiple (canvas.tsx, toolbar, panels)
**Lines**: ~100
**Dependencies**: All previous tasks

- Wire ValidationOverlayLayer into PlanCanvas
- Wire SetbackLayer into PlanCanvas
- Add cotas toggle to toolbar
- Add validation panel toggle to toolbar
- Connect validation store to all layers
- Add RoomType COCHERA if needed for garage detection

---

## Task 14: Verification
**Files**: None (verification only)
**Lines**: 0
**Dependencies**: All previous tasks

- `bun lint` — clean
- `bunx tsc --noEmit` — clean
- `bun run build` — green
- `bun test` — all tests pass (existing 292 + new ~50)
- Manual test: create rooms, add windows, check lighting validation
- Manual test: place furniture, check circulation warnings
- Manual test: set setbacks, verify lines appear
- Manual test: multi-floor, check column alignment

---

## Execution Order (Parallelizable)

```
Phase 1 (parallel):
  Task 1: normative-rules.ts
  Task 12: tests (can start writing test cases)

Phase 2 (parallel, depends on Task 1):
  Task 2: types + store
  Task 10: sun-hours.ts

Phase 3 (parallel, depends on Task 2):
  Task 3: validation engine
  Task 4: migration
  Task 5: room area labels
  Task 6: cotas
  Task 7: wall types
  Task 8: setback layer

Phase 4 (depends on Task 3):
  Task 9: validation overlay
  Task 11: validation panel

Phase 5 (depends on all):
  Task 13: integration
  Task 14: verification
```

## Review Workload Forecast

- Estimated total: ~1500–1800 lines across ~15 files
- Chained PRs: Yes (auto-chain)
- PR 1: Rules + Types + Store + Migration (~240 lines)
- PR 2: Validation Engine + Tests (~500 lines)
- PR 3: Canvas Overlays (Areas, Cotas, Setbacks, Wall Types) (~330 lines)
- PR 4: Validation Overlay + Panel + Sun Hours (~390 lines)
- PR 5: Integration + Final Verification (~100 lines)
