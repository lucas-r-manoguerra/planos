/**
 * Tienda de estado para elementos estructurales (columnas + vigas).
 *
 * El store sigue el patrón de walls.store.ts: acciones inmutables,
 * historial compartido.
 *
 * Unidades: 1 unidad = 1 centímetro (cm).
 */

import { create } from "zustand";
import { Beam, Column, StructuralElement } from "@/types/plan";
import { useHistoryStore } from "@/stores/history.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useWallsStore } from "@/stores/walls.store";

interface StructuralStore {
  columns: Column[];
  beams: Beam[];

  /** Columnas de una planta (selector fino para capas del canvas) */
  getColumnsForFloor: (floorId: string) => Column[];

  /** Elementos estructurales de una planta (columnas + vigas) */
  getStructuralForFloor: (floorId: string) => StructuralElement[];

  addColumn: (column: Omit<Column, "id" | "floorId">) => void;
  moveColumn: (id: string, x: number, y: number) => void;
  updateColumn: (
    id: string,
    updates: Partial<Pick<Column, "sectionWidth" | "sectionHeight">>
  ) => void;
  removeColumn: (id: string) => void;

  addBeam: (beam: Omit<Beam, "id" | "floorId">) => void;
  moveBeam: (id: string, x1: number, y1: number, x2: number, y2: number) => void;
  updateBeam: (id: string, updates: Partial<Pick<Beam, "width">>) => void;
  removeBeam: (id: string) => void;

  /** Reemplaza el set completo (carga de proyecto, undo/redo) */
  replaceStructural: (elements: StructuralElement[]) => void;
}

export const useStructuralStore = create<StructuralStore>((set, get) => {
  const recordHistory = () => {
    const { floors, activeFloorId } = useFloorsStore.getState();
    const terrain = useTerrainStore.getState().terrain;
    useHistoryStore.getState().pushState({
      floors,
      activeFloorId,
      terrain,
      fixtures: useFixtureStore.getState().fixtures,
      walls: useWallsStore.getState().walls,
      structural: [...get().columns, ...get().beams],
    });
  };

  return {
    columns: [],
    beams: [],

    getColumnsForFloor: (floorId) =>
      get().columns.filter((c) => c.floorId === floorId),

    getStructuralForFloor: (floorId) => [
      ...get().columns.filter((c) => c.floorId === floorId),
      ...get().beams.filter((b) => b.floorId === floorId),
    ],

    addColumn: (columnData) => {
      recordHistory();
      const id = crypto.randomUUID();
      const floorId = useFloorsStore.getState().activeFloorId;
      const column: Column = { ...columnData, id, floorId };
      set((state) => ({ columns: [...state.columns, column] }));
    },

    moveColumn: (id, x, y) => {
      const column = get().columns.find((c) => c.id === id);
      if (!column) return;
      if (column.x === x && column.y === y) return;
      recordHistory();
      set((state) => ({
        columns: state.columns.map((c) =>
          c.id === id ? { ...c, x, y } : c
        ),
      }));
    },

    updateColumn: (id, updates) => {
      const column = get().columns.find((c) => c.id === id);
      if (!column) return;
      if (
        updates.sectionWidth === column.sectionWidth &&
        updates.sectionHeight === column.sectionHeight
      ) {
        return;
      }
      recordHistory();
      set((state) => ({
        columns: state.columns.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      }));
    },

    removeColumn: (id) => {
      const column = get().columns.find((c) => c.id === id);
      if (!column) return;
      recordHistory();
      set((state) => ({
        columns: state.columns.filter((c) => c.id !== id),
      }));
    },

    addBeam: (beamData) => {
      recordHistory();
      const id = crypto.randomUUID();
      const floorId = useFloorsStore.getState().activeFloorId;
      const beam: Beam = { ...beamData, id, floorId };
      set((state) => ({ beams: [...state.beams, beam] }));
    },

    moveBeam: (id, x1, y1, x2, y2) => {
      const beam = get().beams.find((b) => b.id === id);
      if (!beam) return;
      if (beam.x1 === x1 && beam.y1 === y1 && beam.x2 === x2 && beam.y2 === y2) return;
      recordHistory();
      set((state) => ({
        beams: state.beams.map((b) =>
          b.id === id ? { ...b, x1, y1, x2, y2 } : b
        ),
      }));
    },

    updateBeam: (id, updates) => {
      const beam = get().beams.find((b) => b.id === id);
      if (!beam) return;
      if (updates.width === beam.width) return;
      recordHistory();
      set((state) => ({
        beams: state.beams.map((b) =>
          b.id === id ? { ...b, ...updates } : b
        ),
      }));
    },

    removeBeam: (id) => {
      const beam = get().beams.find((b) => b.id === id);
      if (!beam) return;
      recordHistory();
      set((state) => ({
        beams: state.beams.filter((b) => b.id !== id),
      }));
    },

    replaceStructural: (elements) => {
      const columns = elements.filter(
        (el): el is Column => "sectionWidth" in el
      );
      const beams = elements.filter(
        (el): el is Beam => "width" in el && "x1" in el
      );
      set({ columns, beams });
    },
  };
});
