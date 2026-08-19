/**
 * Tienda de estado para el manejo de plantas
 *
 * Cada planta tiene su propia lista de habitaciones
 * La planta activa se muestra en el canvas
 */

import { create } from "zustand";
import { Floor, Room } from "@/types/plan";
import { generateId, snapToGrid, clampPosition, applyWallMergeSnap } from "@/lib/utils";
import { SNAP_THRESHOLD } from "@/lib/constants";
import { useHistoryStore } from "@/stores/history.store";
import { useTerrainStore } from "@/stores/terrain.store";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useWallsStore } from "@/stores/walls.store";

// Collision detection helpers
function roomsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  const tolerance = 1;
  return !(
    a.x + a.width <= b.x + tolerance ||
    b.x + b.width <= a.x + tolerance ||
    a.y + a.height <= b.y + tolerance ||
    b.y + b.height <= a.y + tolerance
  );
}

function resolveCollision(
  moving: { x: number; y: number; width: number; height: number },
  static_: { x: number; y: number; width: number; height: number },
  terrain: { width: number; height: number }
): { x: number; y: number } {
  const overlapLeft = moving.x + moving.width - static_.x;
  const overlapRight = static_.x + static_.width - moving.x;
  const overlapTop = moving.y + moving.height - static_.y;
  const overlapBottom = static_.y + static_.height - moving.y;

  const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

  let x = moving.x;
  let y = moving.y;

  if (minOverlap === overlapLeft) {
    x = static_.x - moving.width;
  } else if (minOverlap === overlapRight) {
    x = static_.x + static_.width;
  } else if (minOverlap === overlapTop) {
    y = static_.y - moving.height;
  } else {
    y = static_.y + static_.height;
  }

  x = Math.max(0, Math.min(x, terrain.width - moving.width));
  y = Math.max(0, Math.min(y, terrain.height - moving.height));

  return { x, y };
}

interface FloorStore {
  floors: Floor[];
  activeFloorId: string;

  levelError: string | null;
  setFloorLevel: (id: string, level: number) => boolean;
  clearLevelError: () => void;

  // Acciones de plantas
  addFloor: (name?: string) => void;
  removeFloor: (id: string) => void;
  setActiveFloor: (id: string) => void;
  renameFloor: (id: string, name: string) => void;
  moveFloorUp: (id: string) => void;
  moveFloorDown: (id: string) => void;

  // Acciones de habitaciones (delegan a la planta activa)
  addRoom: (room: Omit<Room, "id">) => void;
  removeRoom: (id: string) => void;
  moveRoom: (id: string, x: number, y: number) => void;
  renameRoom: (id: string, label: string) => void;
  setRoomColor: (id: string, color: string) => void;
  setRoomSnap: (id: string, enabled: boolean) => void;
  duplicateRoom: (id: string) => void;
  updateRoomDimensions: (id: string, width: number, height: number) => void;
  updateRoomGeometry: (id: string, x: number, y: number, width: number, height: number) => void;
  setRoomWallWidth: (id: string, width: number) => void;
  setRoomEnclosed: (id: string, enclosed: boolean) => void;

  applyFloorTemplate: (rooms: Room[]) => void;

  // Obtener habitaciones de la planta activa
  getActiveRooms: () => Room[];
}

// Crear planta por defecto
const createDefaultFloor = (): Floor => ({
  id: generateId(),
  name: "Planta Baja",
  level: 0,
  rooms: [],
});

export const useFloorsStore = create<FloorStore>((set, get) => {
  const defaultFloor = createDefaultFloor();

  // Capturar estado actual antes de cada mutación
  const recordHistory = () => {
    const current = get();
    const terrain = useTerrainStore.getState().terrain;
    useHistoryStore.getState().pushState({
      floors: current.floors,
      activeFloorId: current.activeFloorId,
      terrain,
      fixtures: useFixtureStore.getState().fixtures,
      walls: useWallsStore.getState().walls,
    });
  };

  return {
    floors: [defaultFloor],
    activeFloorId: defaultFloor.id,
    levelError: null,

    setFloorLevel: (id, level) => {
      const state = get();
      if (!Number.isInteger(level) || level < 0) {
        set({ levelError: "El nivel debe ser un número entero ≥ 0" });
        return false;
      }
      const duplicate = state.floors.find((f) => f.id !== id && f.level === level);
      if (duplicate) {
        set({ levelError: `Nivel ${level} ya está en uso por "${duplicate.name}"` });
        return false;
      }
      recordHistory();
      set({
        floors: state.floors.map((f) => (f.id === id ? { ...f, level } : f)),
        levelError: null,
      });
      return true;
    },

    clearLevelError: () => set({ levelError: null }),

    addFloor: (name) =>
      set((state) => {
        recordHistory();
        const level = state.floors.length;
        const newFloor: Floor = {
          id: generateId(),
          name: name || `Planta ${level + 1}`,
          level,
          rooms: [],
        };
        return {
          floors: [...state.floors, newFloor],
          activeFloorId: newFloor.id,
        };
      }),

    removeFloor: (id) => {
      const state = get();
      // Sin historial si no hay nada que eliminar (no empujar no-ops)
      if (state.floors.length <= 1) return;
      recordHistory();
      const newFloors = state.floors.filter((f) => f.id !== id);
      const newActiveId =
        state.activeFloorId === id ? newFloors[0].id : state.activeFloorId;
      set({ floors: newFloors, activeFloorId: newActiveId });
      // La planta ya no existe: sus paredes se descartan
      useWallsStore.getState().regenerateFloorWalls(id);
    },

    setActiveFloor: (id) => set({ activeFloorId: id }),

    renameFloor: (id, name) =>
      set((state) => {
        recordHistory();
        return {
          floors: state.floors.map((f) => (f.id === id ? { ...f, name } : f)),
        };
      }),

    addRoom: (roomData) => {
      const state = get();
      const activeFloor = state.floors.find(
        (f) => f.id === state.activeFloorId
      );
      if (!activeFloor) return;

      recordHistory();

      const id = generateId();
      const { terrain } = useTerrainStore.getState();
      const centerX = (terrain.width - roomData.width) / 2;
      const centerY = (terrain.height - roomData.height) / 2;

      const newRoom: Room = {
        ...roomData,
        id,
        snapEnabled: roomData.snapEnabled !== false,
        wallWidth: roomData.wallWidth ?? 10,
        enclosed: roomData.enclosed ?? true,
        x: snapToGrid(centerX, SNAP_THRESHOLD),
        y: snapToGrid(centerY, SNAP_THRESHOLD),
      };

      set({
        floors: state.floors.map((f) =>
          f.id === state.activeFloorId
            ? { ...f, rooms: [...f.rooms, newRoom] }
            : f
        ),
      });

      // Materializar paredes: la nueva habitación puede fusionarse con
      // habitaciones adyacentes (pared compartida).
      useWallsStore.getState().regenerateFloorWalls(state.activeFloorId);
    },

    removeRoom: (id) => {
      const state = get();
      const activeFloor = state.floors.find(
        (f) => f.id === state.activeFloorId
      );
      if (!activeFloor) return;
      const removed = activeFloor.rooms.find((r) => r.id === id);
      if (!removed) return;

      const remainingRooms = activeFloor.rooms.filter((r) => r.id !== id);

      // Historial ANTES de mutar: deshacer debe restaurar la habitación
      recordHistory();

      set({
        floors: state.floors.map((f) =>
          f.id === state.activeFloorId ? { ...f, rooms: remainingRooms } : f
        ),
      });

      // Regenerar paredes: las de la habitación eliminada desaparecen
      // (las aberturas ancladas se re-anclan en S2 — fixtures-management-3).
      useWallsStore.getState().regenerateFloorWalls(state.activeFloorId);
    },

    moveRoom: (id, x, y) => {
      const state = get();
      const activeFloor = state.floors.find(
        (f) => f.id === state.activeFloorId
      );
      if (!activeFloor) return;

      const room = activeFloor.rooms.find((r) => r.id === id);
      if (!room) return;

      recordHistory();

      const terrain = useTerrainStore.getState().terrain;
      const otherRooms = activeFloor.rooms.filter((r) => r.id !== id);
      const snapEnabled = room.snapEnabled !== false;
      const clamped = snapEnabled
        ? clampPosition(x, y, room, terrain, 25, otherRooms)
        : {
            x: Math.max(0, Math.min(x, Math.max(0, terrain.width - room.width))),
            y: Math.max(0, Math.min(y, Math.max(0, terrain.height - room.height))),
          };

      // Semi-magnetism for wall merging (5cm threshold)
      // This runs even when snapEnabled is false — it's specifically for wall alignment
      const wallMerged = applyWallMergeSnap(clamped.x, clamped.y, room, otherRooms, 5);

      let finalX = wallMerged.x;
      let finalY = wallMerged.y;

      const snappedToEdgeX = finalX === 0 || finalX === terrain.width - room.width;
      const snappedToEdgeY = finalY === 0 || finalY === terrain.height - room.height;

      const roomRect = { x: finalX, y: finalY, width: room.width, height: room.height };

      for (const other of otherRooms) {
        if (roomsOverlap(roomRect, other)) {
          const resolved = resolveCollision(roomRect, other, terrain);
          if (!snappedToEdgeX) finalX = resolved.x;
          if (!snappedToEdgeY) finalY = resolved.y;
          roomRect.x = finalX;
          roomRect.y = finalY;
        }
      }

      set({
        floors: state.floors.map((f) =>
          f.id === state.activeFloorId
            ? {
                ...f,
                rooms: f.rooms.map((r) =>
                  r.id === id ? { ...r, x: finalX, y: finalY } : r
                ),
              }
            : f
        ),
      });

      // Regenerar: mover una habitación cambia las paredes compartidas
      useWallsStore.getState().regenerateFloorWalls(state.activeFloorId);
    },

    renameRoom: (id, label) =>
      set((state) => {
        recordHistory();
        return {
          floors: state.floors.map((f) =>
            f.id === state.activeFloorId
              ? {
                  ...f,
                  rooms: f.rooms.map((r) =>
                    r.id === id ? { ...r, label } : r
                  ),
                }
              : f
          ),
        };
      }),

    setRoomColor: (id, color) =>
      set((state) => {
        recordHistory();
        return {
          floors: state.floors.map((f) =>
            f.id === state.activeFloorId
              ? {
                  ...f,
                  rooms: f.rooms.map((r) =>
                    r.id === id ? { ...r, color } : r
                  ),
                }
              : f
          ),
        };
      }),

    setRoomSnap: (id, enabled) =>
      set((state) => {
        recordHistory();
        return {
          floors: state.floors.map((f) =>
            f.id === state.activeFloorId
              ? {
                  ...f,
                  rooms: f.rooms.map((r) =>
                    r.id === id ? { ...r, snapEnabled: enabled } : r
                  ),
                }
              : f
          ),
        };
      }),

    duplicateRoom: (id) => {
      const state = get();
      const activeFloor = state.floors.find(
        (f) => f.id === state.activeFloorId
      );
      if (!activeFloor) return;

      const room = activeFloor.rooms.find((r) => r.id === id);
      if (!room) return;

      recordHistory();

      const newRoom: Room = {
        ...room,
        id: generateId(),
        label: `${room.label} (copia)`,
        x: room.x + 20,
        y: room.y + 20,
      };

      set({
        floors: state.floors.map((f) =>
          f.id === state.activeFloorId
            ? { ...f, rooms: [...f.rooms, newRoom] }
            : f
        ),
      });

      // La copia puede fusionarse con la original u otras habitaciones
      useWallsStore.getState().regenerateFloorWalls(state.activeFloorId);
    },

    updateRoomDimensions: (id, width, height) => {
      const state = get();
      const activeFloor = state.floors.find(
        (f) => f.id === state.activeFloorId
      );
      if (!activeFloor) return;
      const room = activeFloor.rooms.find((r) => r.id === id);
      if (!room) return;
      if (width === room.width && height === room.height) return;

      recordHistory();

      set({
        floors: state.floors.map((f) =>
          f.id === state.activeFloorId
            ? {
                ...f,
                rooms: f.rooms.map((r) =>
                  r.id === id ? { ...r, width, height } : r
                ),
              }
            : f
        ),
      });

      useWallsStore.getState().regenerateFloorWalls(state.activeFloorId);
    },

    updateRoomGeometry: (id, x, y, width, height) => {
      const state = get();
      const activeFloor = state.floors.find(
        (f) => f.id === state.activeFloorId
      );
      if (!activeFloor) return;
      const room = activeFloor.rooms.find((r) => r.id === id);
      if (!room) return;
      if (
        x === room.x &&
        y === room.y &&
        width === room.width &&
        height === room.height
      ) {
        return;
      }

      recordHistory();

      set({
        floors: state.floors.map((f) =>
          f.id === state.activeFloorId
            ? {
                ...f,
                rooms: f.rooms.map((r) =>
                  r.id === id ? { ...r, x, y, width, height } : r
                ),
              }
            : f
        ),
      });

      useWallsStore.getState().regenerateFloorWalls(state.activeFloorId);
    },

    setRoomWallWidth: (id, width) => {
      const state = get();
      const activeFloor = state.floors.find(
        (f) => f.id === state.activeFloorId
      );
      if (!activeFloor) return;
      const room = activeFloor.rooms.find((r) => r.id === id);
      if (!room || room.wallWidth === width) return;

      recordHistory();

      set({
        floors: state.floors.map((f) =>
          f.id === state.activeFloorId
            ? {
                ...f,
                rooms: f.rooms.map((r) =>
                  r.id === id ? { ...r, wallWidth: width } : r
                ),
              }
            : f
        ),
      });

      // El espesor cambia la banda (línea central intacta — claves estables)
      useWallsStore.getState().regenerateFloorWalls(state.activeFloorId);
    },

    setRoomEnclosed: (id, enclosed) => {
      const state = get();
      const activeFloor = state.floors.find(
        (f) => f.id === state.activeFloorId
      );
      if (!activeFloor) return;
      const room = activeFloor.rooms.find((r) => r.id === id);
      if (!room || room.enclosed === enclosed) return;

      recordHistory();

      set({
        floors: state.floors.map((f) =>
          f.id === state.activeFloorId
            ? {
                ...f,
                rooms: f.rooms.map((r) =>
                  r.id === id ? { ...r, enclosed } : r
                ),
              }
            : f
        ),
      });

      // Habitación abierta/cerrada cambia los vanos de sus paredes
      useWallsStore.getState().regenerateFloorWalls(state.activeFloorId);
    },

    moveFloorUp: (id) =>
      set((state) => {
        const index = state.floors.findIndex((f) => f.id === id);
        if (index <= 0) return state;
        const newFloors = [...state.floors];
        [newFloors[index - 1], newFloors[index]] = [newFloors[index], newFloors[index - 1]];
        const updated = newFloors.map((f, i) => ({ ...f, level: i }));
        return { floors: updated };
      }),

    moveFloorDown: (id) =>
      set((state) => {
        const index = state.floors.findIndex((f) => f.id === id);
        if (index === -1 || index >= state.floors.length - 1) return state;
        const newFloors = [...state.floors];
        [newFloors[index], newFloors[index + 1]] = [newFloors[index + 1], newFloors[index]];
        const updated = newFloors.map((f, i) => ({ ...f, level: i }));
        return { floors: updated };
      }),

    applyFloorTemplate: (rooms) => {
      const state = get();
      const activeFloor = state.floors.find(
        (f) => f.id === state.activeFloorId
      );
      if (!activeFloor) return;

      recordHistory();

      set({
        floors: state.floors.map((f) =>
          f.id === state.activeFloorId ? { ...f, rooms } : f
        ),
      });

      // Template nuevo: materializar todas sus paredes
      useWallsStore.getState().regenerateFloorWalls(state.activeFloorId);
    },

    getActiveRooms: () => {
      const state = get();
      const activeFloor = state.floors.find(
        (f) => f.id === state.activeFloorId
      );
      return activeFloor?.rooms || [];
    },
  };
});
