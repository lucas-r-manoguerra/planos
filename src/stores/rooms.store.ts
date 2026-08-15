/**
 * Tienda de estado solo para el terreno
 * 
 * Las habitaciones ahora están en floors.store.ts
 */

import { create } from "zustand";
import { Terrain } from "@/types/plan";
import { DEFAULT_TERRAIN } from "@/lib/constants";
import { useHistoryStore } from "@/stores/history.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useFixtureStore } from "@/stores/fixtures.store";

interface TerrainStore {
  terrain: Terrain;
  updateTerrain: (width: number, height: number) => void;
  setTerrainColor: (color: string) => void;
  setTerrainImage: (image: string | undefined) => void;
  setTerrainFront: (front: Terrain["front"]) => void;
  setTerrainAngle: (angle: number) => void;
}

export const useTerrainStore = create<TerrainStore>((set, get) => {
  const recordHistory = () => {
    const current = get();
    const { floors, activeFloorId } = useFloorsStore.getState();
    useHistoryStore.getState().pushState({
      floors,
      activeFloorId,
      terrain: current.terrain,
      fixtures: useFixtureStore.getState().fixtures,
    });
  };

  return {
    terrain: {
      width: DEFAULT_TERRAIN.width,
      height: DEFAULT_TERRAIN.height,
      color: "#4ade80",
      front: "bottom",
      northAngle: 0,
    },
    updateTerrain: (width, height) => {
      recordHistory();
      set((state) => ({ terrain: { ...state.terrain, width, height } }));
    },
    setTerrainColor: (color) => {
      recordHistory();
      set((state) => ({ terrain: { ...state.terrain, color } }));
    },
    setTerrainImage: (image) => {
      recordHistory();
      set((state) => ({ terrain: { ...state.terrain, backgroundImage: image } }));
    },
    setTerrainFront: (front) => {
      recordHistory();
      set((state) => ({ terrain: { ...state.terrain, front } }));
    },
    setTerrainAngle: (angle) => {
      recordHistory();
      set((state) => ({ terrain: { ...state.terrain, northAngle: angle } }));
    },
  };
});
