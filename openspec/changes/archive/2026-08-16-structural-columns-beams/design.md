# Design: Structural Elements (Columns & Beams) + Auto Dimensioning + Floor Overlay

## Technical Approach

Introduce a first-class structural domain as domain entities (not fixtures) in `src/types/plan.ts`: `Column` (section center at x/y, width/height) and `Beam` (center-line span with width). A dedicated `src/stores/structural.store.ts` provides floor-scoped CRUD with immutable actions and shared history integration. `src/components/canvas/StructuralLayer.tsx` renders columns as section-sized squares and beams as center-line bands (reusing the `wallBandPoints` pattern from `src/lib/wall-utils.ts`). `src/lib/structural-utils.ts` holds all pure geometry: terrain bounds checking, column center snapping, beam endpoint resolution, span computation, and CIRSOC range stubs. The v4→v5 migration in `src/lib/migrate.ts` adds a `structural: []` slice (additive, idempotent). `src/lib/storage.ts` bumps `CURRENT_VERSION` to 5; `LEGACY_STORAGE_KEY` preserved. History integration extends `HistoryEntry` and `captureSnapshot` in `src/stores/history.store.ts` once so all recording stores carry the structural slice. `src/hooks/useEditorShortcuts.ts` `applyHistoryEntry` restores the structural store via `replaceStructural`. UI: sidebar structural section (preset picker 20×20/25×25/30×30, tool buttons) in `src/components/sidebar/Sidebar.tsx`; `PanelType` extended in `src/stores/panel.store.ts` with `"column"` and `"beam"`; `PropertiesPanel.tsx` routes to new `ColumnEditor` and `BeamEditor` components. Slice c adds `FloorOverlayLayer.tsx` (adjacent-floor walls + structure in transparency) and structural dimensioning annotations rendered on the existing `MeasurementLayer`. Delivered as three chained PRs (a → b → c), each < 400 lines.

## Architecture Decisions

| # | Option | Tradeoff | Decision |
|---|---|---|---|
| D1 | Structural entities as fixtures vs first-class domain | Fixture model (closed `FixtureCategory` union, rotation semantics) cannot represent beam spans or CIRSOC validation; overlay filtering by category would be fragile | First-class domain: `Column`/`Beam` as separate types in `plan.ts`, separate store, separate layer. Rule 03: domain data has a type in `plan.ts` |
| D2 | Column section: square presets only vs free-size input | Free-size is more flexible but adds UI complexity for a feature that mostly needs standard sections | Presets 20×20, 25×25, 30×30 cm (product decision 1); both dimensions editable after placement via properties panel |
| D3 | Beam default width: wall-thickness match vs configurable | Wall default is 10 cm; structural beams are typically wider | Default 20 cm (product decision 2); editable after placement |
| D4 | History slice: extend captureSnapshot once vs per-store | Per-store extension violates DRY and risks missing a store | Extend `captureSnapshot` / `pushState` in `history.store.ts` once; all recording stores (fixtures, walls, structural) carry the slice automatically via the shared helper |
| D5 | Floor overlay layer: separate Layer vs inside StructuralLayer | Separate layer keeps rule 04 (one domain = one file) and allows independent memoization/toggling | Separate `FloorOverlayLayer.tsx`; renders adjacent-floor WALLS + STRUCTURE in semi-transparency; `listening={false}` for render-only |
| D6 | Dimensioning: dedicated layer vs reuse MeasurementLayer | Dedicated layer adds z-order complexity; MeasurementLayer already renders committed measurements in red dashed style | Reuse `MeasurementLayer.tsx` + `ruler.store.ts` patterns; structural annotations are derived state computed in `structural-utils.ts`, rendered as `Render` children alongside ruler measurements |
| D7 | Adjacent floor selection: manual vs automatic by level | Manual requires UI; automatic is deterministic and aligns with product intent | Automatic: nearest by `Floor.level`; tie-break = floor below wins (spec floor-overlay-2); single floor → no overlay |
| D8 | Iso projection: 2D-only vs full prism extrusion | Full prism extrusion requires `IsometricLayer` changes and z-axis geometry; 2D-only is simpler but incomplete | Full prism: columns as vertical prisms (extruded to `floorHeight`), beams as extruded bands along span. Reuses `lib/isometric.ts` `projectToIsometric(x, y, z)` pattern. Structural geometry from store, not recomputed on pan/zoom (rule 09) |
| D9 | CIRSOC span range: hardcoded vs configurable default | Hardcoded asserts regulatory fact without verification (rule 06); configurable is safe | Configurable constant with documented application default (300–600 cm); flagged "to verify" against CIRSOC 201 reglamento; warning style for out-of-range spans |
| D10 | Beam endpoint snapping: new snap logic vs reuse existing | New snap logic adds complexity; existing snap threshold is well-tested | Reuse `SNAP_THRESHOLD` (25 cm) from `constants.ts`; beam endpoints snap to column centers, wall endpoints, and grid when magnetism enabled; zero-length spans rejected |

## Data Flow

```
Column tool click:
  PlanCanvas → structural.addColumn({x, y, sectionWidth, sectionHeight, floorId})
  → structural.store: spread, add, recordHistory()

Beam tool drag:
  PlanCanvas → mousedown: start = snapToColumnCenter(p) || snapToWallEndpoint(p) || p
  PlanCanvas → mousemove: end = resolveBeamEnd(p, start, columns, walls, magnetize)
  PlanCanvas → mouseup: structural.addBeam({x1,y1,x2,y2,width,floorId})
  → validation: zero-length rejected; out-of-terrain snapped/rejected

Selection:
  StructuralLayer click → selectionStore.setSelectedId(element.id)
  → PropertiesPanel: openPanel(type, id) routes to ColumnEditor / BeamEditor

History:
  structural.store actions → recordHistory() → captureSnapshot() in history.store
  → HistoryEntry now includes: { floors, activeFloorId, terrain, fixtures, walls, structural }

Undo/redo:
  history.store.undo() → applyHistoryEntry(entry) in useEditorShortcuts
  → floors.setState, rooms.setState, fixtures.setState, walls.setState, structural.replaceStructural

Floor overlay:
  FloorOverlayLayer reads: adjacentFloorId (computed from floors, activeFloorId)
  → walls.getWallsForFloor(adjacentFloorId)
  → structural.getStructuralForFloor(adjacentFloorId)
  → renders translucent, listening={false}

Auto dimensioning:
  MeasurementLayer reads: structural.getStructuralForFloor(activeFloorId)
  → computeSpanAnnotations(columns, beams) in structural-utils.ts
  → memoized per floor; recomputes only on geometry change, not pan/zoom
  → red dashed lines + meter labels (MeasurementLayer visual language)

Persistence:
  storage.serialize(project) → includes structural array (v5)
  storage.deserialize(json) → migrateProjectData: if version < 5, add structural: []
  export/import round-trip preserves structural entities
```

## File Changes

| File | Action | Slice | Description |
|---|---|---|---|
| `src/types/plan.ts` | Modify | a | `Column`, `Beam`, `StructuralElement` discriminated union; extend `CanvasState.activeTool` with `"column"`/`"beam"` |
| `src/stores/structural.store.ts` | Create | a | Zustand store: `columns`, `beams`, `getStructuralForFloor`, `addColumn`, `addBeam`, `moveColumn`, `updateColumn`, `updateBeam`, `removeColumn`, `removeBeam`, `replaceStructural`; immutable actions; `recordHistory()` calls shared snapshot helper |
| `src/lib/structural-utils.ts` | Create | a+b | Pure functions: `isWithinTerrain`, `snapColumnToTerrain`, `resolveBeamEnd`, `snapBeamEndpoint`, `beamLength`, `columnCenterDistance`, `computeSpanAnnotations`, `CIRSOC_SPAN_MIN/MAX` constants |
| `src/components/canvas/StructuralLayer.tsx` | Create | a+b | Memoized Konva layer; renders Column squares + Beam bands; fine selector `getStructuralForFloor`; selection via `selectedId === element.id` |
| `src/stores/history.store.ts` | Modify | a | `HistoryEntry.structural` field; extend `captureSnapshot` to read structural store |
| `src/hooks/useEditorShortcuts.ts` | Modify | a | `applyHistoryEntry` calls `structural.replaceStructural` |
| `src/lib/migrate.ts` | Modify | a | v4→v5: add `structural: []` if missing; guard `if (version >= 5) return data` |
| `src/lib/storage.ts` | Modify | a | `CURRENT_VERSION = 5`; `ProjectData.structural` field; `defaultProjectData` includes `structural: []` |
| `src/components/sidebar/Sidebar.tsx` | Modify | a | Structural section: preset picker, column/beam tool buttons |
| `src/stores/panel.store.ts` | Modify | a | `PanelType` gains `"column"` and `"beam"` |
| `src/components/panel/PropertiesPanel.tsx` | Modify | a | Route structural panel types to `ColumnEditor`/`BeamEditor` |
| `src/components/panel/ColumnEditor.tsx` | Create | a | Section width/height inputs; calls `structural.updateColumn` |
| `src/components/panel/BeamEditor.tsx` | Create | b | Width input; calls `structural.updateBeam` |
| `src/components/canvas/PlanCanvas.tsx` | Modify | a+c | Mount `StructuralLayer` (z-order: above RoomLayer, below WallLayer); mount `FloorOverlayLayer` (above all floor geometry, below MeasurementLayer); wire column/beam tools |
| `src/components/canvas/FloorOverlayLayer.tsx` | Create | c | Adjacent-floor walls + structure; semi-transparent; `listening={false}`; memoized; fine selectors for adjacent floor |
| `src/components/canvas/MeasurementLayer.tsx` | Modify | c | Render structural span annotations alongside ruler measurements |
| `src/stores/canvas.store.ts` | Modify | c | `floorOverlayEnabled` and `structuralDimensioningEnabled` toggles (session-only, not persisted) |
| `src/components/canvas/IsometricLayer.tsx` | Modify | c | Project columns as vertical prisms, beams as extruded bands in isometric view |
| `tests/structural-utils.test.ts` | Create | a+b | Unit tests for pure functions |
| `tests/migrate-structural.test.ts` | Create | a | v4→v5 migration tests |
| `tests/structural.store.test.ts` | Create | a | Store CRUD + history integration tests |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `structural-utils.ts`: terrain bounds, beam endpoint resolution, span computation, zero-length rejection, CIRSOC range check | `tests/structural-utils.test.ts` (vitest) |
| Unit | `migrate.ts`: v4→v5 idempotent, additive, `structural: []` normalization, guard skip for v5 | `tests/migrate-structural.test.ts` |
| Unit | `structural.store.ts`: CRUD immutability, floor scoping, `replaceStructural`, history integration | `tests/structural.store.test.ts` |
| Manual | Column placement, selection, move, delete; beam draw, snap, cancel; undo/redo; floor overlay toggle; dimensioning toggle; iso view | `bun dev` (rule 08.4) |
| Regression | Existing wall/room/fixture flows unaffected | `bun test` (existing suite) |

## Slice Boundaries (P1 → P2 → P3)

- **P1 Columns (~350)**: `types/plan.ts` (Column type + activeTool extend, +10) + `structural.store.ts` (~100) + `structural-utils.ts` (~80, terrain bounds + column snap) + `StructuralLayer.tsx` (~80) + `ColumnEditor.tsx` (~40) + `Sidebar.tsx` structural section (~40) + `PlanCanvas.tsx` mount (+15) + `history.store.ts` extend (+15) + `useEditorShortcuts.ts` extend (+10) + `migrate.ts` + `storage.ts` v5 (+20) + tests (~80)
- **P2 Beams (~280)**: `types/plan.ts` (Beam type, +5) + `structural.store.ts` (addBeam/removeBeam/updateBeam, +30) + `structural-utils.ts` (beam snap + validation, +60) + `StructuralLayer.tsx` (beam rendering, +40) + `BeamEditor.tsx` (~40) + `PlanCanvas.tsx` beam tool wiring (+30) + `panel.store.ts` + `PropertiesPanel.tsx` route (+20) + tests (~55)
- **P3 Dimensioning + Overlay (~350)**: `FloorOverlayLayer.tsx` (~90) + `structural-utils.ts` (span annotations, +80) + `MeasurementLayer.tsx` (render annotations, +40) + `canvas.store.ts` toggles (+10) + `IsometricLayer.tsx` structural iso (+80) + `Sidebar.tsx` overlay/dimensioning toggles (+30) + tests (~20)

P1 must land first (types + store + migration). P2 stacks after (beams benefit from column entities). P3 consumes P1+P2 (dimensioning and overlay need both column and beam geometry).

## Interfaces / Contracts

```ts
// types/plan.ts — new types
export interface Column {
  id: string;           // crypto.randomUUID()
  floorId: string;
  x: number;            // section center, cm
  y: number;
  sectionWidth: number; // cm, default from preset
  sectionHeight: number;
}

export interface Beam {
  id: string;           // crypto.randomUUID()
  floorId: string;
  x1: number;           // center line start, cm
  y1: number;
  x2: number;
  y2: number;
  width: number;        // cm, default 20
}

export type StructuralElement = Column | Beam;

// CanvasState.activeTool extended:
activeTool: "select" | "pan" | "wall" | "column" | "beam";

// lib/structural-utils.ts — key exports
export const COLUMN_SECTION_PRESETS: [number, number][] = [[20,20],[25,25],[30,30]];
export const DEFAULT_BEAM_WIDTH = 20;
export const CIRSOC_SPAN_MIN = 300; // cm — application default, pending verification (rule 06)
export const CIRSOC_SPAN_MAX = 600; // cm — application default, pending verification
export function isWithinTerrain(x: number, y: number, terrain: Terrain): boolean;
export function snapBeamEndpoint(p: Point, columns: Column[], walls: Wall[], magnetize: boolean): Point;
export function beamLength(beam: Beam): number; // cm
export function columnCenterDistance(a: Column, b: Column): number; // cm
export function computeSpanAnnotations(columns: Column[], beams: Beam[]): SpanAnnotation[];
export interface SpanAnnotation { x1: number; y1: number; x2: number; y2: number; distanceCm: number; inRange: boolean; }

// structural.store.ts — key exports
export interface StructuralStore {
  columns: Column[];
  beams: Beam[];
  getStructuralForFloor: (floorId: string) => StructuralElement[];
  addColumn: (column: Omit<Column, "id" | "floorId">) => void;
  addBeam: (beam: Omit<Beam, "id" | "floorId">) => void;
  moveColumn: (id: string, x: number, y: number) => void;
  updateColumn: (id: string, updates: Partial<Pick<Column, "sectionWidth" | "sectionHeight">>) => void;
  updateBeam: (id: string, updates: Partial<Pick<Beam, "width">>) => void;
  removeColumn: (id: string) => void;
  removeBeam: (id: string) => void;
  replaceStructural: (elements: StructuralElement[]) => void; // undo/redo restore
}

// panel.store.ts — PanelType extended
type PanelType = "room" | "fixture" | "opening" | "stair" | "column" | "beam";
```

## Open Questions

1. **Iso projection for structural elements**: The spec (editor-rendering-6) requires columns as vertical prisms and beams as extruded bands in isometric view. `IsometricLayer` currently projects walls at z=0..floorHeight. Structural extrusion needs the same z-axis treatment. This is straightforward (same `projectToIsometric` call with z offsets) but adds ~80 lines to `IsometricLayer.tsx`. No ambiguity — implement per spec.

2. **Adjacent floor tie-break**: Spec floor-overlay-2 says "floor below wins" when two floors are equidistant. The current `Floor` type has `level: number`. Computation: `adjacentFloor = floors.filter(f => f.id !== activeFloorId).sort((a,b) => Math.abs(a.level - activeLevel) - Math.abs(b.level - activeLevel) || (a.level < activeLevel ? -1 : 1))[0]`. This is deterministic and matches the spec. No ambiguity.

3. **CIRSOC 201 span range**: The 300–600 cm default is an application default only, flagged "to verify" against the reglamento (rule 06). The design must NOT assert this as regulatory fact. Warning style (amber label) for out-of-range spans. This is explicitly deferred.

4. **Column section presets vs free input**: Product decision resolved — 20×20, 25×25, 30×30 presets; both dimensions editable after. No ambiguity.
