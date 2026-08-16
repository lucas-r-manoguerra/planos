/**
 * Verificación ad-hoc de paredes v4: materializador, colocación y
 * re-anclaje de aberturas (regla 08 — lógica pura).
 *
 * Uso: bunx tsx scripts/walls-v4.ts
 * (Los casos profundos viven en tests/ con vitest; esto es el smoke rápido.)
 */
import { materializeFloorWalls, placeOnWall, reanchorOpenings } from "../src/lib/wall-utils";
import { getRoomWallSegments } from "../src/lib/walls";
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

function makeRoom(partial: Partial<Room> & { id: string }): Room {
  return {
    type: RoomType.DORMITORIO,
    label: "Habitación",
    x: 0,
    y: 0,
    width: 300,
    height: 200,
    color: "#fff",
    snapEnabled: true,
    wallWidth: 10,
    enclosed: true,
    ...partial,
  };
}

function door(id: string, floorId: string): Fixture {
  return {
    id,
    catalogId: "puerta-standard",
    label: "Puerta",
    category: "door",
    x: 100,
    y: 100,
    width: 80,
    height: 10,
    rotation: 0,
    color: "#fff",
    props: {},
    floorId,
    wallId: "w1",
    wallSide: "top",
    wallOffset: 100,
  };
}

console.log("paredes v4 (materializar + colocar + re-anclar)");

// --- Materializador: dos habitaciones adyacentes → pared compartida fusionada ---
const a = makeRoom({ id: "a", width: 300, height: 200 });
const b = makeRoom({ id: "b", x: 300, y: 0, width: 200, height: 200 });
const floor: Floor = { id: "f1", name: "PB", level: 0, rooms: [a, b] };
const materialized = materializeFloorWalls(floor);
// La pared compartida cae sobre el borde x=300 y pertenece al dueño (roomId "a")
const shared = materialized.filter((w) => w.x1 === 300 && w.x2 === 300);
check("2 habitaciones → 1 pared compartida fusionada", shared.length, 1);
if (shared[0]) {
  const s = shared[0];
  check("  fusionada en x=300 (línea central), y 0..200", [s.x1, s.x2, s.y1, s.y2], [300, 300, 0, 200]);
  check("  fusionada con espesor 10", s.thickness, 10);
}
check("total: 6 propias (3+3) + 1 fusionada = 7", materialized.length, 7);

// --- Determinismo: misma entrada → mismas geometrías ---
const again = materializeFloorWalls(floor);
check(
  "materializar es determinista (geometría estable, ids distintos)",
  again.every((w, i) => {
    const m = materialized[i];
    return m && [w.x1, w.y1, w.x2, w.y2, w.thickness].join() === [m.x1, m.y1, m.x2, m.y2, m.thickness].join();
  }),
  true
);

// --- Colocación: puerta sobre pared top ---
const topWall: Wall = {
  id: "w1",
  floorId: "f1",
  x1: 0,
  y1: 5,
  x2: 300,
  y2: 5,
  thickness: 10,
};
const placed = placeOnWall(door("d1", "f1"), topWall, 100);
check("placeOnWall: offset 100 → centrada en x=100, sobre línea central", [placed.x, placed.y, placed.rotation], [60, 0, 0]);
check("placeOnWall: wallId/wallOffset actualizados", [placed.wallId, placed.wallOffset], ["w1", 100]);

// --- Re-anclaje: pared eliminada → abertura descartada ---
const reanchored = reanchorOpenings([door("d1", "f1"), door("d2", "f1")], []);
check("reanchorOpenings: sin paredes → se descartan aberturas", reanchored.removedIds.sort(), ["d1", "d2"]);

// --- getRoomWallSegments sigue disponible (usado por scripts/walls.ts) ---
check("getRoomWallSegments intacto", getRoomWallSegments(a, [], true).length, 4);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed");
