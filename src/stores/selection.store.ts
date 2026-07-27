/**
 * Tienda de estado para la selección de elementos
 *
 * Maneja: qué elemento está seleccionado, resaltado visual
 */

import { create } from "zustand";

interface SelectionStore {
  selectedId: string | null;
  select: (id: string | null) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  selectedId: null,
  select: (id) => set({ selectedId: id }),
  clearSelection: () => set({ selectedId: null }),
}));
