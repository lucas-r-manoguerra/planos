/**
 * Verificación de la persistencia v3 (multi-proyecto) en memoria.
 *
 * Uso: bunx tsx scripts/storage-v3.ts
 * Ejecuta los flujos CRUD + migración legada contra un localStorage fake.
 */
import {
  createProject,
  deleteProject,
  ensureActiveProject,
  getActiveProjectId,
  importProjectJSON,
  listProjects,
  loadActiveProject,
  loadProjectById,
  parseProjectImport,
  renameProject,
  saveActiveProject,
  serializeProjectExport,
  switchProject,
  type ProjectData,
  type ProjectExport,
} from "../src/lib/storage";
import { buildInitialProjectIndex } from "../src/lib/migrate";
import { DEFAULT_PROJECT_NAME } from "../src/lib/constants";
import { Fixture, Floor } from "../src/types/plan";

// ==================== localStorage en memoria ====================

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, String(value)),
  };
}

const memory = createMemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: memory,
  configurable: true,
  writable: true,
});

const LEGACY_KEY = "planos-project";

function resetStorage() {
  memory.clear();
}

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ok ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${name}\n    expected: ${e}\n    actual:   ${a}`);
  }
}

// ==================== Fixtures ====================

const floor: Floor = { id: "f1", name: "Planta Baja", level: 0, rooms: [] };

function legacyFixture(id: string): Fixture {
  return {
    id,
    catalogId: "mesa",
    label: "Mesa",
    category: "furniture",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    color: "#fff",
    props: {},
  };
}

function legacyProject(name: string): ProjectData {
  return {
    version: 2,
    name,
    terrain: { width: 800, height: 600, color: "#eee", front: "top", northAngle: 0 },
    floors: [floor],
    activeFloorId: "f1",
    sunSettings: {
      enabled: false,
      date: "2026-01-01",
      time: 12,
      location: {
        latitude: -32.05,
        longitude: -59.25,
        timezone: "America/Argentina/Buenos_Aires",
      },
      floorHeight: 280,
    },
    fixtures: [legacyFixture("a")],
    savedAt: "2026-01-01T00:00:00.000Z",
  };
}

// ==================== Checks ====================

console.log("storage v3");

// --- Arranque sin datos ---
resetStorage();
const initial = ensureActiveProject();
check("arranque: proyecto por defecto activo", initial.name, DEFAULT_PROJECT_NAME);
check("arranque: índice con 1 proyecto", listProjects().length, 1);
check("arranque: blob del proyecto activo existe", loadActiveProject() !== null, true);
check("arranque: sin clave legada", memory.getItem(LEGACY_KEY), null);

ensureActiveProject();
check("ensureActiveProject idempotente", listProjects().length, 1);

// --- Migración legada ---
resetStorage();
memory.setItem(LEGACY_KEY, JSON.stringify(legacyProject("Legado")));
const migrated = ensureActiveProject();
check("legado: migrado como proyecto por defecto", migrated.name, DEFAULT_PROJECT_NAME);
check("legado: clave legada intacta", memory.getItem(LEGACY_KEY) !== null, true);
const migratedData = loadActiveProject();
check("legado: datos migrados a v3", migratedData?.version, 3);
check(
  "legado: fixtures reasignados a primera planta",
  migratedData?.fixtures?.[0]?.floorId,
  "f1"
);

// --- buildInitialProjectIndex (puro) ---
const built = buildInitialProjectIndex(legacyProject("L"), "p1");
check("buildInitialProjectIndex: entrada inicial", built.entry.name, DEFAULT_PROJECT_NAME);
check("buildInitialProjectIndex: índice con 1 proyecto", built.index.projects.length, 1);
check("buildInitialProjectIndex: activo correcto", built.index.activeProjectId, "p1");

// --- createProject ---
resetStorage();
ensureActiveProject();
const created = createProject("Casa");
check("create: se agrega y activa", getActiveProjectId(), created.id);
check("create: lista con 2 proyectos", listProjects().length, 2);
const createdData = loadActiveProject();
check("create: blob con terreno por defecto", createdData?.terrain.color, "#4ade80");
check("create: blob con frente por defecto", createdData?.terrain.front, "bottom");
check("create: blob con 1 planta", createdData?.floors.length, 1);
check("create: blob con planta 'Planta Baja'", createdData?.floors[0]?.name, "Planta Baja");
check("create: blob sin fixtures", createdData?.fixtures?.length, 0);

// --- renameProject ---
renameProject(created.id, "Casa Reformada");
check("rename: nombre actualizado", listProjects().find((p) => p.id === created.id)?.name, "Casa Reformada");

// --- saveActiveProject ---
const before = listProjects().find((p) => p.id === created.id)?.updatedAt;
saveActiveProject({
  terrain: { width: 900, height: 700, color: "#aaa", front: "left", northAngle: 90 },
  floors: [floor],
  activeFloorId: "f1",
  sunSettings: legacyProject("x").sunSettings,
  fixtures: [],
});
const saved = loadActiveProject();
check("save: nombre del índice", saved?.name, "Casa Reformada");
check("save: versión 3", saved?.version, 3);
check("save: terreno persistido", saved?.terrain.northAngle, 90);
check("save: savedAt definido", typeof saved?.savedAt, "string");
const after = listProjects().find((p) => p.id === created.id)?.updatedAt;
// Determinista: el índice refleja el savedAt del blob (invariante de storage.ts) y
// nunca retrocede. ISO strings comparan lexicográficamente; el mismo milisegundo
// (updatedAt === before) es válido cuando rename y save corren en el mismo tick.
check(
  "save: updatedAt del índice refleja el savedAt del blob",
  typeof after === "string" && after === saved?.savedAt,
  true
);
check(
  "save: updatedAt del índice no retrocede",
  typeof after === "string" && typeof before === "string" && after >= before,
  true
);

// --- switchProject + loadProjectById ---
resetStorage();
const first = ensureActiveProject();
const second = createProject("Segundo");
switchProject(first.id);
check("switch: vuelve al primero", getActiveProjectId(), first.id);
const firstData = loadProjectById(first.id);
check("switch: loadProjectById carga el proyecto", firstData?.name, DEFAULT_PROJECT_NAME);
check("switch: loadProjectById del inactivo", loadProjectById(second.id)?.name, "Segundo");

// --- deleteProject ---
resetStorage();
const firstProj = ensureActiveProject();
const d1 = createProject("A");
const d2 = createProject("B"); // activo
deleteProject(d1.id);
check("delete: se quita de la lista", listProjects().some((p) => p.id === d1.id), false);
check("delete: quedan 2 proyectos", listProjects().length, 2);
deleteProject(d2.id);
check("delete: al borrar el activo cae al primero", getActiveProjectId(), firstProj.id);
check("delete: queda 1 proyecto", listProjects().length, 1);
deleteProject(firstProj.id);
check("delete: al borrar el último se reinicia", listProjects().length, 1);
check("delete: proyecto por defecto recreado", listProjects()[0]?.name, DEFAULT_PROJECT_NAME);
check("delete: blob por defecto recreado", loadActiveProject() !== null, true);

// --- Export / Import ---
resetStorage();
ensureActiveProject();
saveActiveProject({
  terrain: { width: 500, height: 400, color: "#fff", front: "bottom", northAngle: 0 },
  floors: [floor],
  activeFloorId: "f1",
  sunSettings: legacyProject("x").sunSettings,
  fixtures: [],
});
const exported = serializeProjectExport(loadActiveProject()!);
check("export: formato correcto", exported.format, "planos-project");
const beforeImport = listProjects().length;
const imported = importProjectJSON(JSON.stringify(exported));
check("import: ok", imported.ok, true);
check("import: nuevo proyecto activo", listProjects().length, beforeImport + 1);
check(
  "import: datos idénticos (nombre y terreno)",
  (imported.ok ? imported.project : null)?.terrain.width,
  500
);
check("import: válido también vía parse (puro)", parseProjectImport(JSON.stringify(exported)).ok, true);

const corrupted = JSON.parse(JSON.stringify(exported)) as ProjectExport;
corrupted.data.terrain.width = "ancho" as unknown as number;
check("import: terreno inválido rechazado", importProjectJSON(JSON.stringify(corrupted)).ok, false);
check(
  "import: rechazo no altera el estado",
  listProjects().length,
  beforeImport + 1
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed");
