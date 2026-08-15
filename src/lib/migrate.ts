/**
 * Migraciones de datos del proyecto (versiones de persistencia).
 *
 * La migración a v3 asigna `floorId` a los fixtures que no lo tienen
 * (datos legados anteriores a fixtures-1). Funciones puras: sin
 * localStorage, sin stores — verificables desde scripts (regla 08).
 */

import { Fixture, Floor } from "@/types/plan";

/** Forma mínima de proyecto que la migración necesita conocer */
export interface MigratableProject {
  version: number;
  floors: Floor[];
  fixtures?: Fixture[];
}

/**
 * Migra datos legados a la versión 3:
 * - Fixtures sin `floorId` se asignan a la primera planta.
 * - Datos ya en v3 o superior se devuelven intactos (idempotente).
 * - No elimina ni reescribe campos existentes (rollback seguro).
 */
export function migrateProjectData<T extends MigratableProject>(data: T): T {
  if (data.version >= 3) return data;

  const firstFloorId = data.floors[0]?.id;
  const fixtures = data.fixtures;

  if (firstFloorId === undefined || fixtures === undefined) {
    return { ...data, version: 3 };
  }

  if (!fixtures.some((f) => !f.floorId)) {
    return { ...data, version: 3 };
  }

  return {
    ...data,
    version: 3,
    fixtures: fixtures.map((f) =>
      f.floorId ? f : { ...f, floorId: firstFloorId }
    ),
  };
}
