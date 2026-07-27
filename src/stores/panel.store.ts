/**
 * Tienda de estado para el panel flotante de propiedades
 *
 * Maneja: visibilidad, posición, dimensiones, y el elemento seleccionado
 */

import { create } from "zustand";

interface PanelStore {
  isOpen: boolean;
  roomId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;

  openPanel: (roomId: string, x?: number, y?: number) => void;
  closePanel: () => void;
  setPosition: (x: number, y: number) => void;
}

export const usePanelStore = create<PanelStore>((set) => ({
  isOpen: false,
  roomId: null,
  x: 300,
  y: 100,
  width: 320,
  height: 400,

  openPanel: (roomId, x, y) =>
    set({
      isOpen: true,
      roomId,
      x: x ?? 300,
      y: y ?? 100,
    }),

  closePanel: () => set({ isOpen: false, roomId: null }),

  setPosition: (x, y) => set({ x, y }),
}));
