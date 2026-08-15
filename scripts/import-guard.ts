/**
 * Verificación del guard de importación (parseProjectImport).
 *
 * Uso: bunx tsx scripts/import-guard.ts
 * parseProjectImport es puro: estos checks corren SIN localStorage, de
 * modo que cualquier acceso accidental a storage hace fallar el script.
 */
import {
  parseProjectImport,
  serializeProjectExport,
  type ProjectData,
} from "../src/lib/storage";
import { Fixture, Floor } from "../src/types/plan";

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

// ==================== Fixture válido ====================

const floor: Floor = { id: "f1", name: "Planta Baja", level: 0, rooms: [] };

function fixture(id: string, floorId?: string): Fixture {
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
    ...(floorId ? { floorId } : {}),
  };
}

function validProject(overrides: Partial<ProjectData> = {}): ProjectData {
  return {
    version: 3,
    name: "Casa",
    terrain: { width: 1000, height: 800, color: "#4ade80", front: "bottom", northAngle: 0 },
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
    fixtures: [],
    savedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

console.log("parseProjectImport (guard de importación)");

// --- Rechazos de forma ---
check("JSON malformado", parseProjectImport("{oops").ok, false);
check("JSON no-objeto", parseProjectImport("42").ok, false);
check("formato ajeno", parseProjectImport(JSON.stringify({ format: "otro-app" })).ok, false);
check("sin campo data", parseProjectImport(JSON.stringify({ format: "planos-project" })).ok, false);
check(
  "data no-objeto",
  parseProjectImport(JSON.stringify({ format: "planos-project", data: "x" })).ok,
  false
);

// --- Rechazos de shape ---
// Los payloads inválidos rompen el tipo ProjectData a propósito:
// cast justificado para poder ejercitar el guard (regla 02).
const invalidPayload = (data: Record<string, unknown>) =>
  JSON.stringify({ format: "planos-project", version: 3, data });

check(
  "sin terrain",
  parseProjectImport(
    invalidPayload({ ...(validProject() as unknown as Record<string, unknown>), terrain: undefined })
  ).ok,
  false
);
check(
  "sin floors",
  parseProjectImport(
    invalidPayload({ ...(validProject() as unknown as Record<string, unknown>), floors: undefined })
  ).ok,
  false
);
check(
  "sin activeFloorId",
  parseProjectImport(
    invalidPayload({ ...(validProject() as unknown as Record<string, unknown>), activeFloorId: undefined })
  ).ok,
  false
);
check(
  "ancho de terreno con tipo incorrecto",
  parseProjectImport(
    invalidPayload({
      ...(validProject() as unknown as Record<string, unknown>),
      terrain: { ...validProject().terrain, width: "300" },
    })
  ).ok,
  false
);
check(
  "frente de terreno inválido",
  parseProjectImport(
    invalidPayload({
      ...(validProject() as unknown as Record<string, unknown>),
      terrain: { ...validProject().terrain, front: "diagonal" },
    })
  ).ok,
  false
);
check(
  "sunSettings sin location",
  parseProjectImport(
    invalidPayload({
      ...(validProject() as unknown as Record<string, unknown>),
      sunSettings: { ...validProject().sunSettings, location: undefined },
    })
  ).ok,
  false
);

// --- Aceptaciones + migración ---
const legacyEnvelope = {
  format: "planos-project",
  version: 3,
  data: {
    ...validProject({ version: 2 }),
    fixtures: [fixture("a")], // sin floorId: debe migrar a la primera planta
  },
};
const legacyImport = parseProjectImport(JSON.stringify(legacyEnvelope));
check("proyecto v2 importado", legacyImport.ok, true);
check(
  "fixtures migrados a primera planta",
  legacyImport.ok ? (legacyImport.project.fixtures?.[0]?.floorId ?? null) : null,
  "f1"
);
check("versión migrada a 3", legacyImport.ok ? legacyImport.project.version : null, 3);

// --- Round-trip (export → import) ---
const roundTrip = parseProjectImport(JSON.stringify(serializeProjectExport(validProject())));
check("round-trip ok", roundTrip.ok, true);
check(
  "round-trip: datos idénticos",
  roundTrip.ok ? JSON.stringify(roundTrip.project) : null,
  JSON.stringify(validProject())
);

// --- Pureza: sin localStorage definido, ningún acceso debe ocurrir ---
check("puro: no toca localStorage", typeof (globalThis as { localStorage?: unknown }).localStorage, "undefined");

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed");
