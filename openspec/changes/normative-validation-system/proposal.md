# Proposal: Normative Validation System

## Problem Statement

The planos editor lets users design floor plans but provides zero feedback on whether the design complies with Argentine construction regulations (CIRSOC 201, CABA Building Code, IRAM standards). Users must manually cross-reference normative documents, leading to errors and rework.

## Solution

Add a **normative validation engine** that:
1. Calculates and displays key metrics (room areas, dimension lines, sun hours)
2. Validates designs against normative rules in real-time
3. Shows visual indicators (colored overlays, labels, warning icons) directly on the canvas
4. Provides a sidebar panel with a structured validation report

## Scope — 12 Features

### Visual Layer (show data on canvas)
| # | Feature | What user sees |
|---|---------|---------------|
| 1 | Room areas | m² text inside each room |
| 2 | Cotas automáticas | Dimension lines on room sides |
| 3 | Setback lines | Dashed lines showing mandatory terrain setbacks |
| 4 | Wall type | Color-coded walls (exterior=thick, interior=thin, medianera=hatched) |

### Validation Layer (check compliance)
| # | Feature | What happens |
|---|---------|-------------|
| 5 | Min dimensions | Warning if room < normative minimum |
| 6 | Natural lighting | Warning if window/floor ratio < required |
| 7 | Sun hours | Warning if < 2h direct sun in winter |
| 8 | Bathroom | Warning if fixtures too close / no clear space |
| 9 | Stair validation | Warning if IRAM non-compliant |
| 10 | Garage | Warning if < 250×500cm |
| 11 | Structural continuity | Warning if columns misaligned between floors |
| 12 | Furniture circulation | Warning if < 60cm passage |

## Technical Approach

### Architecture: Pure validation engine + Konva overlays

```
src/lib/normative-rules.ts     — Constants and rule definitions
src/lib/normative-validation.ts — Pure functions: state → violations[]
src/lib/sun-hours.ts           — Async sun hours calculator
src/components/canvas/ValidationOverlayLayer.tsx — Konva rendering
src/components/canvas/RoomAreaLabel.tsx          — Area text in rooms
src/components/canvas/CotaDimension.tsx          — Dimension lines
src/components/canvas/SetbackLayer.tsx           — Setback lines
src/components/panel/ValidationPanel.tsx          — Sidebar report
```

### Key Design Decisions

1. **Pure functions for validation** — `normative-validation.ts` takes state, returns `Violation[]`. No side effects, fully testable.

2. **Validation is opt-in per overlay** — User toggles which indicators to show via `canvas.store`. Default: areas ON, cotas ON, setbacks ON, validation panel OFF.

3. **Performance-first rendering** — All Konva layers use `React.memo` + fine selectors. Validation runs on state change, not on every frame.

4. **Sun hours run async** — Heavy computation (solar position × 8 hours × N rooms) runs in a web worker or debounced, not blocking render.

5. **Wall types stored as enum** — `Wall.type: "exterior" | "interior" | "medianera"`. Default: infer from room adjacency (walls touching terrain edge = exterior).

6. **Setbacks configurable** — `Terrain.setbacks: { front, left, right, rear }` in cm. Defaults from CABA R1 but editable.

7. **Validation severity levels**:
   - `error` (red) — blocks compliance (e.g., room too small)
   - `warning` (amber) — violates norm but allowed with justification
   - `info` (blue) — informational (e.g., "recommended", not required)

## Impact

### Files modified: ~12
### Files created: ~6
### Estimated lines: ~1800 (across all PRs)
### Breaking changes: Yes — migration v5→v6 (additive: new fields on Wall, Terrain)

## Risks

1. **Solar hours performance** — mitigate with debounced calculation + memoization
2. **Konva layer count** — adding 4 new layers increases render complexity — mitigate with memo + selective visibility
3. **Normative accuracy** — rules must match actual CIRSOC/CABA text — mitigate with inline comments citing exact articles
4. **Migration** — v6 must be backward-compatible with v5 data — mitigate with additive fields only
