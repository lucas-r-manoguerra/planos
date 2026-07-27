/**
 * Persistencia local del proyecto
 *
 * Guarda y carga el estado completo del plano en localStorage
 */

import { Floor, SunSettings, Terrain } from "@/types/plan";
import { DEFAULT_SUN_SETTINGS } from "@/lib/constants";

interface ProjectData {
  version: number;
  name: string;
  terrain: Terrain;
  floors: Floor[];
  activeFloorId: string;
  sunSettings: SunSettings;
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

    // Migración v1 → v2: agregar northAt al terreno y sunSettings
    if (data.version < 2) {
      if (!data.terrain.northAt) {
        data.terrain = { ...data.terrain, northAt: "top" };
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
