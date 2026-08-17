/**
 * Persistencia local de proyectos (v4).
 *
 * v4 añade las paredes como entidades (`walls`) materializadas a partir de
 * las habitaciones (ver lib/wall-utils.ts) y re-ancla las aberturas a
 * entidades Wall. La migración v3 → v4 ocurre al cargar (lib/migrate.ts).
 *
 * v3 soporta múltiples proyectos nombrados con un índice
 * (`planos:projects:v1`) y una clave por proyecto (`planos:project:{id}`).
 * La clave legada de un solo proyecto (`planos-project`) se conserva
 * intacta: al primer uso se migra como proyecto "Mi Plano" sin borrarla.
 *
 * Funciones puras (parse/serialize) sin localStorage para verificación
 * desde scripts (regla 08); el resto usa `localStorage` de forma lazy.
 */

import { Column, Floor, Fixture, SunSettings, Terrain, Wall } from "@/types/plan";
import { DEFAULT_PROJECT_NAME, DEFAULT_SUN_SETTINGS, DEFAULT_TERRAIN } from "@/lib/constants";
import { buildInitialProjectIndex, migrateProjectData } from "@/lib/migrate";
import { generateId } from "@/lib/utils";

export interface ProjectData {
  version: number;
  name: string;
  terrain: Terrain;
  floors: Floor[];
  activeFloorId: string;
  sunSettings: SunSettings;
  fixtures?: Fixture[];
  walls?: Wall[];
  structural?: Column[];
  savedAt: string;
}

// Clave legada de un solo proyecto: se mantiene hasta que el usuario
// la importe o borre (spec persistence-4). No renombrar.
const LEGACY_STORAGE_KEY = "planos-project";
const CURRENT_VERSION = 5;

// ==================== Índice de proyectos ====================

const PROJECTS_INDEX_KEY = "planos:projects:v1";
const PROJECT_KEY_PREFIX = "planos:project:";

export function getProjectStorageKey(id: string): string {
  return `${PROJECT_KEY_PREFIX}${id}`;
}

export interface ProjectIndexEntry {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectIndex {
  projects: ProjectIndexEntry[];
  activeProjectId: string;
}

/** Parsea el índice guardado. null si falta, está corrupto o vacío. */
export function parseProjectIndex(raw: string | null): ProjectIndex | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ProjectIndex>;
    if (!Array.isArray(parsed.projects)) return null;
    const projects = parsed.projects.filter(
      (p): p is ProjectIndexEntry =>
        typeof p?.id === "string" &&
        typeof p?.name === "string" &&
        typeof p?.createdAt === "string" &&
        typeof p?.updatedAt === "string"
    );
    if (projects.length === 0) return null;
    const activeProjectId =
      typeof parsed.activeProjectId === "string" &&
      projects.some((p) => p.id === parsed.activeProjectId)
        ? parsed.activeProjectId
        : projects[0].id;
    return { projects, activeProjectId };
  } catch {
    return null;
  }
}

function readIndex(): ProjectIndex | null {
  return parseProjectIndex(localStorage.getItem(PROJECTS_INDEX_KEY));
}

function writeIndex(index: ProjectIndex): void {
  localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(index));
}

function createDefaultFloor(): Floor {
  return { id: generateId(), name: "Planta Baja", level: 0, rooms: [] };
}

function defaultProjectData(name: string, savedAt: string): ProjectData {
  const floor = createDefaultFloor();
  return {
    version: CURRENT_VERSION,
    name,
    terrain: { ...DEFAULT_TERRAIN, color: "#4ade80", front: "bottom", northAngle: 0 },
    floors: [floor],
    activeFloorId: floor.id,
    sunSettings: { ...DEFAULT_SUN_SETTINGS },
    fixtures: [],
    walls: [],
    structural: [],
    savedAt,
  };
}

/**
 * Escribe un proyecto por defecto vacío y lo deja activo.
 * Usado al arrancar sin datos y al borrar el último proyecto.
 */
function writeFreshDefaultProject(): ProjectIndexEntry {
  const now = new Date().toISOString();
  const entry: ProjectIndexEntry = {
    id: generateId(),
    name: DEFAULT_PROJECT_NAME,
    createdAt: now,
    updatedAt: now,
  };
  localStorage.setItem(getProjectStorageKey(entry.id), JSON.stringify(defaultProjectData(DEFAULT_PROJECT_NAME, now)));
  const index: ProjectIndex = { projects: [entry], activeProjectId: entry.id };
  writeIndex(index);
  return entry;
}

/**
 * Garantiza índice de proyectos: crea el inicial migrando la clave
 * legada ("Mi Plano") o, si no hay datos, con un proyecto por defecto.
 * Idempotente. No llama a createProject (evita recursión).
 */
export function ensureIndex(): ProjectIndex {
  const existing = readIndex();
  if (existing) return existing;

  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (raw) {
    const legacy = loadProject();
    if (legacy) {
      const { index, entry } = buildInitialProjectIndex(legacy, generateId());
      localStorage.setItem(getProjectStorageKey(entry.id), JSON.stringify(legacy));
      writeIndex(index);
      return index;
    }
  }

  // Sin datos: proyecto por defecto vacío
  const entry = writeFreshDefaultProject();
  return { projects: [entry], activeProjectId: entry.id };
}

// ==================== CRUD de proyectos ====================

export function listProjects(): ProjectIndexEntry[] {
  return ensureIndex().projects;
}

export function getActiveProjectId(): string {
  return ensureIndex().activeProjectId;
}

/** Garantiza que exista un proyecto activo y devuelve su entrada. */
export function ensureActiveProject(): ProjectIndexEntry {
  const index = ensureIndex();
  const entry = index.projects.find((p) => p.id === index.activeProjectId);
  return entry ?? index.projects[0];
}

export function createProject(name: string): ProjectIndexEntry {
  const index = ensureIndex();
  const id = generateId();
  const now = new Date().toISOString();
  const entry: ProjectIndexEntry = { id, name, createdAt: now, updatedAt: now };
  localStorage.setItem(getProjectStorageKey(id), JSON.stringify(defaultProjectData(name, now)));
  writeIndex({ projects: [...index.projects, entry], activeProjectId: id });
  return entry;
}

export function renameProject(id: string, name: string): void {
  const index = ensureIndex();
  writeIndex({
    ...index,
    projects: index.projects.map((p) =>
      p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p
    ),
  });
}

export function deleteProject(id: string): void {
  const index = ensureIndex();
  localStorage.removeItem(getProjectStorageKey(id));
  const projects = index.projects.filter((p) => p.id !== id);
  if (projects.length === 0) {
    // Sin proyectos restantes: reiniciar con uno por defecto vacío
    writeFreshDefaultProject();
    return;
  }
  writeIndex({
    projects,
    activeProjectId: index.activeProjectId === id ? projects[0].id : index.activeProjectId,
  });
}

export function switchProject(id: string): ProjectIndexEntry | null {
  const index = ensureIndex();
  const entry = index.projects.find((p) => p.id === id);
  if (!entry) return null;
  writeIndex({ ...index, activeProjectId: id });
  return entry;
}

// ==================== Datos de proyecto ====================

export function loadProjectById(id: string): ProjectData | null {
  try {
    const raw = localStorage.getItem(getProjectStorageKey(id));
    if (!raw) return null;
    return migrateProjectData(JSON.parse(raw) as ProjectData);
  } catch {
    return null;
  }
}

export function loadActiveProject(): ProjectData | null {
  return loadProjectById(getActiveProjectId());
}

/** Ensambla un ProjectData completo a partir de un snapshot del editor. */
export function buildProjectData(
  snapshot: Omit<ProjectData, "version" | "savedAt" | "name">,
  name: string
): ProjectData {
  return {
    ...snapshot,
    name,
    version: CURRENT_VERSION,
    savedAt: new Date().toISOString(),
  };
}

export function saveActiveProject(
  data: Omit<ProjectData, "version" | "savedAt" | "name">
): void {
  const index = ensureIndex();
  const entry = index.projects.find((p) => p.id === index.activeProjectId);
  if (!entry) return;
  const projectData: ProjectData = {
    ...data,
    name: entry.name,
    version: CURRENT_VERSION,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(getProjectStorageKey(entry.id), JSON.stringify(projectData));
  writeIndex({
    ...index,
    projects: index.projects.map((p) =>
      p.id === entry.id ? { ...p, updatedAt: projectData.savedAt } : p
    ),
  });
}

// ==================== Import / Export ====================

const EXPORT_FORMAT = "planos-project";

export interface ProjectExport {
  format: string;
  version: number;
  name: string;
  exportedAt: string;
  data: ProjectData;
}

export function serializeProjectExport(data: ProjectData): ProjectExport {
  return {
    format: EXPORT_FORMAT,
    version: CURRENT_VERSION,
    name: data.name,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export type ProjectImportResult =
  | { ok: true; project: ProjectData }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTerrainShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.width === "number" &&
    typeof value.height === "number" &&
    typeof value.color === "string" &&
    (typeof value.backgroundImage === "undefined" || typeof value.backgroundImage === "string") &&
    (value.front === "top" || value.front === "bottom" || value.front === "left" || value.front === "right") &&
    typeof value.northAngle === "number"
  );
}

function isSunSettingsShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.enabled !== "boolean") return false;
  if (typeof value.date !== "string") return false;
  if (typeof value.time !== "number") return false;
  if (typeof value.floorHeight !== "number") return false;
  if (!isRecord(value.location)) return false;
  const loc = value.location;
  return (
    typeof loc.latitude === "number" &&
    typeof loc.longitude === "number" &&
    typeof loc.timezone === "string"
  );
}

export function isProjectDataShape(value: unknown): value is ProjectData {
  if (!isRecord(value)) return false;
  return (
    typeof value.version === "number" &&
    typeof value.name === "string" &&
    typeof value.savedAt === "string" &&
    isTerrainShape(value.terrain) &&
    Array.isArray(value.floors) &&
    typeof value.activeFloorId === "string" &&
    isSunSettingsShape(value.sunSettings) &&
    (value.fixtures === undefined || Array.isArray(value.fixtures)) &&
    (value.walls === undefined || Array.isArray(value.walls)) &&
    (value.structural === undefined || Array.isArray(value.structural))
  );
}

/** Valida un snapshot importado sin escribir nada (puro). */
export function parseProjectImport(raw: string): ProjectImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "El archivo no es un JSON válido" };
  }
  if (!isRecord(parsed)) {
    return { ok: false, error: "El archivo no contiene un proyecto" };
  }
  if (parsed.format !== EXPORT_FORMAT) {
    return { ok: false, error: "El archivo no es un proyecto de Planos" };
  }
  if (!isProjectDataShape(parsed.data)) {
    return { ok: false, error: "El proyecto tiene un formato no reconocido" };
  }
  return { ok: true, project: migrateProjectData(parsed.data) };
}

/** Importa un snapshot como proyecto nuevo y lo activa. */
export function importProjectJSON(raw: string): ProjectImportResult {
  const result = parseProjectImport(raw);
  if (!result.ok) return result;

  const index = ensureIndex();
  const id = generateId();
  const now = new Date().toISOString();
  const entry: ProjectIndexEntry = { id, name: result.project.name, createdAt: now, updatedAt: now };
  localStorage.setItem(
    getProjectStorageKey(id),
    JSON.stringify({ ...result.project, savedAt: now })
  );
  writeIndex({ projects: [...index.projects, entry], activeProjectId: id });
  return { ok: true, project: { ...result.project, savedAt: now } };
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "plano"
  );
}

/** Descarga el proyecto activo como JSON (solo navegador). */
export function downloadProjectJSON(data: ProjectData, filename?: string): void {
  const blob = new Blob([JSON.stringify(serializeProjectExport(data), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `${slugify(data.name)}.planos.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==================== API legada ====================

// Cargar proyecto legado desde la clave de un solo proyecto
export function loadProject(): ProjectData | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as ProjectData;

    // Migración v1 → v2: northAt → northAngle y sunSettings
    if (data.version < 2) {
      const rawTerrain = data.terrain as unknown as Record<string, unknown>;
      if (rawTerrain.northAt && !("northAngle" in rawTerrain)) {
        const map: Record<string, number> = { top: 0, right: 90, bottom: 180, left: 270 };
        rawTerrain.northAngle = map[rawTerrain.northAt as string] ?? 0;
        delete rawTerrain.northAt;
        data.terrain = rawTerrain as unknown as Terrain;
      } else if (!("northAngle" in rawTerrain)) {
        rawTerrain.northAngle = 0;
        data.terrain = rawTerrain as unknown as Terrain;
      }
      if (!data.sunSettings) {
        data.sunSettings = { ...DEFAULT_SUN_SETTINGS };
      }
    }

    // Migración v2 → v3: fixtures legados sin floorId → primera planta
    return migrateProjectData(data);
  } catch {
    return null;
  }
}

// Verificar si hay proyecto legado guardado
export function hasSavedProject(): boolean {
  return localStorage.getItem(LEGACY_STORAGE_KEY) !== null;
}
