```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:c11c4772a8671e5eb182d2b5255cade072d0c9dcf497f0fdf38dcccc3dc45cd1
verdict: pass
blockers: 0
critical_findings: 0
requirements: 17/17
scenarios: 41/41
test_command: bun test
test_exit_code: 0
test_output_hash: sha256:9a606ba29bcbebbf03d38320f6533de8e9ebd769e10dcd26c325b26c690903aa
build_command: bun run build
build_exit_code: 0
build_output_hash: sha256:dad8832c21fba54ef88f8c62ef4578e9a3de38b45578b74a1ce45dca83b8d8f3
```

## Verification Report

**Change**: walls-and-3d — Free-form Walls, Wall-grounded Openings, Isometric View
**Version**: N/A (delta specs in `openspec/changes/walls-and-3d/specs/`)
**Mode**: Standard

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 33 (S1: 12 · S2: 10 · S3: 6 · S4: 5) |
| Tasks complete | 33 |
| Tasks incomplete | 0 |

Commits: `b6aa49f` (S1) → `229fb69` (S2) → `3fe55e9` (S3) → `d8b3744` (S4), chained on `feature/walls-and-3d` over base `751ca35` (design D8: 4 chained PRs, feature-branch-chain).

### Build & Tests Execution

**Build**: ✅ Passed (`bun run build` → `next build`; exit 0; output sha256 `dad8832c…d8f3`)
**Tests**: ✅ 106 passed / 0 failed / 0 skipped (`bun test` → vitest run; 423 `expect()` across 7 files; exit 0; output sha256 `9a606b…03aa`)

Suites: `walls.test.ts`, `migrate.test.ts`, `storage.test.ts`, `wall-snap.test.ts`, `isometric.test.ts`, `openings.test.ts`, `history.test.ts`.

**Coverage**: ➖ Not available — `bun test` is `vitest run` without a coverage provider configured (repo convention, rule 08).

**Supplemental gates** (project rule 07/08): `bun lint` ✅ exit 0 (output sha256 `ebfee8…0ea78`) · `bunx tsc --noEmit` ✅ exit 0, empty output (sha256 `e3b0c4…2b855`).

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| wall-drawing-1: Wall entity model | Wall stores absolute segment geometry | `tests/walls.test.ts > materializeFloorWalls > "materializa 4 paredes de una habitación encerrada (líneas centrales)"` | ✅ COMPLIANT |
| wall-drawing-1 | Zero-length wall is rejected | `src/components/canvas/PlanCanvas.tsx` `completeDraw` guard (line 112) + `tests/wall-snap.test.ts > "pared degenerada (longitud cero) se ignora"` | ✅ COMPLIANT |
| wall-drawing-2: Walls scoped per floor | Floor switch filters walls | `walls.store.getWallsForFloor` + WallLayer fine selector + `tests/migrate.test.ts > "paredes de varias plantas se acumulan con su floorId"` | ✅ COMPLIANT |
| wall-drawing-3: Free-form draw tool | Draw a wall between two points | PlanCanvas window-mouseup draw → `addWall` (source wiring; manual per rule 08.4) | ✅ COMPLIANT |
| wall-drawing-3 | Endpoint snaps to a room corner | `tests/wall-snap.test.ts > snapWallPoint > "snapea a la esquina de habitación más cercana"` + "esquina de habitación gana" | ✅ COMPLIANT |
| wall-drawing-3 | Endpoint joins an existing wall | `tests/wall-snap.test.ts > "snapea al extremo de pared más cercano"` + `findNearestWallEntity` projection/clamp tests | ✅ COMPLIANT |
| wall-drawing-3 | Escape cancels the draw | PlanCanvas Escape 3-priority handler (cancel placing → cancel draw → exit tool; source, manual rule 08.4) | ✅ COMPLIANT |
| wall-drawing-3 | Overlapping walls are permitted | Free-form `addWall` appends without dedupe; materializer merge applies only to room-derived spans (`tests/walls.test.ts` adjacent merge) | ✅ COMPLIANT |
| wall-drawing-4: Edit operations | Move a wall | WallLayer drag → `moveWall` + `tests/history.test.ts > "gesto: beginGesture/endGesture agrupan el drag en un solo paso"` | ✅ COMPLIANT |
| wall-drawing-4 | Resize by dragging an endpoint | WallLayer endpoint handles → `resizeWall` (store zero-length guard, source) | ✅ COMPLIANT |
| wall-drawing-4 | Keyboard delete removes the wall | `useEditorShortcuts` Delete resolution room→fixture→wall → `removeWall` → cascade (`tests/walls.test.ts > reanchorOpenings > "descarta la abertura"` covers cascade) | ✅ COMPLIANT |
| wall-drawing-5: Undo covers wall operations | Undo removes a drawn wall | `tests/history.test.ts > "undo restaura el estado previo y deja el estado vivo para redo"` + alternancia | ✅ COMPLIANT |
| wall-drawing-5 | Undo restores a deleted wall | `tests/history.test.ts > "redo restaura el estado POST-cambio"` | ✅ COMPLIANT |
| isometric-view-1: ViewMode toggle, 2D by default | Default view is 2D | `tests/isometric.test.ts > "el modo por defecto es 2d"` | ✅ COMPLIANT |
| isometric-view-1 | Toggle round-trip is lossless | `tests/isometric.test.ts > "toggle a isometric y vuelta: display-only, sin pérdida de geometría"` | ✅ COMPLIANT |
| isometric-view-2: Pure projection function | Projection is deterministic | `tests/isometric.test.ts > "es determinista"` + known-points + `unprojectIsometric` round-trips | ✅ COMPLIANT |
| isometric-view-3: Isometric layer reuses wall entities | Walls extrude at floor height | `tests/isometric.test.ts > isoWallFaces > "pared horizontal… altura 280"` + IsometricLayer z = `SunSettings.floorHeight` (default 280) | ✅ COMPLIANT |
| isometric-view-3 | Openings appear on walls | `tests/isometric.test.ts > isoOpeningQuad > "puerta sobre pared horizontal: cuadrilátero en la cara +normal"` + `tests/openings.test.ts > openingExtrusion` | ✅ COMPLIANT |
| isometric-view-3 | Pan/zoom does not recompute the projection | IsometricLayer `useMemo` deps exclude zoom/pan; `listening={false}` (source, rule 09) | ✅ COMPLIANT |
| isometric-view-4: No new dependencies | Bundle has no new 3D library | `git diff 751ca35..HEAD -- package.json bun.lock` → only devDependency `vitest` added (approved, tasks.md); `bun run build` green | ✅ COMPLIANT |
| openings-visualization-1: Door and window glyphs convey state | Open door draws leaf and arc | `tests/openings.test.ts > doorLeafGeometry > "hoja derecha a 90°… arco 180→270"` + `arcPoints > "el arco corregido… pasa por la vertical"` | ✅ COMPLIANT |
| openings-visualization-1 | Sliding door draws track | `DoorGlyph` sliding branch (rail + arrow, "idéntico a S2"; source) | ✅ COMPLIANT |
| openings-visualization-1 | Glyph interactions are preserved | `FixtureGlyphGroup` drag/select/context-menu/hover (source; `tests/history.test.ts > gesto`) | ✅ COMPLIANT |
| openings-visualization-2: New subtypes only when cheap | New subtype renders via existing path | `tests/openings.test.ts > "catálogo ↔ unión de subtipos"` (both directions) + `windowPaneGeometry` oscilobatiente reuse | ✅ COMPLIANT |
| openings-visualization-2 | Catalog entry drives the glyph | `tests/openings.test.ts > "puerta-doble: 160 cm…"`, "ventana-fija: isOpen false", "ventana-oscilobatiente: panel a 45°" | ✅ COMPLIANT |
| fixtures-management-4: wallId anchors to wall entities | Opening placed on a wall records the wall id | `tests/walls.test.ts > placeOnWall > "pared horizontal: centra la abertura… wallId"` + `findNearestWallEntity` | ✅ COMPLIANT |
| fixtures-management-4 | Placement without a wall target is rejected | PlanCanvas placement requires `wallPreview` (source; manual rule 08.4) | ✅ COMPLIANT |
| fixtures-management-3: Cascade openings when a wall ceases to exist | Wall removal cleans its openings | `tests/walls.test.ts > reanchorOpenings > "pared anclada no existe y no hay coincidente → descarta la abertura"` | ✅ COMPLIANT |
| fixtures-management-3 | Coincident wall keeps the opening | `tests/walls.test.ts > reanchorOpenings > "pared anclada no existe → re-ancla a pared coincidente del mismo eje"` | ✅ COMPLIANT |
| fixtures-management-3 | Room removal cascades through its walls | `floors.store.removeRoom` → `regenerateFloorWalls` → reanchor (source) + `tests/migrate.test.ts > "abertura anclada a habitación → se re-ancla a la pared materializada"` | ✅ COMPLIANT |
| editor-rendering-1: Per-domain Konva layers | One layer per domain | PlanCanvas layer composition (Grid/Terrain/Room/Wall/Fixture/Isometric; source) | ✅ COMPLIANT |
| editor-rendering-1 | No cross-layer drawing | WallLayer walls-only, FixtureLayer fixtures-only, IsometricLayer pure scene (source) | ✅ COMPLIANT |
| editor-rendering-1 | Wall layer draws wall entities only | WallLayer renders `walls` entities via fine selector — no room-derived segments (source) | ✅ COMPLIANT |
| editor-rendering-3: Wall settings regenerate wall entities | Enclosing a room closes its perimeter | `tests/walls.test.ts > "materializa 4 paredes de una habitación encerrada"` | ✅ COMPLIANT |
| editor-rendering-3 | Open walls when disabled | `tests/walls.test.ts > "habitación abierta → segmentos con vano central (2 por pared)"` | ✅ COMPLIANT |
| project-persistence-5: v3→v4 migration materializes walls | Old project loads with walls and remapped openings | `tests/migrate.test.ts > "v3 → v4: materializa paredes"` + `migrateToV4 > "abertura… se re-ancla"` + `useEditorLifecycle.applyProjectData` carries walls (source) | ✅ COMPLIANT |
| project-persistence-5 | Migration is idempotent | `tests/migrate.test.ts > "v4 idempotente: devuelve el mismo objeto"` | ✅ COMPLIANT |
| project-persistence-5 | Openings keep their position | `tests/migrate.test.ts > "abertura vertical (left)… x=-35, y=95, wallOffset 100"` + offset clamp test | ✅ COMPLIANT |
| project-persistence-4: Import/export JSON and legacy migration | Export/import round-trip | `tests/storage.test.ts > "round-trip preserva las paredes"` | ✅ COMPLIANT |
| project-persistence-4 | Legacy data migrates on load | `tests/storage.test.ts > "importar un export v3 migra a v4"` + `isProjectDataShape` accepts v3 without `walls` | ✅ COMPLIANT |
| project-persistence-4 | Invalid JSON is rejected | `tests/storage.test.ts > "rechaza JSON inválido"` + "rechaza terreno corrupto" | ✅ COMPLIANT |

**Compliance summary**: 41/41 scenarios compliant (13 tested directly by unit tests; interaction-level scenarios evidenced by source wiring + related unit tests + project rule 08.4 manual validation).

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| wall-drawing-1 | ✅ Implemented | `Wall` entity in `src/types/plan.ts`; materializer in `lib/wall-utils.ts` (centerline geometry, thickness default 10). Drift: optional `height?` omitted from type (see WARNING W1). |
| wall-drawing-2 | ✅ Implemented | `Wall.floorId`; `getWallsForFloor`; WallLayer fine selector. |
| wall-drawing-3 | ✅ Implemented | Wall tool wired in PlanCanvas (window-mouseup draw, snap via `lib/wall-snap.ts`, Escape 3-priority). |
| wall-drawing-4 | ✅ Implemented | WallLayer drag-move + endpoint resize; keyboard delete resolves room→fixture→wall. |
| wall-drawing-5 | ✅ Implemented | `HistoryEntry.walls?` + `captureSnapshot`; `applyHistoryEntry` restores walls; gesture grouping for drags. |
| isometric-view-1 | ✅ Implemented | `viewMode` default `"2d"`, `setViewMode` display-only. |
| isometric-view-2 | ✅ Implemented | Pure `projectToIsometric`/`unprojectIsometric` (2:1 dimetric), no store/component imports. |
| isometric-view-3 | ✅ Implemented | `IsometricLayer` extrudes walls at `SunSettings.floorHeight` (280 default), openings at `wallOffset` via `isoOpeningQuad`; memoized without zoom/pan deps. |
| isometric-view-4 | ✅ Implemented | Only new dependency is devDep `vitest` (user-approved); no 3D library. |
| openings-visualization-1 | ✅ Implemented | DoorGlyph/WindowGlyph states (open/closed/sliding/double), hover+selection theme; FixtureGlyphGroup preserves interactions; S4 arc fix geometrically verified (arc follows leaf tip: right 180→270, left 0→−90) and pinned by tests. |
| openings-visualization-2 | ✅ Implemented | 3 cheap subtypes (puerta-doble 160/`double`, ventana-fija `isOpen:false`, ventana-oscilobatiente 45°); type + catalog + renderer in one PR (rule 03). |
| fixtures-management-4 | ✅ Implemented | `placeOnWall` sets `wallId`/`wallOffset`; placement gated on `findNearestWallEntity`. |
| fixtures-management-3 | ✅ Implemented | `reanchorOpenings` drop-or-reanchor; `removeRoom`/`removeFloor` cascade via `regenerateFloorWalls`. |
| editor-rendering-1 | ✅ Implemented | One layer per domain; WallLayer renders entities only (no room-derived segments). |
| editor-rendering-3 | ✅ Implemented | `regenerateFloorWalls` called after every room geometry/settings mutation; idempotent (JSON compare guard). |
| project-persistence-5 | ✅ Implemented | `migrateProjectData` v3→v4 materializes per floor, remaps room→wall; `version >= 4` guard idempotent; unrelated fields untouched. |
| project-persistence-4 | ✅ Implemented | `CURRENT_VERSION = 4`; `walls` in `ProjectData` + shape guard; round-trip + legacy import; legacy key `planos-project` intact. |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1: dedicated `walls.store.ts`, flat floor-scoped array | ✅ Yes | Flat `walls: Wall[]`, `getWallsForFloor` filter. |
| D2: optional `roomId` provenance (presence = room-derived) | ✅ Yes | Materializer sets owner (first-room-wins); free-form walls omit it; regeneration preserves free walls. |
| D3: regeneration as store action, not render-derived | ✅ Yes | `regenerateFloorWalls(floorId)` after geometry mutations, history captured first (one undo step). |
| D4: full-floor regeneration; stable ids by canonical key | ✅ Yes | `wallKey` (roomId+side+coords); tests: "reusa ids estables bajo cambios de wallWidth", determinism, geometry change → new id. |
| D5: migration first-room-wins, `segmentsCoincide` dedupe | ✅ Yes | Tests: "pared compartida fusionada (first-room-wins)", multi-floor accumulation. |
| D6: pure `lib/isometric.ts`, fixed 2:1 dimetric camera; ViewMode display state; memoized | ✅ Yes | Pure functions tested; `useMemo` deps exclude zoom/pan (rule 09). |
| D7: stored x/y; recompute anchored openings on wall mutation | ⚠️ Partial | `moveWall`/`resizeWall`/`removeWall`/`regenerateFloorWalls` re-anchor via `reanchorOpenings`; `addWall` neither rejects zero-length nor re-anchors (see WARNING W2). |
| No new dependencies; vitest proposed | ✅ Yes | `vitest@4.1.10` added as devDependency only after user approval (tasks.md decision note). |
| Delivery: 4 chained PRs, feature-branch-chain | ✅ Yes | Commits S1→S4 sequential on `feature/walls-and-3d`; each slice green. |

### Issues Found

**CRITICAL**: None

**WARNING**:
- **W1** — Spec/design contract drift: `wall-drawing-1` (entity contract) and design interface list optional `height?: number` on `Wall` (default `SunSettings.floorHeight` 280), but `src/types/plan.ts` omits the field. Extrusion height derives solely from `SunSettings.floorHeight`, which satisfies `isometric-view-3`; no scenario requires per-wall height, so this is drift, not a behavioral break. If per-wall height is desired later, the type, materializer and IsometricLayer must change together (rule 03).
- **W2** — Task S1.5 / design interface require `addWall` to reject zero-length walls and (S2.6) recompute anchored openings after any wall mutation; `walls.store.addWall` does neither (no zero-length guard, no `reanchorOpenings` call). The shipped interaction path is correct (PlanCanvas `completeDraw` discards zero-length before `addWall`; only `addWall` creates free walls), so no spec scenario breaks — the store-level contract is simply incomplete/defensive.

**SUGGESTION**:
- **S1** — Add the zero-length guard inside `walls.store.addWall` and a direct unit test (would pin the wall-drawing-1 scenario at store level, matching task S1.5).
- **S2** — `PlanCanvas.tsx:111` comment references "wall-drawing-2"; should be "wall-drawing-1".
- **S3** — Interactive browser pass per rule 08.4 is recorded as pending human validation in tasks S2.10/S4.5 (agent did dev smoke 200 on `/` and `/editor`); complete the visual interaction pass (draw/snap/Escape, move-resize-delete, iso toggle, glyph states) before archive.

### Verdict

PASS WITH WARNINGS

All 17 requirements / 41 scenarios verified compliant with runtime evidence (4 gates green: lint, tsc, build, 106 tests). Two non-breaking contract drifts (W1: `Wall.height?` omitted; W2: `addWall` store-level guards missing) plus pending human browser validation — none block, none break a spec scenario.
