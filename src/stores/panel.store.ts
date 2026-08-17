/**
 * Tienda de estado para el panel modal de propiedades
 *
 * Maneja visibilidad y el elemento seleccionado. El panel es un modal
 * centrado (accesibilidad a11y-4): ya no es un panel flotante arrastrable.
 * Los tipos se derivan del elemento:
 *   - "room": habitación
 *   - "fixture": muebles, plantas, baño, vehículos
 *   - "opening": puertas y ventanas
 *   - "stair": escaleras
 */

import { create } from "zustand";

export type PanelType = "room" | "fixture" | "opening" | "stair" | "column" | "beam";

interface PanelStore {
  isOpen: boolean;
  type: PanelType | null;
  elementId: string | null;

  openPanel: (type: PanelType, id: string) => void;
  closePanel: () => void;
}

export const usePanelStore = create<PanelStore>((set) => ({
  isOpen: false,
  type: null,
  elementId: null,

  openPanel: (type, id) =>
    set({
      isOpen: true,
      type,
      elementId: id,
    }),

  closePanel: () => set({ isOpen: false, type: null, elementId: null }),
}));
