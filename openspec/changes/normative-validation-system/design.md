# Design: Normative Validation System

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Canvas Layers                         │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ RoomAreaLabel│  │CotaDimension │  │ SetbackLayer  │  │
│  │ (inside Room │  │ (dimension   │  │ (terrain      │  │
│  │  Layer)      │  │  lines)      │  │  setbacks)    │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │           │
│  ┌──────┴────────────────┴───────────────────┴───────┐  │
│  │         ValidationOverlayLayer.tsx                 │  │
│  │  (warning badges, colored indicators, alignment)   │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │                               │
└─────────────────────────┼───────────────────────────────┘
                          │ reads
┌─────────────────────────┴───────────────────────────────┐
│              useValidationStore                          │
│  violations: Violation[]                                 │
│  recomputed on state change (debounced 300ms)            │
└──────────────────────────┬──────────────────────────────┘
                           │ calls
┌──────────────────────────┴──────────────────────────────┐
│           normative-validation.ts (pure)                  │
│  validateAll(state) → Violation[]                        │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐                  │
│  │ normative-rules│  │  sun-hours.ts  │                  │
│  │ (constants)    │  │  (async calc)  │                  │
│  └────────────────┘  └────────────────┘                  │
└──────────────────────────────────────────────────────────┘
```

## Data Flow

```
State change (room move, fixture add, etc.)
    ↓
useValidationStore.recompute()
    ↓ (debounced 300ms)
normative-validation.validateAll(fullState)
    ↓
Violation[] → stored in validationStore
    ↓
ValidationOverlayLayer re-renders (selects violations)
    ↓
Konva renders badges, lines, indicators
```

## File Design

### 1. `src/lib/normative-rules.ts` — Constants

```typescript
// Resolución 5/2022, CIRSOC 201, IRAM 4001 constants
export const MIN_DIMENSIONS: Record<RoomType, { minArea: number; minSide: number }> = {
  [RoomType.DORMITORIO]: { minArea: 10.50, minSide: 300 },
  [RoomType.COCINA]: { minArea: 4.50, minSide: 150 },
  [RoomType.BAÑO]: { minArea: 4.00, minSide: 160 },
  [RoomType.ESTAR_COMEDOR]: { minArea: 18.00, minSide: 300 },
  [RoomType.LAVADERO]: { minArea: 2.25, minSide: 150 },
  [RoomType.PASILLO]: { minArea: 0, minSide: 100 },
};

export const LIGHTING_RATIOS: Record<string, { minRatio: number; minVentilated?: number }> = {
  [RoomType.DORMITORIO]: { minRatio: 1/6 },
  [RoomType.COCINA]: { minRatio: 1/10, minVentilated: 0.50 },
  [RoomType.BAÑO]: { minRatio: 0, minVentilated: 0.50 },
  [RoomType.ESTAR_COMEDOR]: { minRatio: 1/8 },
  [RoomType.LAVADERO]: { minRatio: 1/10, minVentilated: 0.50 },
};

export const DEFAULT_SETBACKS = { front: 300, left: 150, right: 150, rear: 300 };
export const MIN_CLEAR_PASSAGE = 60; // cm
export const MIN_STAIR_REST = 80; // cm
export const MIN_HEADROOM = 210; // cm
export const MAX_STAIR_SLOPE = 40; // degrees
export const MIN_STAIR_WIDTH = 90; // cm
export const MIN_GARAGE = { width: 250, height: 500 };
export const MIN_SUN_HOURS = 2; // hours
export const COLUMN_ALIGNMENT_TOLERANCE = 5; // cm
```

### 2. `src/lib/normative-validation.ts` — Pure Validators

Each validator is a pure function: `(input) → Violation[]`

```typescript
export interface Violation {
  id: string;
  severity: "error" | "warning" | "info";
  category: "dimensions" | "lighting" | "safety" | "structural" | "circulation";
  roomId?: string;
  fixtureId?: string;
  feature: string;        // e.g., "min-dimensions", "natural-lighting"
  message: string;        // Human-readable
  normativeRef: string;   // e.g., "CIRSOC 201 Tabla 3.1.3"
}

// Validators
export function validateMinDimensions(rooms: Room[]): Violation[];
export function validateNaturalLighting(rooms: Room[], fixtures: Fixture[]): Violation[];
export function validateBathroom(rooms: Room[], fixtures: Fixture[]): Violation[];
export function validateStairs(fixtures: Fixture[]): Violation[];
export function validateGarage(rooms: Room[], fixtures: Fixture[]): Violation[];
export function validateSetbacks(rooms: Room[], terrain: Terrain): Violation[];
export function validateStructuralContinuity(columns: Column[], floors: Floor[]): Violation[];
export function validateFurnitureCirculation(rooms: Room[], fixtures: Fixture[]): Violation[];
export function validateSunHours(rooms: Room[], sunSettings: SunSettings, terrain: Terrain): Promise<Violation[]>;

export function validateAll(state: FullEditorState): Violation[];
```

### 3. `src/lib/sun-hours.ts` — Async Sun Hours

```typescript
// Samples sun position every 30min from 8:00 to 16:00 on June 21
// For each sample, checks if room center is in shadow
// Returns estimated hours of direct sunlight

export async function computeSunHoursForRoom(
  room: Room,
  sunSettings: SunSettings,
  terrain: Terrain,
  otherRooms: Room[]
): Promise<number>;
```

Uses `requestIdleCallback` or chunked computation to avoid blocking.

### 4. `src/stores/validation.store.ts` — Validation State

```typescript
interface ValidationStore {
  violations: Violation[];
  enabled: {
    areas: boolean;        // default: true
    cotas: boolean;        // default: true
    setbacks: boolean;     // default: true
    validationPanel: boolean; // default: false
    sunHours: boolean;     // default: false (expensive)
    circulation: boolean;  // default: false
  };
  recompute: () => void;
  getViolationsByRoom: (roomId: string) => Violation[];
  getErrorCount: () => number;
  getWarningCount: () => number;
}
```

### 5. Canvas Components

#### `RoomAreaLabel.tsx`
- Integrated into `RoomLayer.tsx` (not separate layer)
- `<Text>` centered in room with m² value
- Hidden if room < 80×60 cm
- Font: monospace, 11px, color adapts to room fill

#### `CotaDimension.tsx`
- New component in `src/components/canvas/`
- Renders dimension line between two points with value text
- Used by `MeasurementLayer.tsx` when cotas toggle is ON
- Non-interactive (`listening={false}`)

#### `SetbackLayer.tsx`
- New Konva layer between TerrainLayer and RoomLayer
- Draws dashed orange lines at setback distances from terrain edges
- Lines respect `terrain.front` orientation

#### `ValidationOverlayLayer.tsx`
- Top-most Konva layer (above everything)
- Renders warning/error badges near affected rooms
- Badge: ⚠️ icon + count, positioned at room top-right
- On hover: tooltip with violation details
- Uses `useValidationStore` selector

### 6. Panel Component

#### `ValidationPanel.tsx`
- Sidebar panel (right side, collapsible)
- Groups violations by category
- Each item: severity icon + room name + message + normative ref
- Click → select room on canvas
- Badge count on toolbar button

## Performance Strategy

| Concern | Mitigation |
|---------|-----------|
| Validation recompute on every state change | Debounce 300ms, only recompute affected validators |
| Sun hours (heavy) | Async, cached, only recompute on sun settings or room geometry change |
| Konva layer count | RoomAreaLabel inside RoomLayer (no extra layer), others memoized |
| Large floor plans (50+ rooms) | Memoized selectors, skip validation for rooms unchanged since last run |

## Migration Strategy

- `Wall.type`: optional, default `"interior"`. Migration adds field to all existing walls.
- `Terrain.setbacks`: optional, default `{ front: 300, left: 150, right: 150, rear: 300 }`.
- `CURRENT_VERSION`: 5 → 6.
- Backward compatible: v5 data loads without issues (new fields get defaults).
