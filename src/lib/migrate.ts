/**
 * Migraciones de datos del proyecto (versiones de persistencia).
 *
 * - v2 → v3: `floorId` a fixtures legados (anteriores a fixtures-1).
 * - v3 → v4: materializa las paredes de las habitaciones (entidades Wall)
 *   y re-ancla las aberturas (v3 anclaba a habitaciones; v4 ancla a
 *   entidades Wall).
 *
 * Funciones puras: sin localStorage, sin stores — verificables desde
 * scripts (regla 08).
 */

import { Column, Fixture, Floor, Room, Terrain, Wall } from "@/types/plan";
import { DEFAULT_PROJECT_NAME } from "@/lib/constants";
import type { ProjectData, ProjectIndex, ProjectIndexEntry } from "@/lib/storage";
import {
  edgeAnchor,
  findWallForAnchor,
  materializeFloorWalls,
  offsetFromStart,
  placeOnWall,
} from "@/lib/wall-utils";

/** Forma mínima de proyecto que la migración necesita conocer */
export interface MigratableProject {
  version: number;
  terrain?: Terrain;
  floors: Floor[];
  fixtures?: Fixture[];
  walls?: Wall[];
  structural?: Column[];
}

/**
 * Migra datos legados a la versión 4:
 * - v2 → v3: fixtures sin `floorId` se asignan a la primera planta.
 * - v3 → v4: paredes materializadas + aberturas re-ancladas a paredes.
 * - Datos ya en v4 se devuelven intactos (idempotente).
 * - No elimina ni reescribe campos existentes (rollback seguro).
 */
export function migrateProjectData<T extends MigratableProject>(
  data: T
): T & MigratableProject {
  if (data.version >= 6) return data;

  let current: T = data;

  // v2 → v3
  if (current.version < 3) {
    const firstFloorId = current.floors[0]?.id;
    const fixtures = current.fixtures;

    if (firstFloorId === undefined || fixtures === undefined) {
      current = { ...current, version: 3 };
    } else if (!fixtures.some((f) => !f.floorId)) {
      current = { ...current, version: 3 };
    } else {
      current = {
        ...current,
        version: 3,
        fixtures: fixtures.map((f) =>
          f.floorId ? f : { ...f, floorId: firstFloorId }
        ),
      };
    }
  }

  // v3 → v4
  if (current.version < 4) {
    current = migrateToV4(current);
  }

  // v4 → v5: add structural slice
  if (current.version < 5) {
    current = migrateToV5(current);
  }

  // v5 → v6: add normative validation fields (wall type, terrain setbacks)
  if (current.version < 6) {
    current = migrateToV6(current);
  }

  return current;
}

/**
 * Migración v3 → v4:
 * 1. Materializa las paredes de cada planta (entidades Wall).
 * 2. Re-ancla aberturas: en v3 `wallId` era un id de HABITACIÓN; se
 *    recalcula el ancla sobre la pared materializada correspondiente
 *    (misma semántica: offset desde el inicio de la pared). Si la
 *    habitación o la pared ya no existen, la abertura queda sin ancla
 *    (flotando en su posición actual — rollback seguro).
 */
export function migrateToV4<T extends MigratableProject>(
  data: T
): T & MigratableProject {
  const floors = data.floors;

  // 1) Paredes por planta (v3-exact: fusionadas + individuales)
  const walls: Wall[] = [];
  const wallsByFloor = new Map<string, Wall[]>();
  for (const floor of floors) {
    const floorWalls = materializeFloorWalls(floor);
    wallsByFloor.set(floor.id, floorWalls);
    walls.push(...floorWalls);
  }

  // 2) Re-anclaje de aberturas
  let migratedFixtures: Fixture[] | undefined = data.fixtures;
  if (data.fixtures !== undefined) {
    const roomById = new Map<string, Room>();
    for (const floor of floors) {
      for (const room of floor.rooms) roomById.set(room.id, room);
    }

    const firstFloorId = floors[0]?.id;
    migratedFixtures = data.fixtures.map((f) => {
      const isOpening = f.category === "door" || f.category === "window";
      if (!isOpening || !f.wallId || !f.wallSide) return f;

      const room = roomById.get(f.wallId);
      if (!room) {
        // Ancla legada a una habitación inexistente: quitar ancla
        return {
          ...f,
          wallId: undefined,
          wallSide: undefined,
          wallOffset: undefined,
        };
      }

      const horizontal = f.wallSide === "top" || f.wallSide === "bottom";
      const anchor = edgeAnchor(room, f.wallSide, f.wallOffset ?? 0);
      const floorWalls = wallsByFloor.get(f.floorId ?? firstFloorId) ?? [];
      const wall = findWallForAnchor(floorWalls, anchor, horizontal);

      if (!wall) {
        // Pared no materializada (p. ej. lado totalmente abierto):
        // queda flotando en su posición actual, sin ancla.
        return {
          ...f,
          wallId: undefined,
          wallSide: undefined,
          wallOffset: undefined,
        };
      }

      return placeOnWall(f, wall, offsetFromStart(wall, anchor));
    });
  }

  return {
    ...data,
    version: 4,
    walls,
    fixtures: migratedFixtures,
  };
}

/**
 * Migración v4 → v5: añade el slice `structural` (columnas) si falta.
 * Aditiva e idempotente: no elimina ni reescribe campos existentes.
 */
export function migrateToV5<T extends MigratableProject>(
  data: T
): T & MigratableProject {
  return {
    ...data,
    version: 5,
    structural: data.structural ?? [],
  };
}

/**
 * Migración v5 → v6: añade campos de validación normativa.
 * - `wall.type`: default "interior" si no existe.
 * - `terrain.setbacks`: default { front: 300, left: 150, right: 150, rear: 300 } si falta.
 * Aditiva e idempotente: no elimina ni reescribe campos existentes.
 */
export function migrateToV6<T extends MigratableProject>(
  data: T
): T & MigratableProject {
  const DEFAULT_SETBACKS = { front: 300, left: 150, right: 150, rear: 300 };

  const walls = data.walls?.map((w) =>
    w.type === undefined ? { ...w, type: "interior" as const } : w
  );

  const terrain =
    data.terrain !== undefined && data.terrain.setbacks === undefined
      ? { ...data.terrain, setbacks: DEFAULT_SETBACKS }
      : data.terrain;

  return {
    ...data,
    version: 6,
    ...(walls !== undefined && { walls }),
    ...(terrain !== undefined && { terrain }),
  } as T & MigratableProject;
}

/**
 * Construye el índice inicial (v3) a partir de los datos legados de un
 * solo proyecto. Puro: no toca localStorage. La clave legada se conserva.
 */
export function buildInitialProjectIndex(
  legacy: ProjectData,
  newProjectId: string,
  name: string = DEFAULT_PROJECT_NAME
): { index: ProjectIndex; entry: ProjectIndexEntry } {
  const now = new Date().toISOString();
  const entry: ProjectIndexEntry = {
    id: newProjectId,
    name,
    createdAt: now,
    updatedAt: now,
  };
  return {
    index: { projects: [entry], activeProjectId: entry.id },
    entry,
  };
}
