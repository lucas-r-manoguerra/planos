# Proposal: Structural Elements (Columns & Beams) + Automatic Dimensioning + Floor Overlay

## Intent

The editor models rooms, walls, and fixtures but has no structural concept. Architectural drawings require columns and beams; without them, plans are incomplete for realistic representation and normativa-based dimensioning, and users cannot align structure across floors. This change introduces a first-class structural domain (exploration Approach 3): columns and beams as domain entities, placement tools, automatic span dimensioning, and a transparent floor-overlay alignment aid.

## Goals

- First-class `Column`/`Beam` domain entities (rule 03 — domain data belongs in `types/plan.ts`)
- Placement tools (`"column"`, `"beam"`) + floor-scoped editing
- Floor-overlay alignment across floors (transparency toggle)
- Automatic span dimensioning reusing ruler/`MeasurementLayer` patterns; CIRSOC 201 span ranges **flagged to verify** against the reglamento before assertion (rule 06)

## Non-Goals

- Load calculations / structural analysis simulation
- Prisma persistence wiring — schema is stale vs Zustand session (rule 05); this change does NOT touch `prisma/schema.prisma`
- Circular columns (deferred unless open question 1 resolves otherwise)

## Scope

Three chained slices (delivery `auto_chain`, `feature-branch-chain`; budget 800 lines, aim < 400/PR):

| # | Slice | Deliverables | Acceptance hint |
|---|-------|--------------|-----------------|
| a | Columns | `Column` type + v4→v5 migration; `structural.store.ts`; `StructuralLayer` (columns); `"column"` tool; sidebar + properties UI | Place/select/move/delete a column per floor; undo/redo restores it; v2→v5 migration idempotent |
| b | Beams | `Beam` entity (span between points); snap to columns/wall endpoints; validation; `"beam"` tool | Beam spans column centers/wall endpoints with snap; invalid spans rejected |
| c | Dimensioning + overlay | Automatic structural-span dimensioning (ruler patterns); floor overlay (transparent adjacent-floor structure); toggle state | Structural spans auto-annotated; overlay toggles adjacent-floor structure |

### Out of Scope
- Structural analysis / load calcs; Prisma schema changes
- Room/wall automatic dimensioning (pending open question 4)

## Capabilities

### New Capabilities
- `structural-elements`: Column/Beam entities, tools, store, layer, v5 migration (slices a+b)
- `structural-dimensioning`: automatic span dimensioning via ruler/MeasurementLayer patterns (slice c)
- `floor-overlay`: transparent adjacent-floor structural overlay (slice c)

### Modified Capabilities
- `editor-history`: `HistoryEntry` + `captureSnapshot` include the structural slice
- `editor-rendering`: structural layer joins the per-domain Konva layer contract
- `project-persistence`: v4→v5 additive idempotent migration; `ProjectData.structural`

## Approach

First-class structural domain (Approach 3). Rationale: beams are spans between points, not rotated rectangles — the fixture model (closed `FixtureCategory` union, rotation semantics) cannot represent spans or CIRSOC validation without contortions, and overlay filtering by category would be fragile (exploration).

- **Migration**: mirror v3→v4 walls pattern — additive, idempotent (`version >= 5` guard returns data untouched); bump `CURRENT_VERSION` to 5; `defaultProjectData` initializes `structural: []`.
- **History**: extend `HistoryEntry` + `captureSnapshot` once (single helper reads the structural slice) so every recording store is covered.
- **Selection**: verified — rooms/walls/fixtures coexist via per-layer `selectedId === element.id` (UUIDs unique); `panel.store` already carries the type discriminator for property routing; structural adds new `PanelType` members + editor. No selection-store shape change.
- **Performance (rule 09)**: fine selectors, memoized layer, no recompute on pan/zoom.
- **Language**: code/identifiers English, UI Spanish (rule INDEX.5).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/types/plan.ts` | Modified | `Column`/`Beam`/`StructuralElement`; `activeTool` gains `"column"`/`"beam"` |
| `src/stores/structural.store.ts` | New | CRUD, placement, floor scoping, history integration |
| `src/stores/history.store.ts` | Modified | `HistoryEntry` + snapshot include structural |
| `src/stores/canvas.store.ts` | Modified | New tools; overlay toggle (slice c) |
| `src/stores/panel.store.ts` | Modified | `PanelType` + structural editor routing |
| `src/components/canvas/StructuralLayer.tsx` | New | Renders columns/beams |
| `src/components/canvas/FloorOverlayLayer.tsx` | New | Adjacent-floor overlay (slice c) |
| `src/components/canvas/MeasurementLayer.tsx` + `src/stores/ruler.store.ts` | Modified | Reused for structural dimensioning (slice c) |
| `src/lib/structural-utils.ts` | New | Pure geometry/span/snap/validation logic |
| `src/lib/migrate.ts` + `src/lib/storage.ts` | Modified | v4→v5 migration, `CURRENT_VERSION = 5` |
| `src/components/sidebar/` + `src/components/panel/PropertiesPanel.tsx` | Modified | Structural placement/editing UI |
| `tests/` | New | structural-utils, migration v2→v5, store/history tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope (4 features in one change) | High | 3-slice chain; each PR < 400 lines |
| History snapshot drops structural slice | Med | Extend `captureSnapshot` once; undo/redo tests |
| Unverified CIRSOC span/thickness values | Med | Mark to-verify; assert only after reglamento check (rule 06) |
| Prisma coupling / schema drift | Med | Explicitly out of scope; no `schema.prisma` changes |
| Canvas performance (new layer + overlay) | Med | Fine selectors, memoization, no pan/zoom recompute (rule 09) |
| Selection model (id-only `selectedId`) | Low | Verified: per-layer id-equality + UUIDs; `panel.store` routes editors |

## Rollback Plan

- Each slice is an independent PR in the chain; revert a slice by reverting its PR.
- v4→v5 migration is additive: `migrateProjectData` returns data untouched for `version >= 5`; rollback = drop `structural` field + restore `CURRENT_VERSION = 4`. v2→v4 paths untouched; v4 files remain readable.

## Dependencies

- None external. Reuses `lib/migrate.ts` walls pattern and ruler/`MeasurementLayer` infrastructure.

## Success Criteria

- [ ] Column/beam placement, selection, and editing per floor
- [ ] Undo/redo restores structural edits in all recording stores
- [ ] v2→v5 migration idempotent; v4 projects load with `structural: []`
- [ ] Structural spans auto-dimensioned with verified CIRSOC ranges
- [ ] Floor overlay toggles transparent adjacent-floor structure
- [ ] `bun lint` + `bunx tsc --noEmit` + `bun build` + `bun test` green

## Open Questions

Product decisions for proposal review (not harness mechanics):

1. Column sections to offer: 20×20 / 25×25 / 30×30 cm presets, or free-size input?
2. Default beam width: 20 cm (wall thickness default), match column section, or configurable?
3. Floor overlay: structural elements only, or also overlay rooms/walls of the adjacent floor?
4. Automatic dimensioning: structural spans only, or also room/wall spans?
5. Default column grid spacing (CIRSOC 201 grid 3–6 m — verify against reglamento)?
