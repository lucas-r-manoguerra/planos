# Tasks: Structural Elements (Columns & Beams) + Auto Dimensioning + Floor Overlay

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1100 (A: ~350, B: ~280, C: ~350) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Columns) → PR 2 (Beams) → PR 3 (Dimensioning + Overlay) |
| Delivery strategy | auto_chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Column entity, store, layer, tool, sidebar, properties, migration, history | PR 1 (target: feature/structural) | `bun test -- migrate-structural structural-utils structural.store` + `bun lint && bunx tsc --noEmit && bun build` | Place/select/move/delete a column; undo/redo; export/import round-trip | `src/types/plan.ts`, `src/stores/structural.store.ts`, `src/components/canvas/StructuralLayer.tsx`, `src/lib/structural-utils.ts`, `src/lib/migrate.ts`, `src/lib/storage.ts`, `src/components/sidebar/StructuralSection.tsx`, `src/components/panel/ColumnEditor.tsx`, `tests/migrate-structural.test.ts`, `tests/structural-utils.test.ts`, `tests/structural.store.test.ts` |
| 2 | Beam entity, store CRUD, layer rendering, tool wiring, snapping, properties | PR 2 (target: PR 1 branch) | `bun test -- structural-utils structural.store` + `bun lint && bunx tsc --noEmit && bun build` | Draw beam between columns with snap; edit width; undo/redo | `src/types/plan.ts` (Beam extend), `src/stores/structural.store.ts` (beam CRUD), `src/components/canvas/StructuralLayer.tsx` (beam rendering), `src/lib/structural-utils.ts` (snap + validation), `src/components/panel/BeamEditor.tsx`, `tests/structural-utils.test.ts` |
| 3 | Dimensioning annotations, floor overlay layer, toggles, isometric rendering | PR 3 (target: PR 2 branch) | `bun test -- structural-utils` + `bun lint && bunx tsc --noEmit && bun build` | Toggle overlays, verify dimensioning labels on spans | `src/lib/structural-utils.ts` (span computation), `src/components/canvas/MeasurementLayer.tsx`, `src/components/canvas/FloorOverlayLayer.tsx`, `src/stores/canvas.store.ts`, `src/components/canvas/PlanCanvas.tsx`, `src/components/canvas/IsometricLayer.tsx`, `src/components/sidebar/StructuralSection.tsx` |

---

## Slice A — Columns (PR 1)

Base branch: `feature/structural-columns-beams`

### Phase A1: Types & Domain Foundation

- [x] **S1-1** — Extend `CanvasState.activeTool` in `src/types/plan.ts:114` with `"column"`. Add `Column` interface: `{ id: string; floorId: string; x: number; y: number; sectionWidth: number; sectionHeight: number }`. Add `StructuralElement = Column` union type (Beam added in Slice B). Update `PanelType` in `src/stores/panel.store.ts:15` with `"column"`.
  - **Done**: `tsc --noEmit` passes; `Column` and `StructuralElement` are exported from `plan.ts`; `PanelType` includes `"column"`.
  - **Files**: `src/types/plan.ts`, `src/stores/panel.store.ts`

### Phase A2: Pure Logic

- [x] **S1-2** — Create `src/lib/structural-utils.ts` with constants `COLUMN_SECTION_PRESETS: [20,20],[25,25],[30,30]` and pure functions: `isWithinTerrain(x, y, terrain)`, `snapToTerrainEdge(x, y, terrain)`. Follow `wall-utils.ts` pattern: pure, no store imports, imports only from `types/plan`. Add JSDoc with cm units.
  - **Done**: `tsc --noEmit` passes; functions are exported.
  - **Files**: `src/lib/structural-utils.ts`

### Phase A3: Structural Store

- [x] **S1-3** — Create `src/stores/structural.store.ts` following `walls.store.ts` pattern (create from `zustand`, immutable spread). State: `columns: Column[]`, `beams: Beam[]` (empty in A, populated in B). Fine selector: `getStructuralForFloor(floorId)`. Actions: `addColumn(column: Omit<Column, "id" | "floorId">)`, `moveColumn(id, x, y)`, `updateColumn(id, updates)`, `removeColumn(id)`, `replaceStructural(elements)`. `addColumn` assigns `floorId` from `useFloorsStore.getState().activeFloorId` and `id` from `crypto.randomUUID()`. All mutations immutable (rule 05). Destructive actions call `useHistoryStore.getState().pushState(captureSnapshot())` (import `captureSnapshot` from history store).
  - **Done**: `tsc --noEmit` passes; store exports `useStructuralStore`.
  - **Files**: `src/stores/structural.store.ts`

### Phase A4: Structural Layer

- [x] **S1-4** — Create `src/components/canvas/StructuralLayer.tsx` as `memo` component. Fine selector: `useStructuralStore(s => s.columns.filter(c => c.floorId === activeFloorId))` via `useShallow`. Render each column as a `Rect` with `width={sectionWidth}`, `height={sectionHeight}`, `x={col.x - sectionWidth/2}`, `y={col.y - sectionHeight/2}`, fill + stroke. Selection: check `selectedId === col.id` from `useSelectionStore`. On click: `e.cancelBubble = true; select(col.id)`. Colors: fill `#60a5fa` (blue-400), stroke `#2563eb` (blue-600), selection stroke `#f59e0b` (amber-500) with `strokeWidth={2}`. `listening={true}` for selection. Follow `WallLayer.tsx` memo/selector pattern.
  - **Done**: Layer renders columns; `tsc --noEmit` passes.
  - **Files**: `src/components/canvas/StructuralLayer.tsx`
  - ⚠️ **Hot path**: verify no re-render on pan/zoom via `bun dev`.

### Phase A5: History Integration

- [x] **S1-5** — Modify `src/stores/history.store.ts`: add `structural?: StructuralElement[]` to `HistoryEntry` interface. Import `useStructuralStore`. In `captureSnapshot` (line 62-68), add `structural: useStructuralStore.getState().columns` to the returned object.
  - **Done**: `captureSnapshot` includes structural field; `tsc --noEmit` passes.
  - **Files**: `src/stores/history.store.ts`

- [x] **S1-6** — Modify `src/hooks/useEditorShortcuts.ts`: import `useStructuralStore`. In `applyHistoryEntry` (line 32-46), add `if (entry.structural) { useStructuralStore.getState().replaceStructural(entry.structural); }`. In the `Delete`/`Backspace` handler (line 206-231), add a `isStructural` check before fixture check: `isStructural = useStructuralStore.getState().columns.some(c => c.id === selectedId)`. If true, call `useStructuralStore.getState().removeColumn(selectedId)`.
  - **Done**: undo/redo restores structural state; Delete removes selected column; `tsc --noEmit` passes.
  - **Files**: `src/hooks/useEditorShortcuts.ts`

### Phase A6: Migration & Persistence

- [x] **S1-7** — Modify `src/lib/migrate.ts`: update `MigratableProject` interface to include `structural?: StructuralElement[]`. Add `migrateToV5` function (after `migrateToV4`, ~line 147): if `version < 5`, return `{ ...data, version: 5, structural: data.structural ?? [] }`. Update `migrateProjectData` guard from `if (data.version >= 4)` to `if (data.version >= 5) return data` (line 42), and add v4→v5 step: `if (current.version < 5) { current = migrateToV5(current); }`. Follow existing additive/idempotent pattern.
  - **Done**: v4 projects load with `structural: []`; v5 projects return unchanged; `tsc --noEmit` passes.
  - **Files**: `src/lib/migrate.ts`

- [x] **S1-8** — Modify `src/lib/storage.ts`: bump `CURRENT_VERSION` from 4 to 5 (line 37). Add `structural?: StructuralElement[]` to `ProjectData` interface. Add `structural: []` to `defaultProjectData` return value (line 97-110). Add structural check to `isProjectDataShape`: `(value.structural === undefined || Array.isArray(value.structural))` (line 332).
  - **Done**: `CURRENT_VERSION === 5`; export/import round-trip preserves structural; `tsc --noEmit` passes.
  - **Files**: `src/lib/storage.ts`

### Phase A7: Column Tool Wiring

- [x] **S1-9** — Modify `src/components/canvas/PlanCanvas.tsx`: import `StructuralLayer` and `useStructuralStore`. Mount `<StructuralLayer />` between `RoomLayer` and `WallLayer` (after line 464, before `<WallLayer />` at line 469) per z-order spec (above rooms, below walls). In `handleStageClick` (line 301), add column-tool branch: when `activeTool === "column"`, read preset from store/ref, call `useStructuralStore.getState().addColumn({ x: canvasX, y: canvasY, sectionWidth: preset, sectionHeight: preset })` if `isWithinTerrain(canvasX, canvasY, terrain)` is true. Guard: skip when `viewMode !== "2d"`.
  - **Done**: clicking canvas with column tool active creates a column; `bun lint && bunx tsc --noEmit && bun build` pass.
  - **Files**: `src/components/canvas/PlanCanvas.tsx`
  - ⚠️ **Hot path**: verify pan/zoom unaffected; column tool only fires on click.

### Phase A8: UI (Sidebar + Properties)

- [x] **S1-10** — Create `src/components/sidebar/StructuralSection.tsx`: collapsible section following `FixtureCatalog.tsx` pattern. Contains: column-section preset picker (three buttons: 20×20, 25×25, 30×30 cm) stored in a `useState` ref; column tool activation button (`setActiveTool("column")`). Active-tool highlight. Spanish labels: "Elementos Estructurales", "Sección", "Columna". Store active preset in `useRef` (module-level state or local state passed via context/prop to PlanCanvas click handler).
  - **Done**: sidebar renders structural section; preset buttons highlight; tool activates; `tsc --noEmit` passes.
  - **Files**: `src/components/sidebar/StructuralSection.tsx`

- [x] **S1-11** — Modify `src/components/sidebar/Sidebar.tsx`: import and mount `StructuralSection` after `SunSettings` section (~line 82), before `SurfaceInfo`. Wrapped in same `px-4 py-3 border-b` pattern.
  - **Done**: sidebar shows structural section; `tsc --noEmit` passes.
  - **Files**: `src/components/sidebar/Sidebar.tsx`

- [x] **S1-12** — Create `src/components/panel/ColumnEditor.tsx`: form with width/height inputs (type="number", min 10, step 5) reading from `useStructuralStore.getState().columns.find(c => c.id === elementId)`. Calls `useStructuralStore.getState().updateColumn(id, { sectionWidth, sectionHeight })` on change. Follow `RoomEditor` pattern (dialog-shell, controlled inputs, debounce optional). Spanish labels.
  - **Done**: editing column dimensions in panel updates the column; `tsc --noEmit` passes.
  - **Files**: `src/components/panel/ColumnEditor.tsx`

- [x] **S1-13** — Modify `src/components/panel/PropertiesPanel.tsx`: import `ColumnEditor` and `useStructuralStore`. Add branch: `if (type === "column" && elementId) { content = <ColumnEditor elementId={elementId} />; title = "Propiedades de Columna"; }`. Structural lookup: `useStructuralStore.getState().columns.find(...)`.
  - **Done**: selecting a column opens its properties; `tsc --noEmit` passes.
  - **Files**: `src/components/panel/PropertiesPanel.tsx`

### Phase A9: Tests

- [x] **S1-14** — Create `tests/migrate-structural.test.ts` following `tests/migrate.test.ts` pattern: test v4→v5 migration adds `structural: []` (missing key normalizes); v5 idempotent (returns same reference); v2→v5 full chain preserves existing data; import without `structural` key normalizes to empty array.
  - **Done**: `bun test -- migrate-structural` passes.
  - **Files**: `tests/migrate-structural.test.ts`

- [x] **S1-15** — Create `tests/structural-utils.test.ts`: test `isWithinTerrain` (inside, outside, edge), `snapToTerrainEdge` (clamp behavior).
  - **Done**: `bun test -- structural-utils` passes.
  - **Files**: `tests/structural-utils.test.ts`

- [x] **S1-16** — Create `tests/structural.store.test.ts`: test `addColumn` assigns active floor id + uuid, `moveColumn` immutability, `removeColumn` filters array, `replaceStructural` replaces entire slice. Use `act` from `@testing-library/react` or direct `useStructuralStore.getState()` calls.
  - **Done**: `bun test -- structural.store` passes.
  - **Files**: `tests/structural.store.test.ts`

### Phase A10: Verification

- [x] **S1-17** — Run full verification suite: `bun lint`, `bunx tsc --noEmit`, `bun build`, `bun test`. Manual: `bun dev`, place columns, select, move, delete, undo/redo, export/import.
  - **Done**: all commands green; column CRUD works end-to-end.
  - **Files**: none (verification only)

---

## Slice B — Beams (PR 2)

Base branch: PR 1 branch (`feature/structural-columns-beams` after Slice A merge)

### Phase B1: Beam Type Extension

- [x] **S2-1** — Extend `src/types/plan.ts`: add `Beam` interface: `{ id: string; floorId: string; x1: number; y1: number; x2: number; y2: number; width: number }`. Extend `StructuralElement = Column | Beam`. Extend `CanvasState.activeTool` with `"beam"`. Extend `PanelType` in `panel.store.ts` with `"beam"`.
  - **Done**: `tsc --noEmit` passes; Beam exported; activeTool includes "beam".
  - **Files**: `src/types/plan.ts`, `src/stores/panel.store.ts`

### Phase B2: Beam Pure Logic

- [x] **S2-2** — Extend `src/lib/structural-utils.ts`: add `DEFAULT_BEAM_WIDTH = 20`. Add `snapBeamEndpoint(p, columns, walls, magnetize)` — within `SNAP_THRESHOLD` (25 cm, import from `constants.ts`) of column center or wall endpoint, return snapped point; otherwise return raw point. Add `beamLength(beam): number` (Euclidean distance in cm). Add `validateBeam(beam): boolean` — false if zero-length. Add helper `columnCenters(floorColumns): Point[]`.
  - **Done**: `tsc --noEmit` passes; all functions exported.
  - **Files**: `src/lib/structural-utils.ts`

### Phase B3: Store Extension

- [x] **S2-3** — Extend `src/stores/structural.store.ts`: add `addBeam(beam: Omit<Beam, "id" | "floorId">)` (same floor-scope + uuid pattern as addColumn). Add `updateBeam(id, updates)`, `removeBeam(id)`. Extend `getStructuralForFloor` to return both columns and beams. `replaceStructural` already handles the full union.
  - **Done**: beam CRUD works; `tsc --noEmit` passes.
  - **Files**: `src/stores/structural.store.ts`

### Phase B4: Layer Extension

- [x] **S2-4** — Extend `src/components/canvas/StructuralLayer.tsx`: render beams. For each beam, compute band polygon using `wallBandPoints(beam.x1, beam.y1, beam.x2, beam.y2, beam.width)` (import from `lib/wall-utils.ts`). Render as `Line` with `closed={true}`. Selection: `selectedId === beam.id` with amber stroke. Click handler: select beam on click. Band color: fill `#94a3b8` (slate-400), stroke `#475569` (slate-600).
  - **Done**: beams render as bands; selection works; `tsc --noEmit` passes.
  - **Files**: `src/components/canvas/StructuralLayer.tsx`
  - ⚠️ **Hot path**: memoize beam rendering; verify no re-render on pan/zoom.

### Phase B5: Beam Tool Wiring

- [x] **S2-5** — Modify `src/components/canvas/PlanCanvas.tsx`: add beam tool as `mousedown → mousemove → mouseup` flow (similar to wall tool pattern). On mousedown with `activeTool === "beam"`: store start point (snapped via `snapBeamEndpoint` if magnetism on). On mousemove: update preview state (band preview). On mouseup: call `addBeam({ x1, y1, x2, y2, width: DEFAULT_BEAM_WIDTH })` if `validateBeam` passes and `viewMode === "2d"`. Escape cancels in-progress stroke (already handled by existing Escape handler at line 151-173 — extend to check `drawStartRef.current` for beam tool too).
  - **Done**: beam draw works; Escape cancels; `bun lint && bunx tsc --noEmit && bun build` pass.
  - **Files**: `src/components/canvas/PlanCanvas.tsx`

### Phase B6: Properties UI

- [x] **S2-6** — Create `src/components/panel/BeamEditor.tsx`: width input (type="number", min 10, step 5), reads from `useStructuralStore`. Calls `updateBeam(id, { width })`. Spanish labels. Follow `ColumnEditor` pattern.
  - **Done**: beam width editable; `tsc --noEmit` passes.
  - **Files**: `src/components/panel/BeamEditor.tsx`

- [x] **S2-7** — Modify `src/components/panel/PropertiesPanel.tsx`: add branch for `type === "beam"`, route to `BeamEditor`. Add beam tool activation button in `src/components/sidebar/StructuralSection.tsx`.
  - **Done**: beam properties panel works; sidebar has beam button; `tsc --noEmit` passes.
  - **Files**: `src/components/panel/PropertiesPanel.tsx`, `src/components/sidebar/StructuralSection.tsx`

### Phase B7: Tests

- [x] **S2-8** — Extend `tests/structural-utils.test.ts`: add beam snap tests (column center snap, wall endpoint snap, raw point fallback), `beamLength` tests, zero-length rejection, `validateBeam`.
  - **Done**: `bun test -- structural-utils` passes.
  - **Files**: `tests/structural-utils.test.ts`

- [x] **S2-9** — Extend `tests/structural.store.test.ts`: add beam CRUD tests (addBeam assigns floor, removeBeam filters, updateBeam immutability).
  - **Done**: `bun test -- structural.store` passes.
  - **Files**: `tests/structural.store.test.ts`

### Phase B8: Verification

- [x] **S2-10** — Run full verification suite: `bun lint`, `bunx tsc --noEmit`, `bun build`, `bun test`. Manual: `bun dev`, draw beams, snap to columns, edit width, undo/redo.
  - **Done**: all commands green; beam CRUD + snapping works end-to-end.
  - **Files**: none (verification only)

---

## Slice C — Dimensioning + Floor Overlay (PR 3)

Base branch: PR 2 branch (after Slice B merge)

### Phase C1: Span Computation

- [x] **S3-1** — Extend `src/lib/structural-utils.ts`: add `SpanAnnotation` interface: `{ x1, y1, x2, y2, distanceCm, inRange }`. Add `CIRSOC_SPAN_MIN = 300`, `CIRSOC_SPAN_MAX = 600` constants (documented as application defaults, pending verification — rule 06). Add `computeSpanAnnotations(columns: Column[], beams: Beam[]): SpanAnnotation[]`. Logic: (1) for each beam, annotate its length; (2) for column pairs connected by a beam whose endpoints coincide with column centers, annotate center-to-center distance; (3) for unconnected columns, annotate nearest-neighbor distance (each column at most once). Memoize outside the function (caller responsibility, pattern from MeasurementLayer).
  - **Done**: function returns correct annotations; `tsc --noEmit` passes.
  - **Files**: `src/lib/structural-utils.ts`

### Phase C2: MeasurementLayer Extension

- [x] **S3-2** — Extend `src/components/canvas/MeasurementLayer.tsx`: add structural span annotation rendering. Import `useStructuralStore` and `useCanvasStore`. When `structuralDimensioningEnabled` (from canvas store), compute `computeSpanAnnotations(columns, beams)` for the active floor. Render each annotation as a `MeasurementLine`-style group (red dashed line + circles + midpoint label in meters). Use same `#ef4444` color and monospace bold font. `listening={false}` for annotations. Memoize annotation computation with `useMemo` keyed on columns/beams arrays.
  - **Done**: structural spans annotated; `bun lint && bunx tsc --noEmit && bun build` pass.
  - **Files**: `src/components/canvas/MeasurementLayer.tsx`
  - ⚠️ **Hot path**: memoize on structural geometry, NOT on zoom/pan.

### Phase C3: Floor Overlay Layer

- [x] **S3-3** — Create `src/components/canvas/FloorOverlayLayer.tsx`: `memo` component. Reads `floorOverlayEnabled` from `useCanvasStore`. Computes adjacent floor: find active floor's `level`, sort other floors by `|level - activeLevel|` ascending, tie-break floor below wins (spec floor-overlay-2). Reads adjacent floor's walls from `useWallsStore.getState().walls.filter(w => w.floorId === adjacentFloorId)` and columns from `useStructuralStore.getState().columns.filter(c => c.floorId === adjacentFloorId)`. Renders walls as bands (using `wallBandPoints`) with `opacity={0.3}`. Renders columns as rects with `opacity={0.3}`. All shapes `listening={false}`, `hitStrokeWidth={0}`. Early return `null` if no adjacent floor or single floor.
  - **Done**: overlay renders translucent adjacent floor; `tsc --noEmit` passes.
  - **Files**: `src/components/canvas/FloorOverlayLayer.tsx`
  - ⚠️ **Hot path**: memoize; must NOT recompute on pan/zoom or active floor geometry changes.

### Phase C4: Canvas Store Toggles

- [x] **S3-4** — Extend `src/stores/canvas.store.ts`: add `floorOverlayEnabled: boolean` (default false) and `structuralDimensioningEnabled: boolean` (default true). Add actions `toggleFloorOverlay()`, `toggleStructuralDimensioning()`. These are session-only display state (not persisted — rule 05).
  - **Done**: toggles work; `tsc --noEmit` passes.
  - **Files**: `src/stores/canvas.store.ts`

### Phase C5: PlanCanvas + Isometric Wiring

- [x] **S3-5** — Modify `src/components/canvas/PlanCanvas.tsx`: mount `<FloorOverlayLayer />` above `WallLayer` and below `MeasurementLayer` (per z-order spec: above all floor geometry, below annotations). Import and add.
  - **Done**: overlay layer renders in correct z-order; `tsc --noEmit` passes.
  - **Files**: `src/components/canvas/PlanCanvas.tsx`

- [x] **S3-6** — Modify `src/components/canvas/IsometricLayer.tsx`: import `useStructuralStore`. When `viewMode === "isometric"`, render columns as vertical prisms (extrude to `floorHeight` from `SunSettings`) using `projectToIsometric` pattern. Render beams as extruded bands along span. Read geometry from store, memoize on geometry change (not pan/zoom).
  - **Done**: isometric view shows structural elements as prisms/bands; `tsc --noEmit` passes.
  - **Files**: `src/components/canvas/IsometricLayer.tsx`
  - ⚠️ **Hot path**: memoize projection on geometry; do NOT recompute on pan/zoom.

### Phase C6: UI Toggle Controls

- [x] **S3-7** — Extend `src/components/sidebar/StructuralSection.tsx`: add toggle switches for "Superposición de plantas" (`floorOverlayEnabled`) and "Dimensionado automático" (`structuralDimensioningEnabled`). Use `<input type="checkbox">` with Spanish labels. Read/write from `useCanvasStore`.
  - **Done**: toggles render and control store state; `tsc --noEmit` passes.
  - **Files**: `src/components/sidebar/StructuralSection.tsx`

### Phase C7: Tests

- [x] **S3-8** — Extend `tests/structural-utils.test.ts`: test `computeSpanAnnotations` — beam length annotation, column pair distance, unconnected nearest-neighbor, empty arrays, CIRSOC range flag (inRange true/false).
  - **Done**: `bun test -- structural-utils` passes.
  - **Files**: `tests/structural-utils.test.ts`

### Phase C8: Verification

- [x] **S3-9** — Run full verification suite: `bun lint`, `bunx tsc --noEmit`, `bun build`, `bun test`. Manual: `bun dev`, enable overlay on multi-floor project, verify dimensioning labels, toggle off/on, isometric view with columns/beams.
  - **Done**: all commands green; overlay + dimensioning + isometric work end-to-end.
  - **Files**: none (verification only)

---

## Risk Register

| Risk | Slice | Mitigation |
|------|-------|------------|
| History snapshot missing structural slice → undo drops columns/beams | A | S1-5 extends `captureSnapshot` once; S1-6 extends `applyHistoryEntry`; S1-16 tests undo/redo round-trip |
| v4→v5 migration breaks existing v4 projects | A | S1-7 follows additive/idempotent pattern (guard `version >= 5` returns data untouched); S1-14 tests v2→v5 chain + idempotency |
| Beam snap false-positives (snapping to wrong element) | B | S2-2 uses existing `SNAP_THRESHOLD` from `constants.ts`; tests cover column-center, wall-endpoint, and raw-point paths |
| Canvas performance: StructuralLayer re-renders on pan/zoom | A,B | S1-4/S2-4 use fine selectors + `memo`; verify with `bun dev` (hot path check in S1-17/S2-10) |
| Floor overlay recomputes on active-floor geometry change | C | S3-3 subscribes to adjacent-floor data only; `listening={false}` prevents interaction; memoize with `useMemo` keyed on adjacent floor id |
| CIRSOC span range values unverified | C | S3-1 constants flagged "application default, pending verification"; rule 06 enforced: no regulatory assertion |
| Isometric structural rendering duplicates state | C | S3-6 reads from structural store (single source of truth); same geometry as 2D layer |

## Key Learnings

1. The existing `captureSnapshot` in `history.store.ts` reads from 4 stores (floors, terrain, fixtures, walls) — adding structural requires importing exactly one more store and adding one field to the return object.
2. The `wallBandPoints` function from `lib/wall-utils.ts` is reusable for beam rendering — beams are center-line bands identical in geometry to walls, just with different width semantics.
3. The v3→v4 migration pattern (additive field + guard + idempotent check) in `migrate.ts` is the exact template for v4→v5 — add `structural: []` and bump the version guard.
4. Layer z-order in `PlanCanvas.tsx` is explicit in JSX order: StructuralLayer must go between RoomLayer (below) and WallLayer (above), per the spec's "columns sit on the slab, walls render over them."
5. The sidebar section pattern uses collapsible sections with `useState` toggles — `StructuralSection` follows the same pattern as `FixtureCatalog.tsx`.
