# Apply Progress: Wall Magnetism — P1 (PR 1) + P2 (PR 2 → PR 1) + P3 (PR 3 → PR 2)

**Change**: `wall-magnetism` (openspec, auto-chain, feature-branch-chain)
**Slices**: P1 Angle Magnetism + Toggle (~330) — tasks P1.1–P1.10; P2 Collinear Merge (~300) — tasks P2.1–P2.5; P3 Preview Polish (~85) — tasks P3.1–P3.4
**Mode**: Strict TDD (RED → GREEN; RED captured, implementation green, no refactor step needed)
**Branches**: none created (orchestrator handles delivery)

## TDD Cycle Evidence

| Task | RED (test first) | GREEN (impl passes) | REFACTOR |
|---|---|---|---|
| P1.1–P1.3 | `tests/wall-angle-snap.test.ts` written → fail: `Cannot find module '@/lib/wall-angle-snap'` | `bun test tests/wall-angle-snap.test.ts` → 16 pass / 0 fail | None needed (fresh pure lib) |
| P1.6 | `tests/canvas-magnetism.store.test.ts` written → fail: `magnetismEnabled` undefined (2 fail) | after types + store → 3 pass / 0 fail | None |
| P1.4/P1.5 | covered by the RED suites above | `src/lib/wall-angle-snap.ts` + `plan.ts` + `canvas.store.ts` | None |
| P1.7–P1.9 | component wiring: no component test infra (vitest env `node`, no jsdom/RTL, no new deps per rule 07.3) → unit evidence + tsc/build gate | full gate green (below) | None |
| P1.10 | — | `tests/wall-snap.test.ts` (S2 anti-collapse) + `tests/walls.test.ts` green | — |
| P2.1–P2.2 | `tests/wall-merge.test.ts` written → fail: `Cannot find module '@/lib/wall-merge'` (15 tests RED) | after `src/lib/wall-merge.ts` → 15 pass / 0 fail | None needed (fresh pure lib) |
| P2.3 | `tests/walls.test.ts` store block written → fail: 3 fail (addWall appends, no merge) | after store merge path → 4 pass / 0 fail (one-undo, re-anchor, append, room-derived) | None |
| P2.4/P2.5 | covered by the RED suites above | `src/lib/wall-merge.ts` + `walls.store.ts` | None |
| P3.1 | `tests/wall-angle-snap.test.ts` extended (5 wallReadout + 2×2 formatter tests) → RED: `Export named 'formatAngleReadout' not found` (1 fail, file load error) | after pure helpers → 27 pass / 0 fail (16 P1 + 11 P3) | None needed (helpers reuse `wallAngleDeg`, no duplication) |
| P3.2 | same file: 4 `isSnapped` tests (no-snap false, x/y move true, angle-snap + OFF propagation, point-snap propagation) — covered by the same RED run above | green in the same 27-pass run | None |
| P3.3 | component wiring: no component test infra (vitest env `node`, no jsdom/RTL, no new deps per rule 07.3) → unit evidence + tsc/build gate | full gate green (below); `WallPreviewReadout.tsx` renders rotated angle+length readouts + amber snap indicator; wired in `WallLayer` draw preview; `PlanCanvas` `snapped` via `isSnapped` (behavior-identical) | `WallPreviewReadout` extracted as own file (WallLayer stays 248 lines < 300, rule 01) |
| P3.4 | memoization: verified by code inspection + selector discipline (no store reads in readout component; `memo`; preview ref stable across pan/zoom) — no perf harness available | readouts recompute only when `setDrawPreview` fires (mousedown/mousemove/Escape), never on wheel/dragmove (rule 09) | — |

## Work Unit Evidence (PR 1)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `bun test tests/wall-angle-snap.test.ts tests/canvas-magnetism.store.test.ts` → **19 pass, 0 fail, 39 expect** (16 angle-snap + 3 store) |
| Runtime harness command/scenario and exact result | `bun run build` → exit 0 (production build). `bun dev` manual flow (44° stroke → 45° snap, toggle, Shift invert) **pending** — no browser tooling in this environment; flagged for sdd-verify/manual validation (rule 08.4) |
| Rollback boundary | Revert PR 1 → S2 directional point-snap only (all changes are additive on top of `snapWallPointDirectional`, which remains untouched in `wall-snap.ts`) |

## Work Unit Evidence (PR 2)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `bun test tests/wall-merge.test.ts tests/walls.test.ts` → **49 pass, 0 fail, 117 expect** (15 merge lib + 34 walls incl. 4 new store tests); RED runs captured above |
| Runtime harness command/scenario and exact result | Store-level integration path: `addWall` → merge → `reanchorOpenings()` → one-undo via real zustand stores + history (no DOM needed, vitest env `node`) — exercised by the 4 store tests in `tests/walls.test.ts` (merge+undo, re-anchor wd-7, gap-append, room-derived). Visual canvas check (draw two contiguous walls → one wall) remains **pending** with P3.4's `bun dev` manual pass — flagged for sdd-verify (rule 08.4) |
| Rollback boundary | Revert PR 2 → P1 behavior (draw/append only, no merge): pure addition in `addWall` merge path + new `wall-merge.ts`; no P1 file behavior changed |

## Work Unit Evidence (PR 3)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `bun test tests/wall-angle-snap.test.ts` → **27 pass, 0 fail, 57 expect** (16 P1 + 11 P3: wallReadout, formatAngleReadout, formatLengthReadout, isSnapped); RED run captured above |
| Runtime harness command/scenario and exact result | Visual `bun dev` pass (readouts follow cursor mid-stroke; amber indicator on magnetized end; jank-free pan/zoom) **deferred to sdd-verify** — no browser tooling in this environment (rule 08.4). Memoization proven by code inspection: `WallPreviewReadout` is `memo` with zero store reads (props only); `PlanCanvas` `setDrawPreview` fires only on mousedown/mousemove/Escape; `drawPreview` reference stays stable across wheel/dragmove, so `WallLayer` (memo) and the readouts never recompute on pan/zoom |
| Rollback boundary | Revert PR 3 → P2 behavior (plain preview band + centerline): additive — new `WallPreviewReadout.tsx` + 4 pure helpers in `wall-angle-snap.ts` + 2 `isSnapped` substitutions in `PlanCanvas` (behavior-identical); no P1/P2 behavior changed |

## Verification Gate (rule 08)

| Check | Command | Result |
|---|---|---|
| Tests | `bun test` | **178 pass / 0 fail (11 files, 578 expect)** — P3 baseline was 167 (11 files) |
| Typecheck | `bunx tsc --noEmit` | exit 0 |
| Lint | `bun lint` | exit 0 |
| Build | `bun run build` | exit 0 |

## Files Changed

| File | Action | What Was Done |
|---|---|---|
| `tests/wall-angle-snap.test.ts` | Created | RED→GREEN suite P1.1–P1.3: wallAngleDeg, snapWallAngle, resolveWallEnd, effectiveMagnetism, wd-4 resize contract |
| `tests/canvas-magnetism.store.test.ts` | Created | P1.6: default ON, toggle flips, no persist middleware |
| `src/lib/wall-angle-snap.ts` | Created | P1.4 pure lib: `ANGLE_SNAP_TARGETS=[0,45,90,120,135]`, `ANGLE_SNAP_TOLERANCE=4`, `effectiveMagnetism`, `wallAngleDeg` ([0,180), 180°→0 wrap, zero-length guard), `snapWallAngle` (strict `<` tol, length preserved, tie→first), `resolveWallEnd` (directional point → angle → raw; OFF = raw) |
| `src/types/plan.ts` | Modified | P1.5: `CanvasState.magnetismEnabled: boolean` |
| `src/stores/canvas.store.ts` | Modified | P1.6: `initialState.magnetismEnabled = true`, `toggleMagnetism()` (session-only, no persist) |
| `src/components/canvas/PlanCanvas.tsx` | Modified | P1.7: `resolveCanvasWallEnd` chain; Shift XOR at mousedown (start), mousemove (preview) and mouseup commit (`handleWindowMouseUp(e)`); `snapped` in `WallDrawPreview`; removed dead `snapToCanvasPointDirectional` |
| `src/components/toolbar/Toolbar.tsx` | Modified | P1.8: Magnet toggle button, `aria-pressed`, Spanish labels, grid-button pattern |
| `src/components/canvas/WallLayer.tsx` | Modified | P1.9: `WallDrawPreview.snapped?: boolean`; resize `handleMove(e)` via `resolveWallEnd(p, pivot=stationary, rooms, others, magnetize)`; move keeps point-snap only (spec wall-drawing-4) |
| `tests/wall-merge.test.ts` | Created | RED→GREEN suite P2.1–P2.2 (15 tests): contiguous union (P2.1), overlap/diagonal union, gap>EPS no-merge, gap≤EPS merge, thickness/floor/room-derived guards (both sides), perpendicular/offset guards, anti-parallel (undirected dot), first-match no-cascade (D4), sibling preservation |
| `src/lib/wall-merge.ts` | Created | P2.4 pure lib: `tryMergeCollinearWalls(walls, newWall)` → `Wall[] | null` — EPS=1 (imported from `walls.ts`), both `!roomId`, same floor, thickness diff ≤ EPS, |dot| ≥ 1−1e-3, distance-to-line ≤ EPS, interval-union on direction axis with gap ≤ EPS, fresh `generateId()` entity (D4), one merge per call (no cascade) |
| `src/stores/walls.store.ts` | Modified | P2.5: `addWall` builds `wallWithId`, calls `tryMergeCollinearWalls(get().walls, wallWithId)` BEFORE set; merged → `set({ walls: merged })` + `get().reanchorOpenings()` (D4); else append. `recordHistory()` once at top → single undo step |
| `tests/walls.test.ts` | Modified | P2.3: 4 new store tests (`addWall merge` describe block): ONE-undo merge, re-anchor to merged wall at equivalent offset, gap>EPS appends, room-derived never merged |
| `src/components/canvas/WallPreviewReadout.tsx` | Created | P3.3: memoized readout component (95 lines) — rotated angle readout near cursor end + length readout at midpoint (MeasurementLayer rotated-Text pattern, flip-aware), amber snap indicator circle at the magnetized end when `preview.snapped`; reads NO store state (props only, rule 09) |
| `src/components/canvas/WallLayer.tsx` | Modified | P3.3: `WallDrawPreviewLine` renders `<WallPreviewReadout preview={preview} />` after band + centerline; imports the component (net +4 lines, file stays 248 < 300) |
| `src/components/canvas/PlanCanvas.tsx` | Modified | P3.3: both `snapped` assignments (mousedown start, mousemove end) now use `isSnapped(raw, resolved)` — behavior-identical to the previous inline comparisons (P1.7 semantics preserved) |
| `src/lib/wall-angle-snap.ts` | Modified | P3.1/P3.2: +4 pure helpers — `wallReadout(x1,y1,x2,y2)` → `{angleDeg, lengthCm}` (reuses `wallAngleDeg`), `formatAngleReadout` → `"45°"`, `formatLengthReadout` → `"345 cm"`, `isSnapped(raw, resolved)` → snap-flag semantics |
| `tests/wall-angle-snap.test.ts` | Modified | P3.1/P3.2 RED→GREEN: +11 tests — wallReadout (horizontal/45°/reversed/zero-length/snapped-end derivation), formatters (rounding + units), isSnapped (no-snap false, x/y move, angle-snap + OFF propagation, point-snap propagation) |
| `openspec/changes/wall-magnetism/tasks.md` | Modified | P1.1–P1.10 + P2.1–P2.5 + P3.1–P3.4 marked `[x]` |

## Deviations from Design

1. **D3 "Point wins by `result !== input`"** — implemented as a VALUE comparison (`snapped.x !== p.x || snapped.y !== p.y`). Intent preserved: `snapWallPointDirectional` always allocates a fresh object, so a reference comparison would never detect a change and point snap would never win. Noted for verify.
2. **P1.7/P1.9 manual browser validation deferred** — vitest env is `node` (no jsdom/RTL) and new deps are forbidden; component wiring is proven by unit + tsc + build only. Visual check (44°→45°, toggle, Shift) remains for sdd-verify / manual pass (rule 08.4).
3. **`tryMergeCollinearWalls` direction check uses |dot|** — D5 reads "dot ≥ 1−1e-3"; walls drawn in opposite directions (right→left) are collinear too, so the implementation takes the absolute value (undirected), per the merge intent. Covered by an explicit anti-parallel test. Noted for verify.
4. **P3.4 manual `bun dev` pass deferred** — P3.4 was marked `[x]` per orchestrator instruction with the browser validation (readouts jank-free on pan/zoom, toggle/Shift, indicator visibility) explicitly deferred to sdd-verify (rule 08.4); memoization itself is proven by code inspection + selector discipline (readout component reads no store; `memo`; preview reference stable across pan/zoom).
5. **Comment language follows file convention** — the orchestrator requested "English identifiers/comments"; new-file comments are English (wall-angle-snap.ts P1 precedent, WallPreviewReadout.tsx), while edits inside Spanish-commented existing files (WallLayer.tsx, PlanCanvas.tsx) keep the surrounding Spanish per repo convention (INDEX.5, extend-existing-code rule). Identifiers and readout strings are English/neutral ("345 cm", "45°").

## Issues Found

None blocking. One spec-context note: P2.3's "openings re-anchor" acceptance (listed under P2.2 in tasks.md) is exercised at the store level in `tests/walls.test.ts`, because `reanchorOpenings` is a store action over fixtures — the pure `wall-merge.ts` lib has no fixture knowledge (per interface). Mapping: P2.2 covers merge predicates; P2.3 covers undo + re-anchor end-to-end.

## Remaining Tasks

- sdd-verify: full change verification (all scenarios) + the two deferred `bun dev` manual passes (P2 merge visual, P3 readouts jank-free pan/zoom) per rule 08.4
