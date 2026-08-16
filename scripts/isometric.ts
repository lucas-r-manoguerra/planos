/**
 * Verificación ad-hoc de la proyección isométrica (S3, regla 08 — lógica pura).
 *
 * Uso: bunx tsx scripts/isometric.ts
 * (Los casos profundos viven en tests/isometric.test.ts con vitest;
 *  esto es el smoke rápido — puntos conocidos, extrusión, round-trip.)
 */
import {
  ISO_UNIT,
  isoOpeningQuad,
  isoRect,
  isoWallFaces,
  projectToIsometric,
  unprojectIsometric,
} from "../src/lib/isometric";
import { Wall } from "../src/types/plan";

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

function checkClose(name: string, actual: number, expected: number, eps = 1e-9) {
  if (Math.abs(actual - expected) <= eps) {
    console.log(`  ok ${name} (${actual})`);
  } else {
    failures += 1;
    console.error(`  FAIL ${name}\n    expected: ${expected}\n    actual:   ${actual}`);
  }
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

console.log("ISO_UNIT:", ISO_UNIT);

// Puntos conocidos del dimetric 2:1 (z=0 y z=280)
check("origin", projectToIsometric(0, 0, 0), { sx: 0, sy: 0 });
check("x=100", projectToIsometric(100, 0, 0), { sx: 100, sy: 50 });
check("y=100", projectToIsometric(0, 100, 0), { sx: -100, sy: 50 });
check("z=280", projectToIsometric(0, 0, 280), { sx: 0, sy: -280 });

// Round-trip (comparación con tolerancia: el dimetric 2:1 tiene error de FP en la inversa)
const rt = projectToIsometric(123.4, 567.8, 280);
const back = unprojectIsometric(rt.sx, rt.sy, 280);
checkClose("round-trip x", back.x, 123.4);
checkClose("round-trip y", back.y, 567.8);

// Losa del terreno 1000x800 a z=0
console.log("terrain slab 1000x800:", JSON.stringify(isoRect(0, 0, 1000, 800, 0)));

// Pared horizontal extruida a 280
const faces = isoWallFaces(wall(), 280);
console.log("wall faces:", JSON.stringify(faces));
check("wall sideA x0", faces!.sideA.slice(0, 2), [-10, 5]);
check("wall top y0", faces!.top.slice(6, 8), [0, -280]);
check("wall depth", faces!.depth, 77.5);

// Degenerada
check("degenerate wall → null", isoWallFaces(wall({ x1: 5, x2: 5 }), 280), null);

// Abertura anclada (puerta de 80 cm a offset 100, alto 200)
const door = isoOpeningQuad(wall(), 100, 80, 200, 0);
console.log("door quad:", JSON.stringify(door));
check("door first corner", door!.slice(0, 2), [90, 55]);
check("door top corner", door!.slice(4, 6), [170, -105]);

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll isometric smoke checks passed.");
