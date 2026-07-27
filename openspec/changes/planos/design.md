# Design: Project Scaffolding + Base 2D Canvas Architecture

## Technical Approach

Greenfield Next.js 15 App Router project. The canvas is a react-konva `<Stage>` with separate `<Layer>` elements for grid, terrain, and rooms. All coordinates are integer centimeters; zoom/pan are display-only transforms managed by react-konva's built-in stage transform. Zustand manages two independent stores (canvas, rooms) — no cross-store subscriptions needed in this milestone. Prisma schema is created as a forward-looking blueprint; no persistence calls in this milestone. Docker Compose provides PostgreSQL for future use.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| Canvas library | react-konva vs Fabric.js vs HTML Canvas API | react-konva: React-native, declarative, good docs. Fabric.js: richer editing but imperative API. Raw Canvas: full control but no React integration. | react-konva — lowest friction with React, declarative shapes, built-in drag support |
| State management | Zustand vs Redux Toolkit vs Jotai | Zustand: minimal boilerplate, no providers, great TS support. RTK: overkill for this scope. Jotai: atomic but harder for array-of-objects. | Zustand — matches proposal, minimal ceremony, perfect for store-per-domain |
| Coordinate system | 1cm = 1px vs 1m = 1px vs custom scale | 1cm: integer-friendly, no float rounding. 1m: fewer pixels, less precision. Custom: flexible but complex. | 1cm integer units — display conversion at render time only |
| Grid rendering | react-konva Lines vs custom Canvas draw | Lines: declarative, React-native, but many DOM nodes. Custom draw: performant but breaks React model. | react-konva Lines — MVP has <50 grid lines at any zoom; optimize later if needed |
| Room drag bounds | On-drag constraint vs on-drag-end validation | On-drag: smooth but needs per-frame math. On-end: simpler but allows visual overshoot. | On-drag constraint — cleaner UX, prevent rooms leaving terrain visually |
| Store architecture | One store vs two stores | One: simpler subscriptions. Two: clean separation, no unnecessary re-renders. | Two stores — canvas and rooms are independent domains |
| Snap algorithm | Round-to-nearest vs threshold-based | Round-to-nearest: always snaps. Threshold: only snaps when close. | Round-to-nearest with configurable grid size — simpler, predictable |

## Data Flow

```
User Input (sidebar) ──→ Zustand Store ──→ React Re-render ──→ react-konva Stage
                                                                       │
User Interaction (canvas) ──→ Event Handler ──→ Store Action ──────────┘

Sidebar Form ──→ rooms.store.addRoom() ──→ rooms array update ──→ RoomRect re-renders
Canvas Drag  ──→ rooms.store.moveRoom() ──→ position update   ──→ RoomRect re-renders
Wheel Event  ──→ canvas.store.setZoom() ──→ stage.scaleX/Y   ──→ Stage re-renders
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Create | Next.js 15, react-konva, zustand, shadcn deps |
| `tsconfig.json` | Create | Strict mode, path aliases (`@/`) |
| `next.config.ts` | Create | Next.js config |
| `tailwind.config.ts` | Create | Tailwind + shadcn theme |
| `components.json` | Create | shadcn/ui configuration |
| `postcss.config.mjs` | Create | PostCSS for Tailwind |
| `docker-compose.yml` | Create | PostgreSQL 16 service |
| `.env.local` | Create | DATABASE_URL for Prisma |
| `.env.example` | Create | Template without secrets |
| `prisma/schema.prisma` | Create | Project, Floor, Room, Wall, Fixture models |
| `src/app/layout.tsx` | Create | Root layout with Sidebar + Tailwind |
| `src/app/page.tsx` | Create | Main editor page composing Sidebar + Canvas |
| `src/app/globals.css` | Create | Tailwind base + shadcn CSS variables |
| `src/components/sidebar/Sidebar.tsx` | Create | 240px sidebar with terrain settings + room form |
| `src/components/sidebar/TerrainSettings.tsx` | Create | Width/height inputs for terrain |
| `src/components/sidebar/RoomForm.tsx` | Create | Add room form (label, type, dimensions) |
| `src/components/sidebar/RoomList.tsx` | Create | List of placed rooms with type badges |
| `src/components/canvas/PlanCanvas.tsx` | Create | Stage + all layers, pan/zoom handlers |
| `src/components/canvas/GridLayer.tsx` | Create | Configurable grid lines |
| `src/components/canvas/TerrainLayer.tsx` | Create | Terrain rect + dimension labels |
| `src/components/canvas/RoomLayer.tsx` | Create | Room rectangles, draggable |
| `src/components/canvas/CoordinateDisplay.tsx` | Create | Cursor position in cm |
| `src/components/ui/button.tsx` | Create | shadcn Button |
| `src/components/ui/input.tsx` | Create | shadcn Input |
| `src/components/ui/select.tsx` | Create | shadcn Select |
| `src/components/ui/label.tsx` | Create | shadcn Label |
| `src/stores/canvas.store.ts` | Create | Zoom, pan, grid, active tool state |
| `src/stores/rooms.store.ts` | Create | Rooms array, terrain dimensions |
| `src/types/plan.ts` | Create | RoomType enum, coordinate types, store interfaces |
| `src/lib/constants.ts` | Create | Grid defaults, snap threshold, canvas bounds |
| `src/lib/utils.ts` | Create | cmToDisplay, snapToGrid, formatDimensions |

## Interfaces / Contracts

```typescript
// src/types/plan.ts
enum RoomType {
  DORMITORIO = "Dormitorio",
  COCINA = "Cocina",
  BAÑO = "Baño",
  ESTAR_COMEDOR = "Estar-Comedor",
  LAVADERO = "Lavadero",
  PASILLO = "Pasillo",
}

interface Room {
  id: string;           // crypto.randomUUID()
  label: string;
  type: RoomType;
  x: number;            // cm from terrain origin
  y: number;
  width: number;        // cm
  height: number;       // cm
}

interface Terrain {
  width: number;        // cm
  height: number;       // cm
}

interface CanvasState {
  zoom: number;         // 0.1–5.0
  panX: number;         // cm offset
  panY: number;
  gridVisible: boolean;
  gridSize: number;     // cm between grid lines
  activeTool: "select" | "pan";
}

interface RoomStore {
  rooms: Room[];
  terrain: Terrain;
  addRoom: (room: Omit<Room, "id">) => void;
  removeRoom: (id: string) => void;
  moveRoom: (id: string, x: number, y: number) => void;
  updateTerrain: (width: number, height: number) => void;
}

// Grid snapping: Math.round(value / gridSize) * gridSize
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

// Room drag bounds: clamp position to [0, terrain - room]
function clampPosition(x: number, y: number, room: Room, terrain: Terrain): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(x, terrain.width - room.width)),
    y: Math.max(0, Math.min(y, terrain.height - room.height)),
  };
}
```

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Project {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  floors    Floor[]
}

model Floor {
  id        String  @id @default(uuid())
  projectId String
  project   Project @relation(fields: [projectId], references: [id])
  level     Int     @default(0)
  order     Int     @default(0)
  rooms     Room[]
  walls     Wall[]
}

model Room {
  id      String  @id @default(uuid())
  floorId String
  floor   Floor   @relation(fields: [floorId], references: [id])
  label   String
  type    String  // RoomType enum stored as string
  x       Int     // cm
  y       Int     // cm
  width   Int     // cm
  height  Int     // cm
  fixtures Fixture[]
}

model Wall {
  id      String  @id @default(uuid())
  floorId String
  floor   Floor   @relation(fields: [floorId], references: [id])
  startX  Int     // cm
  startY  Int     // cm
  endX    Int     // cm
  endY    Int     // cm
}

model Fixture {
  id      String  @id @default(uuid())
  roomId  String
  room    Room    @relation(fields: [roomId], references: [id])
  type    String
  x       Int     // cm
  y       Int     // cm
  width   Int     // cm
  height  Int     // cm
}
```

## Key Decisions

**1. react-konva over raw Canvas** — Declarative React components map 1:1 to shapes. Drag-and-drop is built in. Performance is sufficient for MVP (<50 rooms). If it becomes a bottleneck at scale, only GridLayer needs optimization (custom draw).

**2. Two Zustand stores, not one** — Canvas state (zoom, pan, grid) changes on every mouse move. Room state changes only on add/move. Separate stores prevent rooms re-rendering on every pan event. No cross-store subscriptions needed yet.

**3. 1cm integer coordinate system** — Avoids floating-point rounding entirely. `1200 cm = 12 m`. Display conversion is `cmToDisplay = (cm) => cm / 100 + " m"`. Grid snapping operates on integers.

**4. On-drag bounds clamping** — Room rectangles cannot leave the terrain. `clampPosition()` runs on every `onDragMove` event. Smooth UX, no visual overshoot.

**5. Prisma schema as blueprint only** — Models are defined and `prisma generate` runs, but no `prisma.$queryRaw` or client usage in this milestone. This prevents schema drift when persistence is added in a later milestone.

**6. shadcn/ui over custom components** — Accessible, composable, copies into project (no runtime dependency). Provides Input, Button, Select, Label for the sidebar forms immediately.

## Canvas Implementation

```
PlanCanvas (Stage)
├── GridLayer (Layer)        ← Lines, behind everything
│   └── Horizontal + Vertical lines at gridSize intervals
├── TerrainLayer (Layer)     ← Rect + dimension labels
│   ├── Rect (terrain bounds, light fill)
│   ├── Text (width label, top edge)
│   └── Text (height label, left edge)
└── RoomLayer (Layer)        ← Draggable room rects
    └── RoomRect[] (Group per room)
        ├── Rect (room bounds, colored fill)
        └── Text (label + dimensions)
```

Pan/zoom uses `Stage.x`, `Stage.y`, `Stage.scaleX/Y` directly — no custom transform math. Mouse wheel events call `canvas.store.setZoom()`, drag events update `panX/panY`.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `snapToGrid`, `clampPosition`, store actions | Vitest — pure functions and store mutations |
| Integration | Room add → canvas render → drag → bounds check | Vitest + render with `@testing-library/react` |
| Component | Sidebar form validation, room list rendering | React Testing Library, mock stores |
| E2E | Full flow: set terrain → add room → drag → snap | Playwright (deferred to later milestone) |

## Migration / Rollout

No migration required. Greenfield project. `docker compose up -d` provisions PostgreSQL. `npx prisma db push` syncs schema when persistence is needed.

## Open Questions

- [ ] Default terrain dimensions: proposal says 10m×8m, spec says configurable — **resolve: 1000×800 cm as default, overridable via inputs**
- [ ] Room default position on add: center of terrain vs top-left — **resolve: center of terrain** (better UX for first room)
- [ ] Grid color/opacity at different zoom levels — **resolve: light gray (#e0e0e0) at 30% opacity, constant**
