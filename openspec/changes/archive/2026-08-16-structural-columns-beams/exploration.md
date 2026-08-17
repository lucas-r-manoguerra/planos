# Exploration: Structural Elements (Columns & Beams) + Automatic Dimensioning + Floor Overlay

## Current State

The editor has no structural concept today. Verified across the codebase:

- **Domain types** (`src/types/plan.ts`): `Room` (rect, cm, `wallWidth`), `Terrain` (cm, `front`, `northAngle`), `Floor` (`{id, name, level, rooms}`), `Wall` (`{id, floorId, x1, y1, x2, y2, thickness, roomId?}` — center line + thickness, `DEFAULT_WALL_THICKNESS = 10`), `Fixture` (x/y/width/height/rotation, anchored to walls for openings), `CanvasState` (zoom/pan/grid/`activeTool: "select"|"pan"|"wall"`/`viewMode`/`magnetismEnabled`), `SunSettings`.
- **Fixtures catalog** (`src/lib/fixtures-catalog.ts`): `FixtureCategory = "furniture" | "plant" | "door" | "window" | "stair" | "bathroom" | "vehicle"` — no `"structural"` category, no columns/beams items. Emoji icons, cm dimensions.
- **Stores** (`src/stores/`): walls, rooms (incl. terrain), fixtures, floors, canvas, selection, history, ruler, panel, sun, context-menu. History snapshot shape: `{ floors, activeFloorId, terrain, fixtures, walls }` with `MAX_HISTORY = 50` and a `beginGesture/endGesture` gesture pattern. Selection is id-based only (`selectedId`), no element-type discriminator.
- **Canvas layers** (`src/components/canvas/`): `GridLayer`, `TerrainLayer`, `RoomLayer`, `WallLayer` (draws walls via 8-point `wallBandPoints` polygon, fill-based, supports diagonals), `FixtureLayer` (memo + `useShallow` + per-glyph components), `MeasurementLayer` (ruler store: red committed measurements, blue preview), `ShadowLayer`, `SunArcLayer`, compass/coordinate overlays.
- **Persistence** (`src/lib/storage.ts`): `ProjectData { version, name, terrain, floors, activeFloorId, sunSettings, fixtures?, walls?, savedAt }`, `CURRENT_VERSION = 4`. LocalStorage + JSON export/import. Migration chain in `src/lib/migrate.ts`: v2→v3 (fixture `floorId`), v3→v4 (materialize walls + re-anchor openings to Wall entities); `migrateProjectData` is idempotent (returns data untouched if `version >= 4`).
- **Prisma schema** (`prisma/schema.prisma`): `Project` → `Floor` (rooms, walls) → `Room` (Int cm coords), `Wall`. Schema appears stale relative to client model (no terrain fields visible in the model layer; persistence via Prisma is not wired into the editor session which lives in Zustand per rule 05).
- **Normativa**: earlier exploration (openspec/changes/planos) recorded Argentine norms: CIRSOC 201 (reinforced concrete; beam spans 4–7 m, column grid 3–6 m), minimum room sizes (Casa Propia Res. 5/2022), wall thicknesses (exterior 25–30, interior 20–25, partition 10–12). Entre Ríos adopted CIRSOC via Res. 734 (Dec 2014).

Relevant memory: prior SDD init (#352) already listed "Structural: column positions, beam spans, load calculations" in the preliminary domain model; validation memory (#931) assigned "columnas/vigas" to Change B, flagged as needing a column model + CIRSOC research.

## Affected Areas

- `src/types/plan.ts` — new `StructuralElement` types (column/beam) or new `FixtureCategory` + `FixtureSubtype` members; possibly `CanvasState.activeTool` (add `"column"` / `"beam"` tools) and `viewMode` interplay.
- `src/stores/structural.store.ts` (new) — if structural becomes its own store: CRUD, placement, floor scoping, history integration.
- `src/stores/fixtures.store.ts` — only if columns/beams are modeled as fixtures (placement, selection, panel wiring).
- `src/stores/history.store.ts` — snapshot shape must include structural elements (either via new store or extended fixtures slice) for undo/redo correctness.
- `src/stores/canvas.store.ts` — new active tools; floor-overlay toggle/state.
- `src/components/canvas/StructuralLayer.tsx` (new) — render columns/beams; follow layer rules (one file = one layer, reads store via fine selectors, no direct Konva mutation).
- `src/components/canvas/MeasurementLayer.tsx` + `src/stores/ruler.store.ts` — reuse/extend for automatic dimensioning of structural spans.
- `src/components/canvas/` floor-overlay rendering (new layer or option in an existing overlay) — overlay adjacent floor's structure with transparency.
- `src/lib/structural-utils.ts` (new) — pure logic: column/beam geometry, snap-to-grid, span computation, normativa validation (CIRSOC span ranges).
- `src/lib/fixtures-catalog.ts` — only if fixtures route chosen (add `"structural"` category + column/beam items).
- `src/lib/migrate.ts` + `src/lib/storage.ts` — v4 → v5 migration (structural array) if new first-class entities; bump `CURRENT_VERSION`.
- `src/components/sidebar/` (StructuralPanel or FixtureCatalog section) — UI to add/edit structural elements; `src/components/panel/PropertiesPanel.tsx` + `panel.store.ts` (`PanelType` union) for editing.
- `prisma/schema.prisma` — only if/when persistence alignment happens (out of scope for this change unless required).
- `tests/` — new unit tests for structural-utils and v4→v5 migration.

## Approaches

1. **First-class structural domain** (new `structural.store.ts` + `StructuralLayer` + `StructuralElement` types, v5 migration)
   - Separate `Column` (x, y, section size, e.g. 20×20/25×25/30×30 cm) and `Beam` (span between two points/walls, width) entities per floor; new `"column"` / `"beam"` tools; structural elements persist in `ProjectData.structural`; migration v4→v5 adds empty array.
   - Pros: cleanest domain fit (matches rule 03 "if a datum exists in the domain, it has its type in plan.ts"); enables beams as first-class spans (not rotated rectangles); natural home for CIRSOC span validation and future load calculations; no pollution of the furniture fixture catalog; floor overlay becomes a structural-only concern (columns align across floors).
   - Cons: largest surface (types + store + layer + 2 tools + migration + UI panel + tests); history snapshot must be extended in every store that records it; more work before first visible feature.
   - Effort: High

2. **Structural as fixture category** (extend `FixtureCategory` with `"structural"`, add catalog items, render via `FixtureLayer` glyphs)
   - Pros: reuses placement/drag/select/rotate/history machinery wholesale; minimal new store code (fixtures already have `floorId`, position, rotation); fastest path to "place a column".
   - Cons: columns/beams are NOT furniture — semantic mismatch (rotation semantics, no span between points, no wall anchoring); `FixtureCategory` is a closed union touched in catalog + types + glyph dispatch + panel; beams would be rectangles without connection semantics; CIRSOC validation would fight the fixture model; floor overlay would need to filter fixtures by category (fragile).
   - Effort: Low-Medium

3. **Hybrid/staged**: first-class `Column` now (types + store + layer + migration + UI), beams + automatic dimensioning + floor overlay in follow-up slices of the same change chain.
   - Pros: converges on the right model (approach 1) but delivers value incrementally; matches repo's chained-PR delivery strategy (auto_chain, review budget 800 lines); migration + types land once, later slices build on them; each slice stays < 400 lines of diff.
   - Cons: slice 1 alone lacks beams/overlay so structural feature is partial until chain completes; requires discipline to keep chain ordered.
   - Effort: Medium-High total, sliceable

## Recommendation

**Approach 3 (staged first-class structural domain).** Columns and beams are genuine domain entities per rule 03, not fixtures — the fixture model cannot represent "beam spanning between points" or normativa span checks without contortions. Persisting them in `ProjectData.structural` (v5) mirrors the v4 walls migration pattern exactly (idempotent, additive, rollback-safe). The chain should be: (a) types + v5 migration + structural.store + StructuralLayer + tools + sidebar section; (b) beams (span between columns/walls, snap); (c) automatic dimensioning of structural spans (reuse ruler/MeasurementLayer patterns + CIRSOC span defaults) + floor overlay with transparency toggle. CIRSOC 201 span values must be verified against the reglamento before being asserted in UI/normativa validation (rule 06: no unverified normativa claims).

## Risks

- **Scope**: the request bundles four features (columns, beams, dimensioning, overlay). Uncontrolled, it exceeds any reviewable PR. Mitigation: staged chain as above.
- **History correctness**: every store that pushes to history must include the new structural slice, or undo/redo will drop structure. Mitigation: extend the shared snapshot helper once, centralize `recordHistory` shape.
- **Migration compat**: v4 → v5 must stay additive and idempotent (existing pattern guarantees rollback safety); tests must cover v2→v5 and v5 idempotency.
- **Normativa accuracy**: CIRSOC span/thickness values are domain knowledge that must be verified against the reglamento (or content docs) before being enforced — no invented values.
- **Canvas performance**: structural layer must follow rule 09 (fine selectors, memoization); overlay layer must not recompute on every pan/zoom.
- **Prisma drift**: editor data lives in Zustand; Prisma schema is already stale. Do not couple this change to Prisma unless explicitly required.
- **Language**: code/identifiers in English, UI content in Spanish (rule INDEX.5).

## Ready for Proposal

Yes. The change is scoped and recommended: staged first-class structural domain (Approach 3). The orchestrator should tell the user: "Exploración lista — se propone modelar columnas y vigas como entidades de dominio de primera clase (no como muebles), en 3 etapas encadenadas (columnas → vigas → dimensionado automático + superposición de plantas), con migración de datos v4→v5 aditiva e idempotente y validación CIRSOC 201 a verificar contra el reglamento."
