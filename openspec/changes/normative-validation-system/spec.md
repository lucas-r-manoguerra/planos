# Spec: Normative Validation System

## Feature 1: Visible Room Areas

### Requirement
Every room on the canvas displays its area in m² as a text label centered inside the room rectangle.

### Acceptance Criteria
- [ ] Area text shows "{N} m²" format (e.g., "14.4 m²")
- [ ] Text is centered horizontally and vertically in the room
- [ ] Text color contrasts with room fill (dark on light, light on dark)
- [ ] Area updates in real-time when room is resized
- [ ] Area is hidden when room is smaller than 80×60 cm (text would overlap)
- [ ] Area label is part of `RoomLayer.tsx` (not a separate Konva layer)

### Data Model
No new fields needed — area is computed: `room.width * room.height / 10000`

---

## Feature 2: Minimum Dimensions Validation

### Requirement
When a room is created or resized, validate its area and side lengths against normative minimums. Show warning if non-compliant.

### Normative Rules (Resolución 5/2022 — Programa Casa Propia)
| RoomType | Min Area (m²) | Min Side (cm) |
|----------|:---:|:---:|
| DORMITORIO | 10.50 | 300 |
| COCINA | 4.50 | 150 |
| BAÑO | 4.00 | 160 |
| ESTAR_COMEDOR | 18.00 | 300 |
| LAVADERO | 2.25 | 150 |
| PASILLO | — | 100 (width) |

### Acceptance Criteria
- [ ] Validation runs on room create, resize, and type change
- [ ] Warning badge (⚠️) appears near room label when non-compliant
- [ ] Tooltip shows specific violation: "Área: 7.2 m² (mínimo: 9.0 m²)"
- [ ] Validation stored in `normative-validation.ts` as pure function
- [ ] Violations accessible via `useValidationStore` for panel display

### Data Model
No new fields — validation is computed from existing Room data.

---

## Feature 3: Automatic Dimensioning (Cotas)

### Requirement
Dimension lines appear along room sides showing the length in cm or m.

### Acceptance Criteria
- [ ] Toggle in canvas toolbar: "Cotas" on/off
- [ ] Dimension lines appear on top and left side of each room
- [ ] Format: "{value} cm" for < 10m, "{value} m" for ≥ 10m
- [ ] Lines have end markers (small perpendicular ticks)
- [ ] Text is centered on the dimension line
- [ ] Dimension lines are non-interactive (pointer-events: none)
- [ ] Performance: memoized, only re-render on room geometry change

### Data Model
No new fields — computed from room geometry.

---

## Feature 4: Wall Types

### Requirement
Walls are classified as exterior, interior, or medianera, with visual distinction and minimum thickness enforcement.

### Acceptance Criteria
- [ ] `Wall.type` field: `"exterior" | "interior" | "medianera"` (default: `"interior"`)
- [ ] Auto-detection: walls touching terrain edge → exterior
- [ ] Visual: exterior walls render thicker (strokeWidth 3 vs 1), interior thin
- [ ] Medianera walls render with hatching pattern
- [ ] Minimum thickness: exterior ≥ 20cm, medianera ≥ 20cm, interior ≥ 8cm
- [ ] Warning if wall thickness below minimum for its type
- [ ] User can override wall type via property panel

### Data Model
```typescript
interface Wall {
  // ...existing fields
  type: "exterior" | "interior" | "medianera"; // NEW, default "interior"
}
```

---

## Feature 5: Natural Lighting Calculation

### Requirement
For each room with windows, calculate the ratio of window area to floor area and compare against CIRSOC 201 Table 3.1.3.

### Normative Rules (CIRSOC 201 Table 3.1.3)
| Room Type | Min Ratio (window/floor) | Min Ventilated Area |
|-----------|:---:|:---:|
| DORMITORIO | 1/6 (16.7%) | — |
| COCINA | 1/10 (10%) | 0.50 m² ventilable |
| BAÑO | — | 0.50 m² ventilable |
| ESTAR_COMEDOR | 1/8 (12.5%) | — |
| LAVADERO | 1/10 (10%) | 0.50 m² ventilable |

### Acceptance Criteria
- [ ] For each room, sum window widths × window height (from fixture props) → total window area
- [ ] Calculate ratio: window_area / floor_area
- [ ] Show indicator: green ✓ if compliant, red ✗ if not
- [ ] Tooltip: "Ventanas: 1.80 m² / Piso: 14.4 m² = 12.5% (mínimo: 16.7%)"
- [ ] Validation stored in `normative-validation.ts`

### Data Model
No new fields — computed from fixtures (windows) + room geometry.

---

## Feature 6: Sun Hours per Room

### Requirement
Calculate how many hours of direct sunlight each room receives on June 21 (winter solstice) between 8:00 and 16:00.

### Acceptance Criteria
- [ ] For each room, sample sun position every 30 minutes from 8:00 to 16:00
- [ ] For each sample, check if room is in shadow (using existing shadow polygon logic)
- [ ] Count non-shadowed samples → estimate sun hours
- [ ] Show indicator: green ≥ 2h, red < 2h
- [ ] Tooltip: "Sol directo: 3.5h (mínimo: 2h)"
- [ ] Calculation runs async (not blocking render)
- [ ] Results cached and only recomputed when room geometry or sun settings change

### Data Model
No new fields — computed result stored in validation state.

---

## Feature 7: Bathroom Validation

### Requirement
Validate bathroom layouts against CIRSOC 201 spacing rules.

### Normative Rules
- Minimum 15cm between center of toilet and center of adjacent fixture
- Minimum 60cm clear space in front of toilet
- Minimum 60cm clear space in front of lavamanos

### Acceptance Criteria
- [ ] Detect rooms of type BAÑO
- [ ] For each bathroom, find all bathroom fixtures (ducha, bañera, inodoro, lavamanos)
- [ ] Check inter-fixture distances ≥ 15cm
- [ ] Check clear space in front of toilet ≥ 60cm
- [ ] Show warning badge on room if violations found
- [ ] Tooltip lists specific violations

### Data Model
No new fields — computed from fixtures + room geometry.

---

## Feature 8: Stair Validation

### Requirement
Validate stair compliance with IRAM 4001 and CIRSOC 201.

### Normative Rules
- Formula: 2h + w = 60–64 cm (ALREADY IMPLEMENTED in `calculateStairs`)
- Rest/landing width ≥ 80cm
- Headroom between flights ≥ 2.10m
- Max slope ≤ 40°
- Min stair width ≥ 90cm

### Acceptance Criteria
- [ ] Extend `calculateStairs()` to return all compliance checks
- [ ] Show compliance badge on stair fixture: green if all pass, red with details
- [ ] Tooltip: "✓ Fórmula: 62cm | ✗ Descanso: 70cm (mínimo: 80cm)"
- [ ] Validation stored in `normative-validation.ts`

### Data Model
No new fields — computed from stair fixture props.

---

## Feature 9: Garage Validation

### Requirement
Validate garage dimensions against CABA requirements.

### Normative Rules (Resolución 5/2022 / CIRSOC 201)
- Minimum garage size: 250cm × 500cm
- Minimum maneuver space: 550cm length total
- Minimum door width: 250cm

### Acceptance Criteria
- [ ] Detect rooms used as garage (type COCINA? or new type? — use existing vehicle fixtures as indicator)
- [ ] If room contains vehicle fixture, validate room dimensions ≥ 250×500
- [ ] Show warning if too small
- [ ] Tooltip: "Cochera: 240×480 cm (mínimo: 250×500 cm)"

### Data Model
May need new RoomType: `COCHERA` or detect from vehicle fixture presence.

---

## Feature 10: Terrain Setbacks

### Requirement
Configurable setback lines from terrain edges. Visual lines on canvas + validation that rooms don't cross setback lines.

### Normative Rules (configurable por zona)
| Setback | Default (cm) |
|---------|:---:|
| Front (frente) | 300 |
| Left (lateral izq) | 150 |
| Right (lateral der) | 150 |
| Rear (fondo) | 300 |

### Acceptance Criteria
- [ ] `Terrain.setbacks: { front, left, right, rear }` in cm
- [ ] Dashed lines drawn inside terrain showing setback boundaries
- [ ] Setback lines color: orange dashed
- [ ] If a room crosses a setback line → warning
- [ ] Setback values editable in terrain panel
- [ ] Defaults vary by front orientation (if front=top, setback front is at top)

### Data Model
```typescript
interface Terrain {
  // ...existing fields
  setbacks: { front: number; left: number; right: number; rear: number }; // NEW, default 300/150/150/300
}
```

---

## Feature 11: Structural Continuity

### Requirement
When multiple floors exist, validate that columns are aligned between floors.

### Acceptance Criteria
- [ ] For each column on floor N, check if a column exists on floor N-1 within 5cm tolerance
- [ ] Show warning badge on misaligned columns
- [ ] Visual: dashed vertical line connecting misaligned columns across floors
- [ ] Uses existing FloorOverlayLayer data
- [ ] Validation runs on column add/move/floor switch

### Data Model
No new fields — computed from columns across floors.

---

## Feature 12: Furniture Circulation Spaces

### Requirement
Validate that there are 60cm minimum clear passages between furniture items and between furniture and walls.

### Acceptance Criteria
- [ ] For each pair of adjacent furniture items, compute minimum distance
- [ ] For each furniture item, compute distance to nearest wall
- [ ] If any distance < 60cm → warning
- [ ] Visual: red overlay on blocked passages (optional toggle)
- [ ] Tooltip: "Pasaje: 45cm (mínimo: 60cm)"

### Data Model
No new fields — computed from fixtures + room geometry.

---

## Cross-Cutting: Validation Panel

### Requirement
A sidebar panel showing all validation results in a structured list.

### Acceptance Criteria
- [ ] Panel shows grouped by category: Dimensiones, Iluminación, Seguridad, Estructural
- [ ] Each item: icon (✓/✗) + room name + description + normative reference
- [ ] Click on item → highlight room on canvas
- [ ] Toggle panel visibility via toolbar button
- [ ] Count of errors/warnings in toolbar badge

---

## Cross-Cutting: Validation Store

### Requirement
Centralized validation state accessible by canvas layers and panel.

### Acceptance Criteria
- [ ] `useValidationStore` with `violations: Violation[]`
- [ ] `Violation { id, severity, category, roomId?, feature, message, normativeRef }`
- [ ] Recomputed on relevant state changes (debounced 300ms)
- [ ] Selectors: `getViolationsByRoom(roomId)`, `getViolationsByCategory(cat)`, `getErrorCount()`

---

## Migration v5 → v6

### Additive Changes
- `Wall.type`: new optional field, defaults to `"interior"`
- `Terrain.setbacks`: new optional field, defaults to `{ front: 300, left: 150, right: 150, rear: 300 }`
- `CURRENT_VERSION`: 5 → 6

### Breaking: NONE
All new fields are optional with defaults. Existing data loads without changes.
