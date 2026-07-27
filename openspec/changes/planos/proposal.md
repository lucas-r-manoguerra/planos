# Proposal: Project Scaffolding + Base 2D Canvas Architecture

## Intent

Build the foundational project structure and a working 2D canvas where users can define terrain dimensions and place rectangular rooms. This is the first milestone for a construction plan visualizer targeting Argentine normativa (Entre Ríos / Gualeguay). Without this base, no subsequent feature (fixtures, multi-floor, normativa engine) can proceed.

## Scope

### In Scope
- Next.js 15 App Router project with TypeScript strict mode
- Docker Compose with PostgreSQL + Prisma migrations
- shadcn/ui component library + Tailwind CSS
- Zustand stores (canvas, rooms)
- react-konva canvas with configurable grid
- Terrain rectangle definition (width/height in cm, rendered on canvas)
- Room placement: add room by name + dimensions, drag to position on terrain
- Basic UI shell: sidebar (tools panel) + main canvas area
- Room type enum with Argentine defaults (Dormitorio, Cocina, Baño, Estar-Comedor)

### Out of Scope
- Wall drawing (next change: fixtures + walls)
- Door/window placement
- Multi-floor support
- Normativa validation engine
- Persistence to database (Prisma schema created, but save/load deferred)
- Authentication (NextAuth deferred)
- Undo/redo (Zustand middleware added later)
- PDF/PNG export

## Capabilities

### New Capabilities
- `canvas-grid`: Configurable grid overlay on react-konva canvas with pan/zoom
- `terrain-definition`: Draw and resize terrain rectangle with dimension labels
- `room-placement`: Add rectangular rooms with name/type/dimensions, drag to position
- `ui-shell`: Sidebar tools panel + main canvas layout

### Modified Capabilities
None — greenfield project.

## Approach

**Stack**: Next.js 15 (App Router) + react-konva + Zustand + shadcn/ui + Tailwind + Prisma (PostgreSQL via Docker)

**Coordinate system**: 1 unit = 1 cm (integer-friendly, avoids floating-point). Display conversion at render time only.

**Architecture**:
```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with sidebar
│   └── page.tsx            # Main editor page
├── components/
│   ├── canvas/             # react-konva components
│   │   ├── PlanCanvas.tsx  # Stage + Layer composition
│   │   ├── GridLayer.tsx   # Configurable grid
│   │   ├── TerrainRect.tsx # Terrain boundary
│   │   └── RoomRect.tsx    # Draggable room rectangle
│   └── ui/                 # shadcn/ui components
├── stores/
│   ├── canvas.store.ts     # Zoom, pan, active tool, grid settings
│   └── rooms.store.ts      # Room list [{id, label, type, x, y, width, height}]
├── types/
│   └── plan.ts             # RoomType enum, coordinate types
└── lib/
    └── constants.ts        # Grid defaults, snap threshold, room presets
```

**Data model** (in-memory for MVP, Prisma schema as blueprint):
- Room: `{ id, label, type: RoomType, x: number, y: number, width: number, height: number }`
- All dimensions in cm. Canvas renders at 1px = 1cm at zoom 1.0.

**Terrain**: Single rectangle defined by width/height. Canvas viewport clips to terrain bounds. Grid aligns to terrain.

**Room types** (Argentine defaults):
```typescript
enum RoomType {
  DORMITORIO = "Dormitorio",
  COCINA = "Cocina",
  BAÑO = "Baño",
  ESTAR_COMEDOR = "Estar-Comedor",
  LAVADERO = "Lavadero",
  PASILLO = "Pasillo",
}
```

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `openspec/config.yaml` | Modified | Artifact store already configured |
| `package.json` | New | Next.js + all dependencies |
| `docker-compose.yml` | New | PostgreSQL service |
| `prisma/schema.prisma` | New | Project/Floor/Room/Wall/Fixture models |
| `src/` | New | Entire application source |
| `tailwind.config.ts` | New | Tailwind + shadcn configuration |
| `components.json` | New | shadcn/ui config |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| react-konva performance with many rooms | Low | MVP has <50 rooms; layer separation added if needed |
| Prisma schema drift from actual usage | Medium | Schema created as blueprint, not used for persistence yet |
| Coordinate rounding with zoom | Low | Integer cm units; zoom is display-only multiplication |
| Docker overhead for dev | Low | Standard Postgres image, ~200MB |

## Rollback Plan

- Delete `src/`, `docker-compose.yml`, `prisma/`, `package.json`
- Revert to bare `openspec/` + `FEATURE_SUGGESTIONS.md` state
- No data loss since no persistence is active

## Dependencies

- Node.js 20+
- Docker + Docker Compose
- PostgreSQL (via Docker)

## Success Criteria

- [ ] `docker compose up` starts PostgreSQL
- [ ] `npm run dev` starts Next.js dev server
- [ ] Canvas renders with visible grid on terrain rectangle
- [ ] User can set terrain width/height and see it resize
- [ ] User can add a room from sidebar (name + type + dimensions)
- [ ] Room appears on canvas at default position
- [ ] Room is draggable within terrain bounds
- [ ] Room dimensions displayed as labels on canvas
- [ ] No TypeScript errors (`tsc --noEmit` passes)
