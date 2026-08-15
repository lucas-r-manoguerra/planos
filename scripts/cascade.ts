/**
 * Verificación ad-hoc de cascadeOpenings (src/lib/walls.ts)
 *
 * Uso: bunx tsx scripts/cascade.ts
 * (No hay suite de tests configurada: se verifican casos de borde)
 */

import { cascadeOpenings } from "../src/lib/walls";
import { Fixture, Room, RoomType } from "../src/types/plan";

function check(name: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}\n    esperado: ${e}\n    actual:   ${a}`);
    process.exit(1);
  }
}

const roomA: Room = {
  id: "a",
  type: RoomType.DORMITORIO,
  label: "A",
  x: 0,
  y: 0,
  width: 200,
  height: 200,
  color: "#fff",
  snapEnabled: true,
  wallWidth: 10,
  enclosed: true,
};
const roomB: Room = {
  id: "b",
  type: RoomType.DORMITORIO,
  label: "B",
  x: 0,
  y: 200,
  width: 200,
  height: 200,
  color: "#fff",
  snapEnabled: true,
  wallWidth: 10,
  enclosed: true,
};
const roomC: Room = {
  id: "c",
  type: RoomType.DORMITORIO,
  label: "C",
  x: 200,
  y: 0,
  width: 200,
  height: 200,
  color: "#fff",
  snapEnabled: true,
  wallWidth: 10,
  enclosed: true,
};

const baseFixture: Omit<Fixture, "id" | "catalogId" | "label" | "props"> = {
  category: "door",
  x: 0,
  y: 0,
  width: 80,
  height: 5,
  rotation: 0,
  color: "#000",
};

const doorAB: Fixture = {
  ...baseFixture,
  id: "f1",
  catalogId: "puerta-standard",
  label: "Puerta",
  props: {},
  x: 100,
  y: 199,
  wallId: "a",
  wallSide: "bottom",
  wallOffset: 100,
};

const windowLeft: Fixture = {
  ...baseFixture,
  id: "f2",
  catalogId: "ventana-standard",
  label: "Ventana",
  props: {},
  x: -5,
  y: 100,
  wallId: "a",
  wallSide: "left",
  wallOffset: 100,
};

console.log("cascadeOpenings:");

// 1. Puerta en pared compartida A.bottom ↔ B.top → reasignada a B (lado espejo)
const r1 = cascadeOpenings(roomA, "a", [doorAB, windowLeft], [roomB, roomC]);
check("puerta compartida se reasigna (1 fixture)", r1.fixtures.length, 1);
check("  wallId del vecino", r1.fixtures[0].wallId, "b");
check("  lado espejo (bottom → top)", r1.fixtures[0].wallSide, "top");
check("  offset conservado", r1.fixtures[0].wallOffset, 100);
check("  ventana huérfana descartada", r1.removedIds, ["f2"]);
check("  reassigned", r1.reassigned, ["f1"]);

// 2. Pared vertical: A.right ↔ C.left
const r2 = cascadeOpenings(
  roomA,
  "a",
  [{ ...windowLeft, wallId: "a", wallSide: "right" }],
  [roomB, roomC]
);
check("A.right se reasigna a C.left", r2.fixtures[0].wallId, "c");
check("  lado espejo (right → left)", r2.fixtures[0].wallSide, "left");

// 3. Fixtures no anclados quedan intactos
const r3 = cascadeOpenings(
  roomA,
  "a",
  [doorAB, { ...windowLeft, wallId: undefined, wallSide: undefined }],
  [roomB]
);
check("fixtures no anclados se preservan", r3.fixtures.length, 2);
check("  sin removidos", r3.removedIds.length, 0);

// 4. Sin aberturas ancladas → no toca nada
const r4 = cascadeOpenings(
  roomA,
  "a",
  [{ ...windowLeft, wallId: "b", wallSide: "left" }],
  [roomB]
);
check("sin ancladas no toca nada", r4.fixtures.length, 1);

// 5. Anclada sin lado definido → se descarta
const r5 = cascadeOpenings(
  roomA,
  "a",
  [{ ...doorAB, wallSide: undefined }],
  [roomB]
);
check("anclada sin lado se descarta", r5.removedIds, ["f1"]);

// 6. Sin vecinos → se descarta aunque haya pared libre
const r6 = cascadeOpenings(roomA, "a", [doorAB], []);
check("sin vecinos se descarta", r6.removedIds, ["f1"]);

console.log("\nTodas las verificaciones de cascadeOpenings pasaron.");
