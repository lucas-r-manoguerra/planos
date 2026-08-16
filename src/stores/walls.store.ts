/**
 * Tienda de estado de las paredes (entidades Wall, v4).
 *
 * Las paredes derivadas de habitaciones son ESTADO DERIVADO: se materializan
 * desde las habitaciones (lib/wall-utils.ts) cada vez que cambia la
 * geometría de una habitación. El store también admite paredes libres
 * (sin roomId) para el dibujo manual (S2).
 *
 * Las paredes NO se regeneran automáticamente aquí: las acciones de
 * geometría de floors.store llaman a `regenerateFloorWalls(floorId)`
 * DESPUÉS de mutar las habitaciones, con el historial ya capturado.
 */

import { create } from "zustand";
import { Wall } from "@/types/plan";
import { generateId } from "@/lib/utils";
import { materializeFloorWalls, reanchorOpenings } from "@/lib/wall-utils";
import { tryMergeCollinearWalls } from "@/lib/wall-merge";
import { useHistoryStore } from "@/stores/history.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useFixtureStore } from "@/stores/fixtures.store";

interface WallsStore {
  walls: Wall[];

  /** Paredes de una planta (selector fino para capas del canvas) */
  getWallsForFloor: (floorId: string) => Wall[];

  // Acciones de paredes libres (S2: dibujo manual)
  addWall: (wall: Omit<Wall, "id">) => void;
  moveWall: (id: string, x1: number, y1: number, x2: number, y2: number) => void;
  resizeWall: (id: string, x1: number, y1: number, x2: number, y2: number) => void;
  removeWall: (id: string) => void;

  /**
   * Regenera las paredes derivadas de una planta. Idempotente: si la
   * geometría no cambió, no toca el estado. Si la planta ya no existe,
   * descarta sus paredes (planta eliminada).
   */
  regenerateFloorWalls: (floorId: string) => void;

  /** Re-ancla aberturas cuyas paredes desaparecieron (wrapper del store) */
  reanchorOpenings: () => void;

  /** Reemplaza el set completo (carga de proyecto, historial) */
  replaceWalls: (walls: Wall[]) => void;
}

export const useWallsStore = create<WallsStore>((set, get) => {
  const recordHistory = () => {
    const { floors, activeFloorId } = useFloorsStore.getState();
    const terrain = useTerrainStore.getState().terrain;
    useHistoryStore.getState().pushState({
      floors,
      activeFloorId,
      terrain,
      fixtures: useFixtureStore.getState().fixtures,
      walls: get().walls,
    });
  };

  return {
    walls: [],

    getWallsForFloor: (floorId) =>
      get().walls.filter((w) => w.floorId === floorId),

    addWall: (wall) => {
      recordHistory();
      const wallWithId: Wall = { ...wall, id: generateId() };
      const merged = tryMergeCollinearWalls(get().walls, wallWithId);
      if (merged) {
        // Fusión colineal (spec wall-drawing-7): una pared nueva + un solo paso
        // de undo; las aberturas de la pared absorbida siguen a la fusionada (D4)
        set({ walls: merged });
        get().reanchorOpenings();
      } else {
        set((state) => ({ walls: [...state.walls, wallWithId] }));
      }
    },

    moveWall: (id, x1, y1, x2, y2) => {
      const wall = get().walls.find((w) => w.id === id);
      if (!wall) return;
      // Longitud cero: rechazar (punto sin dirección)
      if (Math.abs(x1 - x2) <= 0 && Math.abs(y1 - y2) <= 0) return;
      recordHistory();
      set((state) => ({
        walls: state.walls.map((w) =>
          w.id === id ? { ...w, x1, y1, x2, y2 } : w
        ),
      }));
      // Las aberturas ancladas siguen a la pared (design D7)
      get().reanchorOpenings();
    },

    resizeWall: (id, x1, y1, x2, y2) => {
      const wall = get().walls.find((w) => w.id === id);
      if (!wall) return;
      // Longitud cero: rechazar (punto sin dirección)
      if (Math.abs(x1 - x2) <= 0 && Math.abs(y1 - y2) <= 0) return;
      recordHistory();
      set((state) => ({
        walls: state.walls.map((w) =>
          w.id === id ? { ...w, x1, y1, x2, y2 } : w
        ),
      }));
      // Las aberturas ancladas siguen a la pared (design D7)
      get().reanchorOpenings();
    },

    removeWall: (id) => {
      recordHistory();
      set((state) => ({ walls: state.walls.filter((w) => w.id !== id) }));
      // Aberturas de la pared eliminada: re-anclar o descartar
      // (spec fixtures-management-3)
      get().reanchorOpenings();
    },

    regenerateFloorWalls: (floorId) => {
      const { floors } = useFloorsStore.getState();
      const floor = floors.find((f) => f.id === floorId);
      const existing = get().walls;

      if (!floor) {
        // Planta eliminada: descartar sus paredes
        const remaining = existing.filter((w) => w.floorId !== floorId);
        if (remaining.length !== existing.length) {
          set({ walls: remaining });
          // Las aberturas de la planta eliminada caen o se re-anclan
          get().reanchorOpenings();
        }
        return;
      }

      const otherFloors = existing.filter((w) => w.floorId !== floorId);
      const freeForm = existing.filter(
        (w) => w.floorId === floorId && !w.roomId
      );
      const existingRoomWalls = existing.filter(
        (w) => w.floorId === floorId && w.roomId
      );

      const materialized = materializeFloorWalls(floor, existingRoomWalls);

      // Idempotencia: sin cambios de geometría → no tocar nada.
      // Solo aplica si ya había paredes de esta planta (si no, materializar
      // siempre — caso de carga/importación de proyecto).
      if (
        existingRoomWalls.length > 0 &&
        JSON.stringify(materialized) === JSON.stringify(existingRoomWalls)
      ) {
        return;
      }

      set({ walls: [...otherFloors, ...freeForm, ...materialized] });
      // Geometría de habitaciones cambió: las aberturas ancladas siguen a
      // las paredes (design D7); las de paredes eliminadas caen o se
      // re-anclan a una coincidente (spec fixtures-management-3).
      get().reanchorOpenings();
    },

    reanchorOpenings: () => {
      const { fixtures } = useFixtureStore.getState();
      const { fixtures: updated } = reanchorOpenings(fixtures, get().walls);
      useFixtureStore.setState({ fixtures: updated });
    },

    replaceWalls: (walls) => set({ walls }),
  };
});
