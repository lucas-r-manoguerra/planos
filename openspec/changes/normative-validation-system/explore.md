# Exploration: Normative Validation System

## Goal

Add construction norm validation to the planos editor so every design decision is backed by Argentine regulatory requirements (CIRSOC 201, CABA Building Code, IRAM standards). 12 improvements in one change.

## Current State by Feature

### 1. Room Areas (NOT IMPLEMENTED)
- Rooms are rendered as Konva `Rect` in `RoomLayer.tsx`
- No area calculation shown on canvas
- `Room` type has `width`, `height` in cm — area is trivially `width * height`
- **Gap**: No visual representation of m² on the plan

### 2. Minimum Dimensions (NOT IMPLEMENTED)
- 6 RoomTypes exist: DORMITORIO, COCINA, BAÑO, ESTAR_COMEDOR, LAVADERO, PASILLO
- No minimum size validation anywhere
- **Gap**: No validation logic, no user feedback
- **Normative**: CABA R1 — dormitorio 9m² (lado mín 2.70m), cocina 5m², baño 2.5m² (lado mín 1.20m), estar 15m²

### 3. Automatic Dimensioning / Cotas (PARTIALLY IMPLEMENTED)
- `MeasurementLayer.tsx` has manual ruler (point A→B)
- Structural span annotations exist (`computeSpanAnnotations`)
- **Gap**: No automatic room-side dimension lines (cotas de lados de habitación)
- **Gap**: No terrain dimension lines

### 4. Wall Types (NOT IMPLEMENTED)
- `Wall` type: `{ id, floorId, x1, y1, x2, y2, thickness, roomId? }`
- All walls rendered identically in `WallLayer.tsx`
- Default thickness 10cm for all
- **Gap**: No wall type classification (exterior/interior/medianera)
- **Gap**: No minimum thickness enforcement
- **Normative**: Exterior walls ≥20cm, medianera ≥20cm (varies by municipality)

### 5. Natural Lighting (NOT IMPLEMENTED)
- Windows placed via `fixtures.store`, anchored to walls
- `Fixture` has `category: "window"` with width/height
- **Gap**: No ratio calculation window_area / floor_area
- **Gap**: No visual indicator per room
- **Normative**: CIRSOC 201 Table 3.1.3 — dormitorio ≥1/6, baño ventilable ≥0.50m², cocina ≥1/10

### 6. Sun Hours per Room (NOT IMPLEMENTED)
- Solar simulation exists: `sun.store.ts`, `solar.ts`, `shadow.ts`
- ShadowLayer renders room shadow polygons
- Sun position (azimuth, elevation) calculated correctly
- **Gap**: No per-room sun hours calculation
- **Gap**: No accumulation over day range
- **Normative**: CIRSOC 201 — dormitorio ≥2h direct sun between 8:00–16:00 on June 21

### 7. Bathroom Validation (NOT IMPLEMENTED)
- 4 bathroom fixtures: ducha, bañera, inodoro, lavamanos
- Placed freely on canvas, no adjacency rules
- **Gap**: No minimum distance validation between fixtures
- **Gap**: No space-in-front-of-toilet check (60cm min)
- **Normative**: CIRSOC 201 — 15cm between fixture centers, 60cm clear in front

### 8. Stair Validation (PARTIALLY IMPLEMENTED)
- `calculateStairs()` in `fixtures-catalog.ts` validates 2h+w formula (IRAM)
- Compliance check exists (60–64cm range)
- **Gap**: No rest width validation (≥80cm)
- **Gap**: No headroom check (≥2.10m between flights)
- **Gap**: No max slope check (≤40°)
- **Gap**: No min width check (≥90cm)

### 9. Garage Validation (NOT IMPLEMENTED)
- 2 vehicle types: auto (180×450), camioneta (200×530)
- No garage-specific validation
- **Gap**: No min garage size check
- **Gap**: No maneuver space validation
- **Normative**: CABA — cochera mín 250×500cm, maniobra 5.50m largo

### 10. Terrain Setbacks (NOT IMPLEMENTED)
- Terrain has `width`, `height`, `front`, `northAngle`
- No setback lines or validation
- **Gap**: No setback configuration
- **Gap**: No visual setback lines
- **Gap**: No validation against room placement
- **Normative**: Varies by zoning — R1 frente 3m, lateral 1.5m, posterior 3m (CABA)

### 11. Structural Continuity (NOT IMPLEMENTED)
- Multi-floor support exists (`floors.store.ts`)
- Columns have `floorId` but no cross-floor validation
- FloorOverlayLayer shows adjacent floor at 30% opacity
- **Gap**: No column alignment check between floors
- **Gap**: No visual indicator of misalignment

### 12. Free Spaces Between Furniture (NOT IMPLEMENTED)
- 14 furniture items placed freely
- No circulation path validation
- **Gap**: No 60cm minimum passage check
- **Gap**: No visual overlay of free vs blocked spaces

## Files That Need Changes

### Types (data model)
- `src/types/plan.ts` — add WallType, SetbackConfig, ValidationResult types

### Stores
- `src/stores/rooms.store.ts` — room area validation
- `src/stores/walls.store.ts` — wall type assignment
- `src/stores/structural.store.ts` — cross-floor column check
- `src/stores/fixtures.store.ts` — fixture validation
- `src/stores/sun.store.ts` — per-room sun hours
- `src/stores/canvas.store.ts` — toggle validation overlays

### New Library Files
- `src/lib/normative-validation.ts` — core validation engine (all 12 validators)
- `src/lib/normative-rules.ts` — rule definitions (CIRSOC, CABA, IRAM constants)
- `src/lib/sun-hours.ts` — per-room sun hours calculation (reuse solar.ts)

### New Components
- `src/components/canvas/ValidationOverlayLayer.tsx` — visual validation indicators
- `src/components/canvas/RoomAreaLabel.tsx` — m² label inside rooms
- `src/components/canvas/CotaDimension.tsx` — automatic dimension lines
- `src/components/canvas/SetbackLayer.tsx` — terrain setback lines
- `src/components/panel/ValidationPanel.tsx` — sidebar validation results

### Modified Components
- `src/components/canvas/RoomLayer.tsx` — integrate area labels
- `src/components/canvas/WallLayer.tsx` — wall type visual distinction
- `src/components/canvas/MeasurementLayer.tsx` — add cotas toggle
- `src/components/canvas/StructuralLayer.tsx` — column alignment indicator

### Migration
- `src/lib/migrate.ts` — v5→v6 for wall types, setback config
- `src/lib/storage.ts` — CURRENT_VERSION=6

## Dependency Graph

```
normative-rules.ts (constants)
    ↓
normative-validation.ts (validators)
    ↓
┌─────────────────────────────────────────┐
│ ValidationOverlayLayer.tsx              │
│ (renders all validation indicators)     │
└─────────────────────────────────────────┘
    ↑           ↑           ↑
    │           │           │
RoomArea    SetbackLayer  CotaDimension
Label.tsx  .tsx           .tsx
```

Independent work streams (can be parallelized):
- Stream 1: Room areas + cotas (visual, no validation logic)
- Stream 2: Wall types (data model + visual)
- Stream 3: Validation engine (normative-rules + normative-validation)
- Stream 4: Overlays (ValidationOverlay + SetbackLayer)
- Stream 5: Panel (ValidationPanel sidebar)

## Risk Areas

1. **Performance**: ValidationOverlay must not re-render on every frame — memoize aggressively
2. **Konva complexity**: RoomAreaLabel inside RoomLayer needs careful positioning
3. **Migration**: v5→v6 must not break existing structural data
4. **Solar hours**: Computationally expensive — run async, not in render path
5. **Normative accuracy**: Rules must match actual CIRSOC/CABA text — verify before shipping

## Normative References

- **CIRSOC 201**: Reglamento Argentino de Edificaciones — Tabla 3.1.3 (iluminación), Art. 3.1 (ventilación), Art. 7.3 (escaleras)
- **CABA Código de Planeamiento**: Zonas R1–R5, retiros obligatorios, superficies mínimas
- **IRAM 4001**: Escalones — fórmula 2h+w = 60–64cm
- **IRAM 1155**: Accesibilidad — pendientes, anchos de paso
