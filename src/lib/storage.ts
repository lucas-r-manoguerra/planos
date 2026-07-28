/**
 * Persistencia local del proyecto
 *
 * Guarda y carga el estado completo del plano en localStorage
 */

import { Floor, Fixture, SunSettings, Terrain } from "@/types/plan";
import { DEFAULT_SUN_SETTINGS } from "@/lib/constants";

interface ProjectData {
  version: number;
  name: string;
  terrain: Terrain;
  floors: Floor[];
  activeFloorId: string;
  sunSettings: SunSettings;
  fixtures?: Fixture[];
  savedAt: string;
}

const STORAGE_KEY = "planos-project";
const CURRENT_VERSION = 2;

// Guardar proyecto en localStorage
export function saveProject(
  data: Omit<ProjectData, "version" | "savedAt">
): void {
  const projectData: ProjectData = {
    ...data,
    version: CURRENT_VERSION,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData));
}

// Cargar proyecto desde localStorage
export function loadProject(): ProjectData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as ProjectData;

    // Migración v1 → v2: northAt → northAngle y sunSettings
    if (data.version < 2) {
      // Tratar terreno como objeto crudo para migrar campos viejos
      const rawTerrain = data.terrain as unknown as Record<string, unknown>;
      if (rawTerrain.northAt && !('northAngle' in rawTerrain)) {
        // Migrar northAt string a northAngle number
        const map: Record<string, number> = { top: 0, right: 90, bottom: 180, left: 270 };
        rawTerrain.northAngle = map[rawTerrain.northAt as string] ?? 0;
        delete rawTerrain.northAt;
        data.terrain = rawTerrain as unknown as Terrain;
      } else if (!('northAngle' in rawTerrain)) {
        rawTerrain.northAngle = 0;
        data.terrain = rawTerrain as unknown as Terrain;
      }
      if (!data.sunSettings) {
        data.sunSettings = { ...DEFAULT_SUN_SETTINGS };
      }
    }

    return data;
  } catch {
    return null;
  }
}

// Eliminar proyecto guardado
export function clearProject(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Verificar si hay proyecto guardado
export function hasSavedProject(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}
