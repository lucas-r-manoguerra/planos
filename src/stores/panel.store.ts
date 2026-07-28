/**
 * Tienda de estado para el panel flotante de propiedades
 *
 * Maneja: visibilidad, posición, dimensiones, y el elemento seleccionado
 * Soporta habitaciones (roomId) y fixtures (fixtureId)
 */

import { create } from "zustand";

interface PanelStore {
  isOpen: boolean;
  roomId: string | null;
  fixtureId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;

  openPanel: (id: string, x?: number, y?: number, type?: "room" | "fixture") => void;
  closePanel: () => void;
  setPosition: (x: number, y: number) => void;
}

export const usePanelStore = create<PanelStore>((set) => ({
  isOpen: false,
  roomId: null,
  fixtureId: null,
  x: 300,
  y: 100,
  width: 320,
  height: 400,

  openPanel: (id, x, y, type = "room") =>
    set({
      isOpen: true,
      roomId: type === "room" ? id : null,
      fixtureId: type === "fixture" ? id : null,
      x: x ?? 300,
      y: y ?? 100,
    }),

  closePanel: () => set({ isOpen: false, roomId: null, fixtureId: null }),

  setPosition: (x, y) => set({ x, y }),
}));
