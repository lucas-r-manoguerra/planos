/**
 * Tienda de estado solo para el terreno
 * 
 * Las habitaciones ahora están en floors.store.ts
 */

import { create } from "zustand";
import { Terrain } from "@/types/plan";
import { DEFAULT_TERRAIN } from "@/lib/constants";

interface TerrainStore {
  terrain: Terrain;
  updateTerrain: (width: number, height: number) => void;
  setTerrainColor: (color: string) => void;
  setTerrainImage: (image: string | undefined) => void;
  setTerrainFront: (front: Terrain["front"]) => void;
}

export const useTerrainStore = create<TerrainStore>((set) => ({
  terrain: {
    width: DEFAULT_TERRAIN.width,
    height: DEFAULT_TERRAIN.height,
    color: "#4ade80",
    front: "bottom",
  },
  updateTerrain: (width, height) =>
    set((state) => ({ terrain: { ...state.terrain, width, height } })),
  setTerrainColor: (color) =>
    set((state) => ({ terrain: { ...state.terrain, color } })),
  setTerrainImage: (image) =>
    set((state) => ({ terrain: { ...state.terrain, backgroundImage: image } })),
  setTerrainFront: (front) =>
    set((state) => ({ terrain: { ...state.terrain, front } })),
}));
