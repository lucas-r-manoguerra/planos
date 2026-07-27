# Planos — Comprehensive Improvement Plan

## Current State Analysis

### Architecture Summary

| Layer | Implementation | Notes |
|-------|---------------|-------|
| Framework | Next.js 15+ / React 19 | App Router, `"use client"` throughout |
| State | Zustand (3 stores) | `rooms.store.ts`, `canvas.store.ts`, `context-menu.store.ts` |
| Canvas | react-konva (Konva) | `Stage` → `Layer` → `GridLayer`, `TerrainLayer`, `RoomLayer` |
| Types | TypeScript | `src/types/plan.ts` — well-defined interfaces |
| Layout | Sidebar + Canvas | `flex h-screen`, sidebar 256px fixed, canvas flex-1 |

### What Exists Today

- **Terrain**: Dimensions (cm), color, background texture, front-side indicator
- **Rooms**: CRUD (add/remove/move/rename/color/duplicate/dimensions), type presets, grid snapping
- **Canvas**: Mouse-wheel zoom, stage-drag pan, visible grid, coordinate display
- **Context Menus**: Room (rename/color/duplicate/edit/delete), terrain (color/texture/front), empty (add room/center/grid)
- **Keyboard shortcuts**: Defined in constants (`KEYBOARD_SHORTCUTS`) but **not wired to any handler**

### Key Gaps Identified

| Category | Gap | Impact |
|----------|-----|--------|
| Undo/Redo | No history middleware — destructive actions are irreversible | High — users lose work constantly |
| Room Selection | No selected state — can't tell which room is active, no visual feedback | High — core UX failure |
| Resize | Only via `prompt()` dialogs — no drag handles on canvas | Medium — breaks spatial editing flow |
| Zoom Controls | Mouse wheel only — no buttons, no keyboard shortcuts wired | Medium — accessibility + discoverability |
| Grid Toggle | Context menu only — hidden from toolbar | Low — functional but undiscoverable |
| Measurement | No ruler/distance tool | Medium — construction plans need precise measurements |
| Multi-floor | Single floor only | High — architectural plans almost always have multiple floors |
| Walls | No wall entity | High — rooms without walls are incomplete plans |
| Doors/Windows | No opening entities | High — essential for real floor plans |
| Export | No PDF/PNG export | High — users need to share/print plans |
| Persistence | No save/load — all work lost on refresh | Critical — MVP blocker |
| Keyboard Shortcuts | Defined but not implemented | Medium — power user friction |
| Toolbar | No toolbar — actions scattered across sidebar/context menu | Medium — discoverability |
| Status Bar | `CoordinateDisplay` exists but no toolbar/status bar structure | Low — functional gap |
| Properties Panel | Editing via `prompt()` — no inline property editing | Medium — poor editing UX |

---

## A) Mejoras a funcionalidades existentes

### A1. Undo/Redo System
**Priority: ALTA**

**Current state**: Zustand stores have no history. Every `set()` call is terminal — no way to revert.

**Proposed approach**: Zustand `temporal` middleware (from `zundo` package) or manual history stack.

**Affected files**:
- `src/stores/rooms.store.ts` — wrap with temporal middleware
- `src/stores/canvas.store.ts` — optionally wrap (pan/zoom may not need undo)
- `src/lib/constants.ts` — `KEYBOARD_SHORTCUTS.undo/redo` already defined
- New: `src/hooks/useUndoRedo.ts` — hook to wire keyboard shortcuts

**Complexity**: Media. `zundo` is a drop-in middleware that auto-tracks state changes.

**Risks**:
- Memory usage if history grows unbounded (mitigate with `limit: 50`)
- Terrain changes + room changes in same history stack may feel disjointed

---

### A2. Zoom Controls (Buttons + Keyboard)
**Priority: ALTA**

**Current state**: `canvas.store.ts` has `setZoom()` and constants define `ZOOM_MIN/ZOOM_MAX`. Zoom is only via mouse wheel. `KEYBOARD_SHORTCUTS` defines `zoomIn`, `zoomOut`, `zoomReset` but they're not wired.

**Proposed approach**:
- Add floating zoom controls (buttons: +, −, fit-to-screen) positioned over the canvas
- Wire `Meta+=`, `Meta+-`, `Meta+0` keyboard shortcuts
- Add `zoomToFit()` method to canvas store (fits terrain in viewport)

**Affected files**:
- `src/stores/canvas.store.ts` — add `zoomToFit(terrain, canvasSize)`
- New: `src/components/canvas/ZoomControls.tsx` — floating button group
- `src/components/canvas/PlanCanvas.tsx` — render ZoomControls, add keyboard event listener

**Complexity**: Baja-Media. Infrastructure mostly exists.

---

### A3. Grid Toggle Button
**Priority: BAJA**

**Current state**: `toggleGrid()` exists in `canvas.store.ts`. Only accessible via right-click → "Ver grilla".

**Proposed approach**: Add a toggle button to the new toolbar (see C1).

**Affected files**:
- New: `src/components/toolbar/Toolbar.tsx` — add grid toggle icon button
- `src/components/canvas/GridLayer.tsx` — already reads `gridVisible` from store

**Complexity**: Baja. Pure UI addition.

---

### A4. Room Selection (Click to Select + Visual Feedback)
**Priority: ALTA**

**Current state**: No `selectedRoomId` in any store. Rooms are dragged but never "selected". No visual distinction between selected/unselected.

**Proposed approach**:
- Add `selectedRoomId: string | null` to `rooms.store.ts`
- Add `selectRoom(id)` and `deselectRoom()` actions
- In `RoomLayer.tsx`: render selected room with a blue dashed border + 4 corner handles
- Click on empty canvas deselects
- Selected room feeds into properties panel (see C3)

**Affected files**:
- `src/stores/rooms.store.ts` — add selection state + actions
- `src/components/canvas/RoomLayer.tsx` — render selection indicator + resize handles
- `src/types/plan.ts` — extend `RoomStore` interface

**Complexity**: Media. Core interaction pattern change.

**Note**: This is a prerequisite for A5 (resize handles) and C3 (properties panel).

---

### A5. Room Resize Handles
**Priority: MEDIA**

**Current state**: Resize only via context menu → "Editar dimensiones" → `prompt()` dialogs. No visual resize.

**Proposed approach**:
- When a room is selected (A4), show 8 resize handles (4 corners + 4 edge midpoints)
- Konva `Transformer` or custom handle shapes
- Drag handles update `width`/`height`/`x`/`y` in real-time with snapping

**Affected files**:
- `src/components/canvas/RoomLayer.tsx` — add `Transformer` or handle components
- `src/stores/rooms.store.ts` — `updateRoomDimensions` already exists
- `src/lib/utils.ts` — may need new snapping helpers for resize constraints

**Complexity**: Media-Alta. Konva `Transformer` handles most logic but requires careful integration with snapping and terrain bounds.

**Risks**:
- Edge handles can invert room dimensions if dragged past opposite edge
- Need minimum size constraints (match `RoomForm.tsx` `min={50}`)

---

### A6. Measurement Tool
**Priority: MEDIA**

**Current state**: No measurement capability. `formatDimensions()` exists in utils but only for display.

**Proposed approach**:
- New tool mode: `"measure"` in `canvas.store.ts` `activeTool`
- Click start point → click end point → display distance in cm and meters
- Render as a Konva `Line` with dimension label
- Optional: persistent measurement annotations

**Affected files**:
- `src/types/plan.ts` — extend `activeTool` union type
- `src/stores/canvas.store.ts` — add tool state
- New: `src/components/canvas/MeasureLayer.tsx`
- `src/components/canvas/PlanCanvas.tsx` — render MeasureLayer, handle measure clicks

**Complexity**: Media. Well-scoped feature.

---

### A7. Better Terrain Interaction
**Priority: BAJA**

**Current state**: Terrain is a static colored rectangle. Resize only via sidebar inputs.

**Proposed approach**:
- Add resize handles on terrain edges when no room is selected
- Show dimension labels dynamically during resize
- Snap terrain to grid

**Affected files**:
- `src/components/canvas/TerrainLayer.tsx` — add interactive handles
- `src/stores/rooms.store.ts` — `updateTerrain()` already exists

**Complexity**: Media. Similar to A5 but simpler (no room constraints).

---

## B) Nuevas funcionalidades

### B1. Multi-Floor Support
**Priority: ALTA**

**Current state**: Single flat model. No concept of floors/plantas.

**Proposed approach**:
- New type: `Floor { id, name, rooms: Room[], terrain: Terrain }`
- New store: `floors.store.ts` with `floors: Floor[]`, `activeFloorId: string`
- UI: Floor tabs above canvas (Planta Baja, Planta 1, etc.)
- Add/delete/rename floors
- Each floor has its own room list; terrain can be shared or independent

**Affected files**:
- New: `src/types/floor.ts`
- New: `src/stores/floors.store.ts`
- `src/stores/rooms.store.ts` — refactor to be per-floor
- New: `src/components/floor/FloorTabs.tsx`
- `src/app/page.tsx` — render FloorTabs
- `src/types/plan.ts` — extend `RoomStore` with floor awareness

**Complexity**: Alta. Fundamental data model change. Requires refactoring how rooms/terrain are stored.

**Risks**:
- Breaking change to store structure — all components consuming `useRoomsStore` need updates
- Save/load (B5) should be designed alongside this

**Recommendation**: Design the data model first, then implement incrementally. Consider making floors an optional layer on top of the existing model.

---

### B2. Wall Drawing
**Priority: MEDIA**

**Current state**: Rooms are standalone rectangles. No wall entities.

**Proposed approach**:
- New type: `Wall { id, points: Point[], thickness: number, material?: string }`
- Drawing tool: click-to-place wall segments
- Walls can be shared between rooms (room edges = walls)
- Default wall thickness: 12cm (Argentine standard)

**Affected files**:
- New: `src/types/wall.ts`
- New: `src/stores/walls.store.ts`
- New: `src/components/canvas/WallLayer.tsx`
- `src/types/plan.ts` — extend `activeTool` with `"wall"`

**Complexity**: Alta. Wall geometry, intersections, and room-wall relationships are complex.

**Recommendation**: Start with a simpler "room-based walls" model where walls are implied by room edges, then evolve to explicit wall drawing.

---

### B3. Door/Window Placement
**Priority: MEDIA**

**Current state**: No opening entities.

**Proposed approach**:
- New types: `Door { id, wallId, position, width, swing }`, `Window { id, wallId, position, width }`
- Drag from palette onto wall → snap to wall segment
- Visual representation: standard architectural symbols

**Affected files**:
- New: `src/types/opening.ts`
- New: `src/stores/openings.store.ts`
- New: `src/components/canvas/OpeningLayer.tsx`
- Depends on B2 (walls) for wall-reference

**Complexity**: Alta. Requires walls (B2) as prerequisite.

**Recommendation**: Defer until B2 is stable.

---

### B4. Export to PDF/PNG
**Priority: ALTA**

**Current state**: No export capability. All work is in-memory only.

**Proposed approach**:
- PNG: Use Konva's `stage.toDataURL()` — trivial with react-konva
- PDF: Use `jspdf` + canvas export, or `@react-pdf/renderer` for structured output
- Include: terrain, rooms with labels/dimensions, grid (optional), legend

**Affected files**:
- New: `src/lib/export.ts` — export utilities
- New: `src/components/toolbar/ExportButton.tsx`
- `src/components/canvas/PlanCanvas.tsx` — expose `stageRef` for export

**Complexity**: Baja-Media. PNG is nearly free. PDF requires layout logic.

**Quick win**: PNG export can be implemented in <1 hour using Konva's built-in API.

---

### B5. Save/Load Projects
**Priority: CRÍTICA (MVP Blocker)**

**Current state**: No persistence. All data lost on page refresh.

**Proposed approach**:
- Local storage: `localStorage.setItem('planos-project', JSON.stringify(state))` for MVP
- Later: Prisma/DB integration (project already has Prisma configured)
- Auto-save on every state change (debounced 2s)
- Manual save/load via toolbar buttons
- Project metadata: name, created date, last modified

**Affected files**:
- New: `src/lib/persistence.ts` — serialize/deserialize
- New: `src/hooks/useAutoSave.ts` — debounced auto-save
- `src/stores/rooms.store.ts` — add `loadState()` / `exportState()` actions
- `src/app/page.tsx` — initialize from saved state on mount

**Complexity**: Baja-Media. localStorage is straightforward. Prisma integration adds complexity.

**Note**: Should be implemented BEFORE multi-floor (B1) to ensure the save format accounts for floors.

---

### B6. Keyboard Shortcuts Panel
**Priority: BAJA**

**Current state**: `KEYBOARD_SHORTCUTS` defined in constants but not documented in UI.

**Proposed approach**:
- Modal/drawer showing all available shortcuts
- Triggered by `?` key or toolbar button
- Group by category: Navigation, Editing, View

**Affected files**:
- New: `src/components/keyboard/ShortcutsPanel.tsx`
- `src/components/canvas/PlanCanvas.tsx` — add `?` listener

**Complexity**: Baja. Pure UI component.

---

## C) UX/UI Mejoras

### C1. Toolbar Above Canvas
**Priority: ALTA**

**Current state**: No toolbar. Actions are in sidebar or context menus only.

**Proposed approach**: Horizontal toolbar between header and canvas with:
- Tool selection: Select, Pan, Measure
- Zoom controls (+, −, fit)
- Grid toggle
- Export button (PDF/PNG)
- Undo/Redo buttons
- Save button

**Affected files**:
- New: `src/components/toolbar/Toolbar.tsx`
- `src/app/page.tsx` — add toolbar to layout

**Complexity**: Baja-Media. Layout change + new component.

---

### C2. Status Bar Below Canvas
**Priority: BAJA**

**Current state**: `CoordinateDisplay` floats in bottom-left of canvas (position absolute).

**Proposed approach**: Formal status bar below canvas showing:
- Cursor position (cm) — already tracked
- Current zoom level
- Active tool name
- Room count
- Terrain dimensions

**Affected files**:
- New: `src/components/statusbar/StatusBar.tsx`
- `src/components/canvas/PlanCanvas.tsx` — render StatusBar, adjust layout
- `src/components/canvas/CoordinateDisplay.tsx` — move into StatusBar

**Complexity**: Baja. Reorganization of existing elements.

---

### C3. Room Properties Panel
**Priority: MEDIA**

**Current state**: Room editing via `prompt()` dialogs (rename, dimensions) and native color picker.

**Proposed approach**: When a room is selected (A4), show an inline properties panel (right sidebar or floating panel):
- Name (text input)
- Type (select)
- Dimensions (number inputs)
- Color (color picker)
- Opacity (slider)
- Position X/Y (number inputs)
- "Duplicate" and "Delete" buttons

**Affected files**:
- New: `src/components/sidebar/RoomProperties.tsx`
- `src/components/sidebar/Sidebar.tsx` — conditionally show RoomProperties when room selected
- `src/stores/rooms.store.ts` — `selectedRoomId` from A4

**Complexity**: Media. Dependent on A4 (room selection).

---

### C4. Drag and Drop Reordering
**Priority: BAJA**

**Current state**: `RoomList` renders rooms in array order. No reordering.

**Proposed approach**: Use `@dnd-kit/core` or HTML5 drag-and-drop to reorder rooms in the list. Reordering could affect render z-order on canvas.

**Affected files**:
- `src/components/sidebar/RoomList.tsx` — add drag handles
- `src/stores/rooms.store.ts` — add `reorderRooms(fromIndex, toIndex)` action

**Complexity**: Baja-Media. Well-solved problem with libraries.

---

### C5. Better Visual Feedback
**Priority: MEDIA**

**Current state**: Minimal visual feedback — rooms are flat colored rectangles, no hover effects, no selection glow.

**Proposed approach**:
- Hover effect: slight elevation/border highlight on room hover
- Selected state: blue dashed border (see A4)
- Drag preview: room shows ghost while dragging
- Terrain resize cursor: change cursor when hovering terrain edges
- Room overlap warning: visual indicator when rooms overlap

**Affected files**:
- `src/components/canvas/RoomLayer.tsx` — hover/select states
- `src/components/canvas/TerrainLayer.tsx` — cursor changes
- New: `src/components/canvas/OverlapWarning.tsx`

**Complexity**: Baja-Media. Mostly Konva property changes.

---

## D) Priorización — Implementation Roadmap

### Phase 1: Critical Foundation (Week 1-2)
**Goal**: Make the app usable — save work, select rooms, basic controls.

| # | Feature | Why First | Effort |
|---|---------|-----------|--------|
| B5 | Save/Load (localStorage) | **MVP blocker** — data lost on refresh | 2-3h |
| A4 | Room Selection | Prerequisite for A5, C3, C5 | 3-4h |
| A2 | Zoom Controls (buttons + keyboard) | Quick win, high discoverability | 2-3h |
| A3 | Grid Toggle in Toolbar | Quick win, part of toolbar foundation | 30min |
| C1 | Toolbar (basic: zoom, grid, save) | Houses A2 + A3, improves discoverability | 3-4h |

**Phase 1 total**: ~12-15h

### Phase 2: Power Features (Week 3-4)
**Goal**: Undo/Redo, resize, measurement — make editing feel professional.

| # | Feature | Why Now | Effort |
|---|---------|---------|--------|
| A1 | Undo/Redo | High impact, `zundo` is drop-in | 2-3h |
| A5 | Room Resize Handles | Natural extension of A4 | 4-6h |
| A6 | Measurement Tool | Construction plans need this | 3-4h |
| C3 | Room Properties Panel | Replaces `prompt()` dialogs | 3-4h |
| C5 | Better Visual Feedback | Polish for Phase 2 features | 2-3h |

**Phase 2 total**: ~14-20h

### Phase 3: Export & Polish (Week 5-6)
**Goal**: Share plans, professional UI.

| # | Feature | Why Now | Effort |
|---|---------|---------|--------|
| B4 | Export to PNG/PDF | Users need to share plans | 3-5h |
| C2 | Status Bar | Formalize layout | 2-3h |
| C4 | Drag & Drop Reordering | Nice-to-have polish | 2-3h |
| B6 | Keyboard Shortcuts Panel | Documentation for power users | 1-2h |
| A7 | Better Terrain Interaction | Polish | 3-4h |

**Phase 3 total**: ~11-17h

### Phase 4: Major Features (Week 7+)
**Goal**: Multi-floor, walls, doors — full architectural capability.

| # | Feature | Why Last | Effort |
|---|---------|----------|--------|
| B1 | Multi-Floor | Fundamental data model change, needs careful design | 15-20h |
| B2 | Wall Drawing | Depends on B1 data model | 15-20h |
| B3 | Door/Window Placement | Depends on B2 | 10-15h |

**Phase 4 total**: ~40-55h

---

## Implementation Dependencies

```
B5 (Save/Load) ─────────────────────────────────────┐
                                                      │
A4 (Room Selection) ──┬── A5 (Resize Handles)        │
                      ├── C3 (Properties Panel)      │
                      └── C5 (Visual Feedback)       │
                                                      │
A2 (Zoom Controls) ──┬── C1 (Toolbar) ──────────────┤
A3 (Grid Toggle) ────┘                               │
                                                      │
A1 (Undo/Redo) ─────────────────────────────────────┤
                                                      │
B4 (Export) ─────────────────────────────────────────┘
                                                      │
B1 (Multi-Floor) ── B2 (Walls) ── B3 (Doors/Windows)
```

## Recommendation Summary

**Start with B5 (Save/Load) + A4 (Room Selection) + C1 (Toolbar)**. These three changes:
1. Solve the critical data-loss problem
2. Establish the selection pattern that everything else builds on
3. Create the toolbar that houses all future controls

**Defer B1-B3** (multi-floor, walls, doors) until the single-floor experience is polished. These are architecturally complex and should be designed as a separate initiative after the core UX is solid.

**Quick wins to ship this week**: A2 (zoom buttons), A3 (grid toggle), B4 PNG export. All under 3 hours each.

---

*Generated from codebase analysis of `src/types/plan.ts`, `src/stores/*.ts`, `src/components/**/*.tsx`, `src/lib/constants.ts`*
*Date: 2026-07-27*
