/**
 * Script ad-hoc para verificar lib/migrate.ts (regla 08 — lógica pura).
 *
 * Uso: bunx tsx scripts/migrate.ts
 */
import { migrateProjectData } from "../src/lib/migrate";
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

console.log("migrateProjectData");
check(
  "fixtures legados sin floorId → primera planta y versión 3",
  migrateProjectData({
    version: 2,
    floors: [floorA, floorB],
    fixtures: [fixture("a"), fixture("b")],
  }),
  {
    version: 3,
    floors: [floorA, floorB],
    fixtures: [fixture("a", "f1"), fixture("b", "f1")],
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
    version: 3,
    floors: [floorA, floorB],
    fixtures: [fixture("a", "f2")],
  }
);

check(
  "v3 no se modifica (idempotente)",
  migrateProjectData({
    version: 3,
    floors: [floorA],
    fixtures: [fixture("a", "f1")],
  }),
  {
    version: 3,
    floors: [floorA],
    fixtures: [fixture("a", "f1")],
  }
);

check(
  "sin fixtures → solo bump de versión, sin clave nueva",
  migrateProjectData({ version: 2, floors: [floorA] }),
  { version: 3, floors: [floorA] }
);

check(
  "sin plantas → fixtures intactos y versión 3",
  migrateProjectData({ version: 2, floors: [], fixtures: [fixture("a")] }),
  { version: 3, floors: [], fixtures: [fixture("a")] }
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed");
