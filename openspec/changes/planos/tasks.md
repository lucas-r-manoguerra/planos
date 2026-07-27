# Tasks: Project Scaffolding + Base 2D Canvas Architecture

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1200–1500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Scaffolding + core types + utils | PR 1 | `npx tsc --noEmit` | `docker compose up -d && npx prisma generate` | All config + `src/types/` + `src/lib/` + `prisma/` — revert removes project shell |
| 2 | Zustand stores + unit tests | PR 2 | `npx vitest run` | `npx vitest` | `src/stores/` + `src/__tests__/stores/` — revert removes state layer |
| 3 | Canvas + UI shell + integration | PR 3 | `npx tsc --noEmit && npx vitest run` | `npm run dev` — full visual check | `src/components/` + `src/app/` — revert removes UI |

## Phase 1: Scaffolding (PR 1)

- [ ] 1.1 Init Next.js 15 App Router project: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` in `/home/lucas/Documentos/Code/planos`
- [ ] 1.2 Install core deps: `npm install react-konva konva zustand uuid` + `npm install -D @types/uuid`
- [ ] 1.3 Create `docker-compose.yml` with PostgreSQL 16 service (port 5432, volume for data persistence)
- [ ] 1.4 Create `.env.local` with `DATABASE_URL="postgresql://planos:planos@localhost:5432/planos"` and `.env.example` template
- [ ] 1.5 Init Prisma: `npx prisma init --datasource-provider postgresql`, then write `prisma/schema.prisma` with Project, Floor, Room, Wall, Fixture models per design
- [ ] 1.6 Run `npx prisma generate` and verify no errors
- [ ] 1.7 Init shadcn/ui: `npx shadcn@latest init` with New York style, Zinc base, CSS variables, then `npx shadcn@latest add button input select label`
- [ ] 1.8 Verify: `docker compose up -d` starts Postgres, `npm run dev` starts without errors
- [ ] 1.9 Commit: `feat(scaffold): init Next.js 15, Docker, Prisma, shadcn/ui`

## Phase 2: Core Types + Utilities (PR 1 cont.)

- [ ] 2.1 Create `src/types/plan.ts` — RoomType enum (6 values), Room, Terrain, CanvasState, RoomStore interfaces per design
- [ ] 2.2 Create `src/lib/constants.ts` — DEFAULT_TERRAIN (1000×800 cm), DEFAULT_GRID_SIZE (10), SNAP_THRESHOLD (10), ZOOM_MIN (0.1), ZOOM_MAX (5.0), ROOM_TYPE_PRESETS
- [ ] 2.3 Create `src/lib/utils.ts` — `snapToGrid()`, `clampPosition()`, `cmToDisplay()`, `formatDimensions()` per design interfaces
- [ ] 2.4 Verify: `npx tsc --noEmit` passes with zero errors
- [ ] 2.5 Commit: `feat(types): add plan types, constants, and coordinate utilities`

## Phase 3: Zustand Stores (PR 2)

- [ ] 3.1 Create `src/stores/canvas.store.ts` — zoom, panX, panY, gridVisible, gridSize, activeTool + actions: setZoom, setPan, toggleGrid, setGridSize, setActiveTool
- [ ] 3.2 Create `src/stores/rooms.store.ts` — rooms array, terrain (width/height) + actions: addRoom, removeRoom, moveRoom, updateTerrain
- [ ] 3.3 Verify: `npx tsc --noEmit` passes

## Phase 4: Store Tests (PR 2)

- [ ] 4.1 Init Vitest: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`, add `"test"` script to package.json
- [ ] 4.2 Create `src/__tests__/stores/canvas.store.test.ts` — test default state, setZoom within bounds, pan updates, grid toggle
- [ ] 4.3 Create `src/__tests__/stores/rooms.store.test.ts` — test addRoom generates id, moveRoom clamps to terrain, removeRoom, updateTerrain
- [ ] 4.4 Create `src/__tests__/lib/utils.test.ts` — test snapToGrid (105→110, 95→100), clampPosition (overflow clamps), cmToDisplay, formatDimensions
- [ ] 4.5 Verify: `npx vitest run` — all tests green
- [ ] 4.6 Commit: `feat(stores): add Zustand canvas and rooms stores with tests`

## Phase 5: Canvas Components (PR 3)

- [ ] 5.1 Create `src/components/canvas/GridLayer.tsx` — horizontal + vertical Konva Lines at gridSize intervals, light gray (#e0e0e0) 30% opacity
- [ ] 5.2 Create `src/components/canvas/TerrainLayer.tsx` — Konva Rect with light fill + border, Text labels for width (top) and height (left) in meters
- [ ] 5.3 Create `src/components/canvas/RoomLayer.tsx` — map rooms array to Group of Rect + Text, draggable with onDragMove bounds clamping + snap
- [ ] 5.4 Create `src/components/canvas/CoordinateDisplay.tsx` — fixed-position div showing cursor (x, y) in cm, updates on onMouseMove
- [ ] 5.5 Create `src/components/canvas/PlanCanvas.tsx` — Konva Stage composing GridLayer → TerrainLayer → RoomLayer, pan via onDragEnd on Stage, zoom via onWheel, CoordinateDisplay overlay

## Phase 6: UI Shell (PR 3)

- [ ] 6.1 Create `src/components/sidebar/TerrainSettings.tsx` — two Input fields for width/height (meters), onChange calls rooms.store.updateTerrain (×100 for cm)
- [ ] 6.2 Create `src/components/sidebar/RoomForm.tsx` — form with label Input, type Select (6 RoomType values), width/height Inputs, submit calls rooms.store.addRoom
- [ ] 6.3 Create `src/components/sidebar/RoomList.tsx` — map rooms array, show label + type badge per room, remove button per room
- [ ] 6.4 Create `src/components/sidebar/Sidebar.tsx` — 240px fixed-width sidebar composing TerrainSettings + RoomForm + RoomList with sections

## Phase 7: Integration + Polish (PR 3)

- [ ] 7.1 Update `src/app/layout.tsx` — root layout with Sidebar + main content area, Tailwind flex layout
- [ ] 7.2 Update `src/app/page.tsx` — main editor page composing Sidebar + PlanCanvas, full height
- [ ] 7.3 Create `src/__tests__/components/RoomForm.test.tsx` — test form validation (missing label shows error), successful submit adds room to store
- [ ] 7.4 Create `src/__tests__/components/TerrainSettings.test.tsx` — test input changes update store terrain
- [ ] 7.5 Verify: `npx tsc --noEmit && npx vitest run` — all pass
- [ ] 7.6 Manual smoke test: `npm run dev` — set terrain, add room, drag room, verify snap and bounds
- [ ] 7.7 Commit: `feat(canvas): add PlanCanvas, grid, terrain, rooms, and UI shell`

## Rules

- Tasks are ordered by dependency — Phase 1 before Phase 2, stores before components
- Each task is completable in one focused session
- PR 1 = Phase 1 + Phase 2 (scaffolding + types), PR 2 = Phase 3 + Phase 4 (stores + tests), PR 3 = Phase 5 + Phase 6 + Phase 7 (canvas + UI + integration)
- Each PR targets the previous PR branch (feature-branch-chain)
- Test tasks use concrete assertions, not vague "verify works"
