/**
 * Script ad-hoc para verificar lib/migrate.ts (regla 08 — lógica pura).
 *
 * Uso: bunx tsx scripts/migrate.ts
 */
import { migrateProjectData } from "../src/lib/migrate";
import { Fixture, Floor, Room, RoomType, Wall } from "../src/types/plan";

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

const floorA: Floor = { id: "f1", name: "Planta Baja", level: 0, rooms: [] };
const floorB: Floor = { id: "f2", name: "Planta 1", level: 1, rooms: [] };

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

/** Proyección de paredes sin ids (aleatorios): geometría + origen */
function projWalls(walls: Wall[]) {
  return walls
    .map((w) => ({
      roomId: w.roomId,
      x1: w.x1,
      y1: w.y1,
      x2: w.x2,
      y2: w.y2,
      thickness: w.thickness,
      floorId: w.floorId,
    }))
    .sort((a, b) => a.y1 - b.y1 || a.x1 - b.x1 || a.x2 - b.x2);
}

const room: Room = {
  id: "r1",
  label: "Sala",
  type: RoomType.ESTAR_COMEDOR,
  x: 0,
  y: 0,
  width: 300,
  height: 200,
  wallWidth: 10,
  enclosed: true,
};

console.log("migrateProjectData");
check(
  "fixtures legados sin floorId → primera planta y versión 4",
  migrateProjectData({
    version: 2,
    floors: [floorA, floorB],
    fixtures: [fixture("a"), fixture("b")],
  }),
  {
    version: 4,
    floors: [floorA, floorB],
    fixtures: [fixture("a", "f1"), fixture("b", "f1")],
    walls: [],
  }
);

check(
  "fixtures con floorId se preservan (round-trip)",
  migrateProjectData({
    version: 2,
    floors: [floorA, floorB],
    fixtures: [fixture("a", "f2")],
  }),
  {
    version: 4,
    floors: [floorA, floorB],
    fixtures: [fixture("a", "f2")],
    walls: [],
  }
);

check(
  "v3 migra a v4 (materializa paredes, vacío sin habitaciones)",
  migrateProjectData({
    version: 3,
    floors: [floorA],
    fixtures: [fixture("a", "f1")],
  }),
  {
    version: 4,
    floors: [floorA],
    fixtures: [fixture("a", "f1")],
    walls: [],
  }
);

check(
  "v4 no se modifica (idempotente)",
  migrateProjectData({
    version: 4,
    floors: [floorA],
    fixtures: [fixture("a", "f1")],
    walls: [],
  }),
  {
    version: 4,
    floors: [floorA],
    fixtures: [fixture("a", "f1")],
    walls: [],
  }
);

check(
  "sin fixtures → solo bump de versión + walls, sin clave fixtures",
  migrateProjectData({ version: 2, floors: [floorA] }),
  { version: 4, floors: [floorA], walls: [] }
);

check(
  "sin plantas → fixtures intactos y versión 4",
  migrateProjectData({ version: 2, floors: [], fixtures: [fixture("a")] }),
  { version: 4, floors: [], fixtures: [fixture("a")], walls: [] }
);

check(
  "habitación encerrada → 4 paredes materializadas (líneas centrales)",
  projWalls(
    migrateProjectData({
      version: 3,
      floors: [{ ...floorA, rooms: [room] }],
    }).walls ?? []
  ),
  [
    { roomId: "r1", x1: 5, y1: 0, x2: 5, y2: 200, thickness: 10, floorId: "f1" },
    { roomId: "r1", x1: 295, y1: 0, x2: 295, y2: 200, thickness: 10, floorId: "f1" },
    { roomId: "r1", x1: 0, y1: 5, x2: 300, y2: 5, thickness: 10, floorId: "f1" },
    { roomId: "r1", x1: 0, y1: 195, x2: 300, y2: 195, thickness: 10, floorId: "f1" },
  ]
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed");
