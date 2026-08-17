/**
 * Sistema de historial para deshacer/rehacer
 *
 * Captura snapshots del estado y permite navegar hacia atrás/adelante.
 *
 * Gestos (drag, rotación de brújula): beginGesture() empuja UN snapshot y
 * suprime pushState hasta endGesture(), de modo que un arrastre genera un
 * solo paso de deshacer (spec history-1, history-2). endGesture() descarta
 * el snapshot si nada cambió (click sin mover).
 */

import { create } from "zustand";
import { Floor, Fixture, StructuralElement, Terrain, Wall } from "@/types/plan";
import { useFloorsStore } from "@/stores/floors.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useWallsStore } from "@/stores/walls.store";
import { useStructuralStore } from "@/stores/structural.store";

interface HistoryEntry {
  floors: Floor[];
  activeFloorId: string;
  terrain: Terrain;
  fixtures?: Fixture[];
  walls?: Wall[];
  structural?: StructuralElement[];
}

export type { HistoryEntry };

interface HistoryStore {
  past: HistoryEntry[];
  future: HistoryEntry[];

  // Capturar estado actual (llamar antes de cada cambio)
  pushState: (state: HistoryEntry) => void;

  // Snapshot completo (floors + terreno + fixtures)
  captureSnapshot: () => HistoryEntry;

  // Gesto: un snapshot por drag/rotación, no uno por evento
  beginGesture: () => void;
  endGesture: () => void;

  // Deshacer/Rehacer
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;

  // Verificar si se puede deshacer/rehacer
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Limpiar historial
  clear: () => void;
}

const MAX_HISTORY = 50;

// Estado transitorio del gesto (fuera del store: nadie debe suscribirse)
let gestureActive = false;
let gestureStart: HistoryEntry | null = null;

export const useHistoryStore = create<HistoryStore>((set, get) => {
  const captureSnapshot = (): HistoryEntry => {
    const { floors, activeFloorId } = useFloorsStore.getState();
    const terrain = useTerrainStore.getState().terrain;
    const fixtures = useFixtureStore.getState().fixtures;
    const walls = useWallsStore.getState().walls;
    const structural: StructuralElement[] = [
      ...useStructuralStore.getState().columns,
      ...useStructuralStore.getState().beams,
    ];
    return { floors, activeFloorId, terrain, fixtures, walls, structural };
  };

  return {
    past: [],
    future: [],

    pushState: (state) => {
      if (gestureActive) return; // suprimido durante un gesto
      set((prev) => ({
        past: [...prev.past.slice(-MAX_HISTORY), state],
        future: [],
      }));
    },

    captureSnapshot,

    beginGesture: () => {
      if (gestureActive) return;
      const snapshot = captureSnapshot();
      gestureStart = snapshot;
      gestureActive = true;
      set((prev) => ({
        past: [...prev.past.slice(-MAX_HISTORY), snapshot],
        future: [],
      }));
    },

    endGesture: () => {
      if (!gestureActive) return;
      gestureActive = false;
      const start = gestureStart;
      gestureStart = null;
      // Sin cambios reales (click sin mover) → descartar el snapshot
      const changed =
        start !== null &&
        JSON.stringify(captureSnapshot()) !== JSON.stringify(start);
      if (!changed) {
        set((prev) => ({ past: prev.past.slice(0, -1) }));
      }
    },

    undo: () => {
      const { past, future } = get();
      if (past.length === 0) return null;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, -1);

      // El estado VIVO actual (post-cambio) pasa al stack de redo: redo()
      // debe restaurar el estado posterior al cambio, no el snapshot previo
      // (spec wall-drawing-5 — undo/redo restauran la geometría de la pared).
      const current = captureSnapshot();

      set({
        past: newPast,
        future: [current, ...future],
      });

      return previous;
    },

    redo: () => {
      const { past, future } = get();
      if (future.length === 0) return null;

      const next = future[0];
      const newFuture = future.slice(1);

      // El estado vivo actual (pre-redo) vuelve al stack de undo para que
      // la alternancia undo→redo→undo recorra estados reales.
      const current = captureSnapshot();

      set({
        past: [...past, current],
        future: newFuture,
      });

      return next;
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    clear: () => set({ past: [], future: [] }),
  };
});
