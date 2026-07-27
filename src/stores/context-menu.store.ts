/**
 * Tienda de estado para el menú contextual
 *
 * Maneja: visibilidad, posición, items del menú según dónde se hizo click
 */

import { create } from "zustand";
import { ContextMenuItem, ContextMenuState } from "@/types/context-menu";

interface ContextMenuStore extends ContextMenuState {
  show: (x: number, y: number, items: ContextMenuItem[]) => void;
  hide: () => void;
}

export const useContextMenuStore = create<ContextMenuStore>((set) => ({
  visible: false,
  x: 0,
  y: 0,
  items: [],

  show: (x, y, items) => set({ visible: true, x, y, items }),
  hide: () => set({ visible: false }),
}));
