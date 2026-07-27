/**
 * Persistencia local del proyecto
 *
 * Guarda y carga el estado completo del plano en localStorage
 */

import { Floor, Terrain } from "@/types/plan";

interface ProjectData {
  version: number;
  name: string;
  terrain: Terrain;
  floors: Floor[];
  activeFloorId: string;
  savedAt: string;
}

const STORAGE_KEY = "planos-project";
const CURRENT_VERSION = 1;

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

    if (data.version < CURRENT_VERSION) {
      // Migraciones futuras
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
