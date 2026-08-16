/**
 * Tienda de estado para fixtures (muebles, plantas, puertas, ventanas, escaleras)
 * 
 * Cada planta tiene su propia lista de fixtures
 */

import { create } from "zustand";
import { Fixture, FixtureSubtype } from "@/types/plan";
import { generateId } from "@/lib/utils";
import { useHistoryStore } from "@/stores/history.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useWallsStore } from "@/stores/walls.store";

interface FixtureStore {
  fixtures: Fixture[];
  placingFixture: FixtureSubtype | null;

  addFixture: (fixture: Omit<Fixture, "id">) => void;
  removeFixture: (id: string) => void;
  updateFixture: (id: string, updates: Partial<Fixture>) => void;
  moveFixture: (id: string, x: number, y: number) => void;
  rotateFixture: (id: string, rotation: number) => void;
  setPlacingFixture: (subtype: FixtureSubtype | null) => void;
  clearFixtures: () => void;
  getFixturesForFloor: (floorId: string) => Fixture[];
}

export const useFixtureStore = create<FixtureStore>((set, get) => {
  const recordHistory = () => {
    const current = get();
    const { floors, activeFloorId } = useFloorsStore.getState();
    const terrain = useTerrainStore.getState().terrain;
    useHistoryStore.getState().pushState({
      floors,
      activeFloorId,
      terrain,
      fixtures: current.fixtures,
      walls: useWallsStore.getState().walls,
    });
  };

  return {
    fixtures: [],
    placingFixture: null,

    addFixture: (fixtureData) => {
      recordHistory();
      const id = generateId();
      const floorId = useFloorsStore.getState().activeFloorId;
      const newFixture: Fixture = {
        ...fixtureData,
        id,
        floorId,
      };
      set((state) => ({
        fixtures: [...state.fixtures, newFixture],
        placingFixture: null,
      }));
    },

    removeFixture: (id) => {
      recordHistory();
      set((state) => ({
        fixtures: state.fixtures.filter((f) => f.id !== id),
      }));
    },

    updateFixture: (id, updates) => {
      recordHistory();
      set((state) => ({
        fixtures: state.fixtures.map((f) =>
          f.id === id ? { ...f, ...updates } : f
        ),
      }));
    },

    moveFixture: (id, x, y) => {
      set((state) => ({
        fixtures: state.fixtures.map((f) =>
          f.id === id ? { ...f, x, y } : f
        ),
      }));
    },

    rotateFixture: (id, rotation) => {
      recordHistory();
      set((state) => ({
        fixtures: state.fixtures.map((f) =>
          f.id === id ? { ...f, rotation } : f
        ),
      }));
    },

    setPlacingFixture: (subtype) => {
      set({ placingFixture: subtype });
    },

    clearFixtures: () => {
      recordHistory();
      set({ fixtures: [] });
    },

    getFixturesForFloor: (floorId) => {
      const { fixtures } = get();
      const firstFloorId = useFloorsStore.getState().floors[0]?.id;
      // Legacy: fixtures sin floorId pertenecen a la primera planta
      return fixtures.filter((f) => (f.floorId ?? firstFloorId) === floorId);
    },
  };
});
