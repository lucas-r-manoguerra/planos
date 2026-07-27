/**
 * Tienda de estado para el manejo de plantas
 *
 * Cada planta tiene su propia lista de habitaciones
 * La planta activa se muestra en el canvas
 */

import { create } from "zustand";
import { Floor, Room } from "@/types/plan";
import { generateId, snapToGrid, clampPosition } from "@/lib/utils";
import { DEFAULT_TERRAIN, SNAP_THRESHOLD } from "@/lib/constants";
import { useHistoryStore } from "@/stores/history.store";

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
  duplicateRoom: (id: string) => void;
  updateRoomDimensions: (id: string, width: number, height: number) => void;

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
    useHistoryStore.getState().pushState({
      floors: current.floors,
      activeFloorId: current.activeFloorId,
    });
  };

  return {
    floors: [defaultFloor],
    activeFloorId: defaultFloor.id,

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

    removeFloor: (id) =>
      set((state) => {
        recordHistory();
        if (state.floors.length <= 1) return state;
        const newFloors = state.floors.filter((f) => f.id !== id);
        const newActiveId =
          state.activeFloorId === id ? newFloors[0].id : state.activeFloorId;
        return { floors: newFloors, activeFloorId: newActiveId };
      }),

    setActiveFloor: (id) => set({ activeFloorId: id }),

    renameFloor: (id, name) =>
      set((state) => {
        recordHistory();
        return {
          floors: state.floors.map((f) => (f.id === id ? { ...f, name } : f)),
        };
      }),

    addRoom: (roomData) =>
      set((state) => {
        recordHistory();
        const activeFloor = state.floors.find(
          (f) => f.id === state.activeFloorId
        );
        if (!activeFloor) return state;

        const id = generateId();
        const centerX = (DEFAULT_TERRAIN.width - roomData.width) / 2;
        const centerY = (DEFAULT_TERRAIN.height - roomData.height) / 2;

        const newRoom: Room = {
          ...roomData,
          id,
          x: snapToGrid(centerX, SNAP_THRESHOLD),
          y: snapToGrid(centerY, SNAP_THRESHOLD),
        };

        return {
          floors: state.floors.map((f) =>
            f.id === state.activeFloorId
              ? { ...f, rooms: [...f.rooms, newRoom] }
              : f
          ),
        };
      }),

    removeRoom: (id) =>
      set((state) => {
        recordHistory();
        return {
          floors: state.floors.map((f) =>
            f.id === state.activeFloorId
              ? { ...f, rooms: f.rooms.filter((r) => r.id !== id) }
              : f
          ),
        };
      }),

    moveRoom: (id, x, y) =>
      set((state) => {
        recordHistory();
        const activeFloor = state.floors.find(
          (f) => f.id === state.activeFloorId
        );
        if (!activeFloor) return state;

        const room = activeFloor.rooms.find((r) => r.id === id);
        if (!room) return state;

        const snappedX = snapToGrid(x, SNAP_THRESHOLD);
        const snappedY = snapToGrid(y, SNAP_THRESHOLD);

        const terrain = { width: DEFAULT_TERRAIN.width, height: DEFAULT_TERRAIN.height } as import("@/types/plan").Terrain;
        const clamped = clampPosition(snappedX, snappedY, room, terrain, 25, activeFloor.rooms);

        const otherRooms = activeFloor.rooms.filter((r) => r.id !== id);
        let finalX = clamped.x;
        let finalY = clamped.y;

        const roomRect = { x: finalX, y: finalY, width: room.width, height: room.height };

        for (const other of otherRooms) {
          if (roomsOverlap(roomRect, other)) {
            const resolved = resolveCollision(roomRect, other, terrain);
            finalX = resolved.x;
            finalY = resolved.y;
            roomRect.x = finalX;
            roomRect.y = finalY;
          }
        }

        return {
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
        };
      }),

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

    duplicateRoom: (id) =>
      set((state) => {
        recordHistory();
        const activeFloor = state.floors.find(
          (f) => f.id === state.activeFloorId
        );
        if (!activeFloor) return state;

        const room = activeFloor.rooms.find((r) => r.id === id);
        if (!room) return state;

        const newRoom: Room = {
          ...room,
          id: generateId(),
          label: `${room.label} (copia)`,
          x: room.x + 20,
          y: room.y + 20,
        };

        return {
          floors: state.floors.map((f) =>
            f.id === state.activeFloorId
              ? { ...f, rooms: [...f.rooms, newRoom] }
              : f
          ),
        };
      }),

    updateRoomDimensions: (id, width, height) =>
      set((state) => {
        recordHistory();
        return {
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
        };
      }),

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

    applyFloorTemplate: (rooms) =>
      set((state) => {
        recordHistory();
        return {
          floors: state.floors.map((f) =>
            f.id === state.activeFloorId
              ? { ...f, rooms }
              : f
          ),
        };
      }),

    getActiveRooms: () => {
      const state = get();
      const activeFloor = state.floors.find(
        (f) => f.id === state.activeFloorId
      );
      return activeFloor?.rooms || [];
    },
  };
});
