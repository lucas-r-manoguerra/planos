/**
 * Verificación ad-hoc de getRoomWallSegments (src/lib/walls.ts)
 *
 * Uso: bunx tsx scripts/walls.ts
 * (No hay suite de tests configurada: se verifican casos de borde)
 */

import { getRoomWallSegments, WallSegment } from "../src/lib/walls";
import { Room, RoomType } from "../src/types/plan";

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

/** Segmentos de un lado (identificados por posición local + orientación) */
function sideWidths(
  room: Room,
  walls: WallSegment[],
  side: "top" | "bottom" | "left" | "right"
): number[] {
  const ww = room.wallWidth ?? 10;
  const horizontal = (w: WallSegment) => w.height === ww;
  const along = (w: WallSegment) =>
    side === "top" || side === "bottom" ? w.width : w.height;
  return walls
    .filter((w) => {
      switch (side) {
        case "top":
          return horizontal(w) && w.y === 0;
        case "bottom":
          return horizontal(w) && w.y === room.height - ww;
        case "left":
          return !horizontal(w) && w.x === 0;
        case "right":
          return !horizontal(w) && w.x === room.width - ww;
      }
    })
    .map(along)
    .sort((a, b) => a - b);
}

console.log("getRoomWallSegments:");

// 1. Encerrada → 4 paredes sólidas (sin vanos)
const enclosed = makeRoom({ id: "a", enclosed: true });
const w1 = getRoomWallSegments(enclosed, [], true);
check("encerrada → 4 segmentos sólidos", w1.length, 4);
check("  top sólido (300)", sideWidths(enclosed, w1, "top"), [300]);
check("  left sólido (200)", sideWidths(enclosed, w1, "left"), [200]);

// 2. Abierta → 2 segmentos por pared (8 en total) con vano 30% = 90
const open = makeRoom({ id: "b", enclosed: false });
const w2 = getRoomWallSegments(open, [], false);
check("abierta → 8 segmentos", w2.length, 8);
check("  top: vano 90 → [105, 105]", sideWidths(open, w2, "top"), [105, 105]);
check("  left: vano 60 → [70, 70]", sideWidths(open, w2, "left"), [70, 70]);
check("  bottom: vano 90 → [105, 105]", sideWidths(open, w2, "bottom"), [105, 105]);
check("  right: vano 60 → [70, 70]", sideWidths(open, w2, "right"), [70, 70]);

// 3. Clamp inferior (40): pared de 60 → vano 40 → [10, 10]
const short = makeRoom({ id: "c", width: 60, height: 100, enclosed: false });
const w3 = getRoomWallSegments(short, [], false);
check("largo 60 → vano clamp 40 → [10, 10]", sideWidths(short, w3, "top"), [10, 10]);
check("  left (largo 100) → [30, 30]", sideWidths(short, w3, "left"), [30, 30]);

// 4. Clamp superior (250): pared de 1000 → vano 250 → [375, 375]
const long = makeRoom({ id: "d", width: 1000, height: 200, enclosed: false });
const w4 = getRoomWallSegments(long, [], false);
check("largo 1000 → vano clamp 250 → [375, 375]", sideWidths(long, w4, "top"), [375, 375]);

// 5. Pared fusionada (compartida) → sólida, sin vano
const shared = makeRoom({ id: "e", enclosed: false });
const merged: WallSegment[] = [
  { x: 0, y: 200 - 5, width: 300, height: 10 }, // fusionada con B en el lado bottom
];
const w5 = getRoomWallSegments(shared, merged, false);
check("lado fusionado sólido (1 segmento)", w5.filter((s) => s.y === 200 - 10).length, 1);
check("  total 7 segmentos (3 lados con vano)", w5.length, 7);

// 6. Pared más corta que el vano mínimo → totalmente abierta
const tiny = makeRoom({ id: "f", width: 20, height: 200, enclosed: false });
const w6 = getRoomWallSegments(tiny, [], false);
check("pared 20 < vano mín → sin segmentos top", w6.filter((w) => w.y === 0 && w.height === 10).length, 0);
check("  solo left/right (4)", w6.length, 4);

// 7. wallWidth <= 0 → sin paredes
const noWall = makeRoom({ id: "g", wallWidth: 0, enclosed: false });
check("wallWidth 0 → sin segmentos", getRoomWallSegments(noWall, [], false).length, 0);

console.log("\nTodas las verificaciones de getRoomWallSegments pasaron.");
