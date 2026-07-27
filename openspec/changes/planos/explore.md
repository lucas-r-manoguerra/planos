# Exploration: Planos — 2D Construction Plan Visualizer

## Current State

Greenfield project. No code exists yet. The repository contains:
- `openspec/config.yaml` — SDD configuration (openspec artifact store, auto execution mode)
- `FEATURE_SUGGESTIONS.md` — Feature wishlist covering 2D editor, multi-floor, openings, structural, normativa, UX, and advanced features
- `.atl/skill-registry.md` — Skill registry cache

The entire application needs to be built from scratch.

## Comparable Open-Source Tools

### Direct Competitors (Browser-Based Floor Plan Editors)

| Project | Stack | Notes |
|---------|-------|-------|
| **floor-maker** (ahmethakanbesel) | React 19 + react-konva + Zustand + Tailwind + Vite/Bun | Room drawing, 50+ object library, snap-to-grid, PDF export, undo/redo. Closest reference implementation. |
| **2d-moodboard-floor-planner** (iliyavalchanov) | Next.js + react-konva + Zustand + Immer + Tailwind 4 | Wall drawing with click-to-place, drag nodes to reshape, doors/windows snap to walls, pan/zoom. |
| **arcada-planner** (fedepaj) | Browser-based, 80+ items catalog, multi-floor, print | Wall drawing, room furnishing, multi-floor management. |
| **OpenPlan3D** (theLodgeBots) | Browser, 2D + 3D, 140+ models, DXF/SVG/PDF export | Full floor plan editor with 3D preview. Uses Three.js for 3D. |
| **Pascal Editor** (pascalorg) | React + Three.js + WebGPU + Zustand + Next.js | 3D architecture tool, wall drawing, furniture library. |

### Key Takeaway

The **react-konva + Zustand + Tailwind** stack is the de facto standard for browser-based floor plan editors. Both `floor-maker` and `2d-moodboard-floor-planner` validate this exact stack for the exact use case.

## Canvas Library Analysis

### react-konva (RECOMMENDED)

- **~400K weekly npm downloads**
- Declarative React bindings — scene graph as React components
- Built-in drag-and-drop, hit detection, event system, groups, layers, transformers
- State can live in React/Zustand — derive Konva tree from state on render
- Undo/redo integrates naturally with Zustand middleware (no canvas-specific history needed)
- TypeScript support (v19.x)
- Mobile touch support
- Konva.js has official floor plan demos (Interactive Building Map)

### fabric.js

- **~500K weekly downloads**
- Stronger for design editors (Canva-like), image manipulation, SVG import/export
- Imperative API — no React bindings, requires wrapper patterns
- Better built-in selection/resize/rotate handles
- `canvas.toJSON()` / `loadFromJSON()` for serialization
- Manual history stack management for undo/redo

### SVG (d3.js / raw)

- Vector-based, DOM-accessible, good for accessibility
- Performance degrades with hundreds of elements
- No built-in drag-and-drop or transform handles
- Better for static diagrams, not interactive editors

### Verdict

**react-konva** wins for this project because:
1. Declarative React integration matches Next.js/React architecture
2. Zustand state management integrates cleanly (store drives canvas)
3. Multiple proven floor plan implementations use this exact stack
4. Built-in transform handles and drag-and-drop reduce custom code
5. Konva scene can be serialized to JSON for Prisma persistence

## State Management for Spatial Data

### Zustand Store Architecture (from reference implementations)

The proven pattern separates concerns into domain-specific stores:

```
stores/
├── canvas.store.ts    — zoom, pan, active tool, grid settings
├── walls.store.ts     — wall segments [{id, points[], type, thickness}]
├── rooms.store.ts     — room polygons [{id, vertices[], label, floorId}]
├── fixtures.store.ts  — doors, windows, columns [{id, type, wallId, position, dims}]
├── selection.store.ts — selected elements, multi-select state
└── project.store.ts   — floors, metadata, normativa profile
```

### Key Patterns

- **Walls as line segments**: Store wall endpoints `{x, y}` pairs, not rectangles. Render with configurable thickness.
- **Rooms as polygons**: Vertex arrays `{x, y}[]`. Area/perimeter computed from vertices.
- **Fixtures attached to walls**: Doors/windows reference a `wallId` and a `position` (distance from wall start).
- **Grid snapping**: Configurable snap threshold (default 10cm = 100 units at 1 unit = 1cm scale).
- **Measurement overlay**: Real-time dimension labels rendered alongside walls during placement/drag.

### Coordinate System

- **Internal unit**: centimeters (1 unit = 1 cm). This avoids floating-point issues with mm and keeps numbers integer-friendly.
- **Display**: configurable (cm, m, ft). Display conversion at render time only.
- **Scale**: 1px = 1cm at zoom 1.0. Zoom multiplies this factor.

## Prisma Schema for Geometric/Room Data

### Challenge

Prisma does **NOT** support PostGIS geometry types (point, polygon, line). This is a known open issue (prisma/prisma#1798, #25768 — closed as not_planned).

### Approach: JSON Columns for Geometry

Store geometric data as JSON in Prisma `Json` fields. PostgreSQL's JSONB supports indexing and querying.

```prisma
model Project {
  id            String   @id @default(cuid())
  name          String
  terrainWidth  Int      // cm
  terrainHeight Int      // cm
  normativa     String   // "IRAM" | "CIRSOC" | "EntreRios" | "Gualeguay"
  floors        Floor[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Floor {
  id        String  @id @default(cuid())
  projectId String
  project   Project @relation(fields: [projectId], references: [id])
  level     Int     // 0 = ground, 1 = first floor, etc.
  name      String  // "Planta Baja", "Primer Piso"
  rooms     Room[]
  walls     Wall[]
  fixtures  Fixture[]
}

model Room {
  id        String  @id @default(cuid())
  floorId   String
  floor     Floor   @relation(fields: [floorId], references: [id])
  label     String  // "Dormitorio 1", "Cocina", "Baño"
  roomType  String  // enum: BEDROOM, KITCHEN, BATH, LIVING, etc.
  vertices  Json    // [{x: number, y: number}] — polygon vertices in cm
  area      Float   // computed, in m²
  perimeter Float   // computed, in m
}

model Wall {
  id        String  @id @default(cuid())
  floorId   String
  floor     Floor   @relation(fields: [floorId], references: [id])
  start     Json    // {x: number, y: number}
  end       Json    // {x: number, y: number}
  thickness Int     // cm (12, 15, 20, 25, 30)
  wallType  String  // "EXTERIOR" | "INTERIOR" | "PARTITION"
  material  String  // "LADRILLO" | "HORMIGON" | "YESO" | "MADERA"
}

model Fixture {
  id        String  @id @default(cuid())
  floorId   String
  floor     Floor   @relation(fields: [floorId], references: [id])
  wallId    String?
  wall      Wall?   @relation(fields: [wallId], references: [id])
  type      String  // "DOOR" | "WINDOW" | "COLUMN" | "BEAM"
  position  Json    // {x: number, y: number} or {wallId, distance}
  width     Int     // cm
  height    Int     // cm
  metadata  Json?   // type-specific data (e.g., window sill height, column cross-section)
}
```

### Alternative: Raw SQL Migrations for PostGIS

If spatial queries become needed (e.g., "find all rooms within X meters"), use Prisma's `Unsupported("geometry(...)")` type + raw SQL for writes. But for an interactive editor, JSON is simpler and sufficient — the canvas handles all spatial logic client-side.

## Argentine Construction Normativa

### IRAM / CIRSOC / Entre Rios / Gualeguay Requirements

#### Minimum Room Sizes (Programa Casa Propia – Construir Futuro, Resolución 5/2022)

| Room | Min Area (m²) | Min Side (m) | Notes |
|------|---------------|--------------|-------|
| 1st/2nd Bedroom | 10.50 | 3.00 | Placard included. 2.70m if lot < 8m front |
| 3rd Bedroom | 9.00 | 2.50 | Placard included |
| Bathroom | 4.00 | 1.60 | 1.50m if lot < 8m front |
| Living-Dining (Estar-Comedor) | 18.00 | 3.00 | 2.90m (lot 8m), 2.80m (lot < 8m) |
| Integrated Living-Dining-Kitchen | 20.00 | 3.00 | Same side constraints |
| Kitchen (Cocina) | 4.50 | 1.50 | — |
| Kitchen-Laundry (Cocina-Lavadero) | 6.00 | 1.50 | — |
| Laundry (Lavadero) | 2.25 | 1.50 | — |
| Interior Hallway (Pasillo) | — | 1.00 min width | — |

#### Door Dimensions

| Type | Min Width (m) |
|------|---------------|
| Entrance / Patio doors | 0.90 |
| Interior doors | 0.80 |

#### Staircase Dimensions

| Type | Min Width (m) |
|------|---------------|
| Interior staircase | 0.80 |
| Exterior staircase (PB + 2 floors) | 1.30 |

#### Wall Thicknesses (Standard Argentine Construction)

| Wall Type | Thickness (cm) | Notes |
|-----------|----------------|-------|
| Exterior load-bearing (ladrillo macizo) | 25–30 | One brick + plaster (1.5–2cm per side) |
| Interior load-bearing | 20–25 | Half brick + plaster |
| Interior partition (tabique) | 10–12 | Ladrillo hueco delgado or yeso |
| Exterior non-load-bearing | 15–20 | Ladrillo hueco |
| Plaster layers | 1.5–2.0 | Per side (enlucido) |

#### Structural Spans (CIRSOC 201 — Hormigón Armado)

| Element | Typical Span (m) | Notes |
|---------|-------------------|-------|
| Slab (losa) | 3.00–5.00 | Residential, depends on thickness |
| Beam | 4.00–7.00 | Reinforced concrete |
| Column grid | 3.00–6.00 | Typical residential spacing |

#### Regional Notes (Entre Ríos / Gualeguay)

- Entre Ríos adopted CIRSOC reglamentos via Resolución 734 (December 2014)
- Gualeguay has specific municipal building code (Reglamento de Construcción)
- Seismic zone: low-to-moderate (CIRSOC 101 applies)
- Bioclimatic regions 5–6: may add 2m² cold hall (hall frío)
- Minimum lot size: 150m², 7.50m frontage (if local code allows)

### Normativa Data Model

Store normativa as a configurable profile in the application:

```typescript
type NormativaProfile = {
  id: string;
  name: string; // "IRAM", "CIRSOC", "EntreRios", "Gualeguay"
  minRoomSizes: Record<RoomType, { minArea: number; minSide: number }>;
  doorWidths: { entrance: number; interior: number };
  wallThicknesses: Record<WallType, { min: number; max: number; default: number }>;
  structuralLimits: { maxSlabSpan: number; maxBeamSpan: number; columnGridRange: [number, number] };
};
```

## Approaches

### 1. **react-konva + Zustand + Prisma JSON** (RECOMMENDED)

- Canvas: react-konva with layered architecture (grid layer, walls layer, rooms layer, fixtures layer, overlay layer)
- State: Zustand stores per domain (canvas, walls, rooms, fixtures, selection, project)
- Persistence: Prisma with JSON columns for geometry, relational for hierarchy
- Normativa: TypeScript config objects with validation rules
- Export: Konva `toJSON()` for save, canvas `toDataURL()` for PNG, custom PDF generation

**Pros**: Proven stack (multiple open-source implementations), declarative React integration, clean undo/redo, good performance, TypeScript-first
**Cons**: Canvas-based (no native DOM accessibility), no built-in 3D
**Effort**: Medium

### 2. **fabric.js + custom React wrapper + Prisma JSON**

- Canvas: fabric.js with imperative wrapper
- All other choices same as Approach 1

**Pros**: Stronger object manipulation, SVG import/export, better for design-heavy UI
**Cons**: Imperative API fights React's declarative model, no official React bindings, undo/redo requires manual state sync
**Effort**: Medium-High

### 3. **SVG-based (d3.js or raw SVG) + React**

- Rendering: SVG elements in React (no canvas)
- State: same Zustand pattern
- Persistence: same Prisma JSON

**Pros**: DOM-accessible (screen readers, CSS styling), vector-perfect at any zoom, easier click/hover events
**Cons**: Performance degrades with complex plans (hundreds of SVG elements), no built-in transform handles, more custom code for interactions
**Effort**: High

### 4. **Hybrid: Konva for editor + SVG for exports**

- Editor uses react-konva
- Exports generate SVG for print/PDF
- Best of both worlds

**Pros**: Fast interactive editing + high-quality vector exports
**Cons**: Maintaining two rendering paths increases complexity
**Effort**: High

## Recommendation

**Approach 1: react-konva + Zustand + Prisma JSON**

This is the clear winner because:
1. **Proven**: floor-maker and 2d-moodboard-floor-planner validate the exact stack for the exact use case
2. **React-native**: react-konva's declarative API integrates with Next.js App Router without wrapper hacks
3. **State-first**: Zustand stores drive the canvas — Konva is a pure render layer, making undo/redo trivial
4. **Sufficient geometry**: For a 2D plan editor, JSON-stored coordinate arrays are simpler and faster than PostGIS. Spatial queries (room adjacency, structural validation) can be computed in TypeScript.
5. **Prisma-compatible**: No need for raw SQL hacks or PostGIS extension

### Implementation Phases (Suggested)

1. **MVP Canvas** — Grid, terrain outline, wall drawing with snap, room creation, measurement overlay
2. **Fixtures** — Door/window placement on walls, column layout
3. **Multi-floor** — Floor management, vertical structure visibility
4. **Normativa Engine** — Room size validation, wall thickness rules, structural span checks
5. **Persistence** — Prisma schema, save/load projects, user accounts (NextAuth)
6. **Export** — PDF generation, PNG export, shareable links
7. **Advanced** — 3D preview, cost estimation, regulatory compliance dashboard

## Risks

- **Canvas accessibility**: Canvas elements are opaque to screen readers. Mitigation: maintain parallel ARIA live region describing canvas contents (as recommended in Konva accessibility docs).
- **Performance at scale**: Complex plans with many rooms/walls could slow rendering. Mitigation: Konva layer separation, shape caching, and virtual rendering for large plans.
- **Prisma JSON query limitations**: JSONB queries are slower than typed columns for complex spatial queries. Mitigation: acceptable for this use case — spatial logic lives in the canvas, not the database.
- **Normativa complexity**: Argentine construction codes are extensive and vary by municipality. Mitigation: start with Entre Ríos/Gualeguay defaults, make profiles configurable and extensible.
- **No existing SDD artifacts**: This is greenfield — the first change should establish the base architecture and project scaffolding.

## Ready for Proposal

Yes. The exploration is complete with a clear recommended approach and stack. The orchestrator should propose the first change as **project scaffolding + base canvas architecture** (MVP Canvas phase).
