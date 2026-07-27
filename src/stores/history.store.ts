/**
 * Sistema de historial para deshacer/rehacer
 *
 * Captura snapshots del estado y permite navegar hacia atrás/adelante
 */

import { create } from "zustand";
import { Floor, Terrain } from "@/types/plan";

interface HistoryEntry {
  floors: Floor[];
  activeFloorId: string;
  terrain: Terrain;
}

interface HistoryStore {
  past: HistoryEntry[];
  future: HistoryEntry[];

  // Capturar estado actual (llamar antes de cada cambio)
  pushState: (state: HistoryEntry) => void;

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

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],

  pushState: (state) =>
    set((prev) => ({
      past: [...prev.past.slice(-MAX_HISTORY), state],
      future: [],
    })),

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return null;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    set({
      past: newPast,
      future: [previous, ...future],
    });

    return previous;
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return null;

    const next = future[0];
    const newFuture = future.slice(1);

    set({
      past: [...past, next],
      future: newFuture,
    });

    return next;
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  clear: () => set({ past: [], future: [] }),
}));
