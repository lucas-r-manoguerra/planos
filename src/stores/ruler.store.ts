/**
 * Tienda de estado para la herramienta de regla
 *
 * Permite medir distancias entre dos puntos en el canvas
 */

import { create } from "zustand";

interface Measurement {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface RulerStore {
  active: boolean;
  pointA: { x: number; y: number } | null;
  pointerPos: { x: number; y: number } | null;
  measurements: Measurement[];

  activate: () => void;
  deactivate: () => void;
  setPointA: (x: number, y: number) => void;
  setPointerPos: (x: number, y: number) => void;
  addMeasurement: (x1: number, y1: number, x2: number, y2: number) => void;
  clearMeasurements: () => void;
}

export const useRulerStore = create<RulerStore>((set) => ({
  active: false,
  pointA: null,
  pointerPos: null,
  measurements: [],

  activate: () => set({ active: true, pointA: null, pointerPos: null }),
  deactivate: () => set({ active: false, pointA: null, pointerPos: null }),

  setPointA: (x, y) => set({ pointA: { x, y }, pointerPos: null }),
  setPointerPos: (x, y) => set({ pointerPos: { x, y } }),

  addMeasurement: (x1, y1, x2, y2) =>
    set((state) => ({
      measurements: [
        ...state.measurements,
        { id: crypto.randomUUID(), x1, y1, x2, y2 },
      ],
      pointA: null,
      pointerPos: null,
    })),

  clearMeasurements: () => set({ measurements: [], pointA: null, pointerPos: null }),
}));
