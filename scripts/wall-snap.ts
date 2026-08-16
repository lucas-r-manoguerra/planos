/**
 * Verificación ad-hoc del snapping de paredes (S2, regla 08 — lógica pura).
 *
 * Uso: bunx tsx scripts/wall-snap.ts
 * (Los casos profundos viven en tests/wall-snap.test.ts con vitest;
 *  esto es el smoke rápido — también cubre el historial de paredes.)
 */
import { snapWallPoint, findNearestWallEntity } from "../src/lib/wall-snap";
import { Room, RoomType, Wall } from "../src/types/plan";

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

function wall(partial: Partial<Wall> = {}): Wall {
  return {
    id: "w1",
    floorId: "f1",
    x1: 0,
    y1: 5,
    x2: 300,
    y2: 5,
    thickness: 10,
    ...partial,
  };
}

console.log("wall-snap (S2)");

// --- snapWallPoint: esquina de habitación ---
const room = makeRoom({ id: "r1", x: 100, y: 100, width: 200, height: 150 });
check("snapWallPoint: esquina de habitación", snapWallPoint({ x: 98, y: 102 }, [room], []), { x: 100, y: 100 });

// --- snapWallPoint: extremo de pared ---
const w = wall({ id: "w1", x1: 0, y1: 0, x2: 100, y2: 0 });
check("snapWallPoint: extremo de pared", snapWallPoint({ x: 102, y: 3 }, [], [w]), { x: 100, y: 0 });

// --- snapWallPoint: esquina gana sobre extremo más cercano ---
const w2 = wall({ id: "w2", x1: 101.5, y1: 98.5, x2: 300, y2: 98.5 });
check("snapWallPoint: esquina con prioridad sobre extremo", snapWallPoint({ x: 101, y: 99 }, [room], [w2]), { x: 100, y: 100 });

// --- snapWallPoint: dist === umbral → sin snap (estricto) ---
const room2 = makeRoom({ id: "r2", x: 0, y: 0, width: 100, height: 100 });
check("snapWallPoint: dist == umbral no hace snap", snapWallPoint({ x: 125, y: 25 }, [room2], []), { x: 125, y: 25 });

// --- findNearestWallEntity: proyección + offset ---
const hit = findNearestWallEntity({ x: 120, y: 0 }, [wall()]);
check("findNearestWallEntity: proyección sobre línea central", hit && { wallId: hit.wall.id, x: hit.x, y: hit.y, offset: hit.offset }, { wallId: "w1", x: 120, y: 5, offset: 120 });

// --- findNearestWallEntity: clamp más allá del extremo ---
const beyond = findNearestWallEntity({ x: 305, y: 5 }, [wall()]);
check("findNearestWallEntity: clamp al extremo", beyond && { x: beyond.x, y: beyond.y, offset: beyond.offset }, { x: 300, y: 5, offset: 300 });

// --- findNearestWallEntity: de dos paredes gana la más cercana ---
const near = wall({ id: "near", y1: 5, y2: 5 });
const far = wall({ id: "far", y1: 50, y2: 50 });
const winner = findNearestWallEntity({ x: 100, y: 12 }, [far, near]);
check("findNearestWallEntity: gana la más cercana", winner && winner.wall.id, "near");

// --- findNearestWallEntity: fuera del umbral → null ---
check("findNearestWallEntity: fuera del umbral → null", findNearestWallEntity({ x: 100, y: 100 }, [wall()]), null);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed");
