/**
 * Atajos de teclado del editor (spec fixtures-2, a11y-1, a11y-2).
 *
 * - Ctrl/Cmd+Z: deshacer, Ctrl/Cmd+Shift+Z: rehacer.
 * - Delete/Backspace: elimina la selección — habitación primero (cascade
 *   de aberturas), si no, fixture. No-op cuando el foco está en un campo
 *   editable (input, textarea, select, contentEditable).
 * - Flechas: mueven la selección 10cm (room-first; fixture si el id no es
 *   una habitación). Shift+Flechas: redimensiona "creciendo hacia la
 *   flecha" (mínimo 10cm). Cada pulsación es un paso de undo.
 * - Ctrl/Cmd+= / Ctrl/Cmd+-: zoom in/out (factor 1.2). Ctrl/Cmd+0: reset.
 *
 * La selección se resuelve room-first (decisión de diseño): si el id
 * seleccionado pertenece a una habitación de la planta activa se opera la
 * habitación; si no, se intenta como fixture.
 */

"use client";

import { useEffect } from "react";
import { useHistoryStore } from "@/stores/history.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useWallsStore } from "@/stores/walls.store";
import { useStructuralStore } from "@/stores/structural.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useCanvasStore } from "@/stores/canvas.store";
import type { HistoryEntry } from "@/stores/history.store";
import type { Room, Fixture } from "@/types/plan";

/** Restaura un entry del historial en los stores (deshacer/rehacer) */
export function applyHistoryEntry(entry: HistoryEntry): void {
  useFloorsStore.setState({
    floors: entry.floors,
    activeFloorId: entry.activeFloorId,
  });
  if (entry.terrain) {
    useTerrainStore.setState({ terrain: entry.terrain });
  }
  if (entry.fixtures) {
    useFixtureStore.setState({ fixtures: entry.fixtures });
  }
  if (entry.walls) {
    useWallsStore.setState({ walls: entry.walls });
  }
  if (entry.structural) {
    useStructuralStore.getState().replaceStructural(entry.structural);
  }
}

/** true si el foco está en un campo editable (no robar atajos) */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

/** Paso de movimiento/redimensionado por flecha, en centímetros */
const NAV_STEP = 10;

/** Dimensión mínima al redimensionar con teclado, en centímetros */
const MIN_DIMENSION = 10;

/** Factor de zoom por pulsación de Ctrl/Cmd+= o Ctrl/Cmd+- */
const ZOOM_FACTOR = 1.2;

/** Delta por dirección de flecha (unitario, se multiplica por NAV_STEP) */
const DIRECTION_DELTA: Record<string, { dx: number; dy: number }> = {
  ArrowRight: { dx: 1, dy: 0 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowUp: { dx: 0, dy: -1 },
};

function moveRoomBy(room: Room, dx: number, dy: number): void {
  const terrain = useTerrainStore.getState().terrain;
  const nx = room.x + dx;
  const ny = room.y + dy;

  // Limitar dentro del terreno
  if (nx < 0 || nx + room.width > terrain.width) return;
  if (ny < 0 || ny + room.height > terrain.height) return;
  if (nx === room.x && ny === room.y) return;

  useFloorsStore.getState().moveRoom(room.id, nx, ny);
}

function resizeRoomBy(room: Room, dx: number, dy: number): void {
  const terrain = useTerrainStore.getState().terrain;

  let x = room.x;
  let y = room.y;
  let width = room.width;
  let height = room.height;

  if (dx > 0) {
    width += NAV_STEP;
    if (x + width > terrain.width) return;
  } else if (dx < 0) {
    // Crecer hacia la izquierda: el borde derecho queda fijo
    x -= NAV_STEP;
    width += NAV_STEP;
    if (x < 0) return;
  }

  if (dy > 0) {
    height += NAV_STEP;
    if (y + height > terrain.height) return;
  } else if (dy < 0) {
    // Crecer hacia arriba: el borde inferior queda fijo
    y -= NAV_STEP;
    height += NAV_STEP;
    if (y < 0) return;
  }

  if (width < MIN_DIMENSION || height < MIN_DIMENSION) return;
  if (x === room.x && y === room.y && width === room.width && height === room.height) return;

  // Acción combinada: un solo paso de undo por pulsación
  useFloorsStore
    .getState()
    .updateRoomGeometry(room.id, x, y, width, height);
}

function moveFixtureBy(fixture: Fixture, dx: number, dy: number): void {
  const nx = Math.max(0, fixture.x + dx);
  const ny = Math.max(0, fixture.y + dy);
  if (nx === fixture.x && ny === fixture.y) return;

  useFixtureStore.getState().updateFixture(fixture.id, { x: nx, y: ny });
}

/** Maneja flechas: mover selección, Shift+ flecha redimensiona habitación */
function handleArrowKey(e: KeyboardEvent): void {
  const delta = DIRECTION_DELTA[e.key];
  if (!delta) return;

  const dx = delta.dx * NAV_STEP;
  const dy = delta.dy * NAV_STEP;

  const { selectedId } = useSelectionStore.getState();
  if (!selectedId) return;

  const { floors, activeFloorId } = useFloorsStore.getState();
  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const room = activeFloor?.rooms.find((r) => r.id === selectedId);

  if (room) {
    if (e.shiftKey) {
      resizeRoomBy(room, dx, dy);
    } else {
      moveRoomBy(room, dx, dy);
    }
    return;
  }

  const fixture = useFixtureStore.getState().fixtures.find(
    (f) => f.id === selectedId
  );
  if (fixture) {
    moveFixtureBy(fixture, dx, dy);
  }
}

/** Registra los atajos de teclado del editor */
export function useEditorShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        const history = useHistoryStore.getState();
        const restored = e.shiftKey ? history.redo() : history.undo();
        if (restored) applyHistoryEntry(restored);
        return;
      }

      // Zoom del canvas: Ctrl/Cmd + =/+, -/_, 0 (no en campos editables)
      if (e.ctrlKey || e.metaKey) {
        const key = e.key;
        const zoomAction =
          key === "=" || key === "+"
            ? ZOOM_FACTOR
            : key === "-" || key === "_"
              ? 1 / ZOOM_FACTOR
              : key === "0"
                ? 1
                : null;
        if (zoomAction !== null) {
          if (isEditableTarget(e.target)) return;
          e.preventDefault();
          const { zoom, setZoom } = useCanvasStore.getState();
          setZoom(zoomAction === 1 ? 1 : zoom * zoomAction);
          return;
        }
      }

      // Flechas: mover/redimensionar selección (no en campos editables)
      if (e.key.startsWith("Arrow")) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        handleArrowKey(e);
        return;
      }

      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (isEditableTarget(e.target)) return;

      e.preventDefault();
      const { selectedId, clearSelection } = useSelectionStore.getState();
      if (!selectedId) return;

      const { floors, activeFloorId } = useFloorsStore.getState();
      const activeFloor = floors.find((f) => f.id === activeFloorId);
      const isRoom = activeFloor?.rooms.some((r) => r.id === selectedId);
      const isStructural = useStructuralStore
        .getState()
        .columns.some((c) => c.id === selectedId);
      const isBeam = useStructuralStore
        .getState()
        .beams.some((b) => b.id === selectedId);
      const isFixture = useFixtureStore
        .getState()
        .fixtures.some((f) => f.id === selectedId);
      const isWall = useWallsStore
        .getState()
        .walls.some((w) => w.id === selectedId);

      if (isRoom) {
        useFloorsStore.getState().removeRoom(selectedId);
      } else if (isStructural) {
        useStructuralStore.getState().removeColumn(selectedId);
      } else if (isBeam) {
        useStructuralStore.getState().removeBeam(selectedId);
      } else if (isFixture) {
        useFixtureStore.getState().removeFixture(selectedId);
      } else if (isWall) {
        // Eliminar pared: las aberturas ancladas caen o se re-anclan
        useWallsStore.getState().removeWall(selectedId);
      }
      clearSelection();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
