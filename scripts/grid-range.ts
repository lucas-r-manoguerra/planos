/**
 * Script ad-hoc para verificar lib/grid.ts (regla 08 — lógica pura).
 *
 * Uso: bunx tsx scripts/grid-range.ts
 */
import {
  getWorldViewport,
  getVisibleGridRange,
  MIN_GRID_SPACING_PX,
} from "../src/lib/grid";

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

console.log("getWorldViewport");
check(
  "identidad (sin pan, zoom 1)",
  getWorldViewport(800, 600, 0, 0, 1),
  { minX: 0, minY: 0, maxX: 800, maxY: 600 }
);
check(
  "con pan y zoom",
  getWorldViewport(800, 600, 100, 50, 2),
  { minX: -50, minY: -25, maxX: 350, maxY: 275 }
);
check(
  "pan negativo",
  getWorldViewport(800, 600, -200, -100, 1),
  { minX: 200, minY: 100, maxX: 1000, maxY: 700 }
);

console.log("getVisibleGridRange");
check(
  "rango alineado",
  getVisibleGridRange(0, 1000, 100, 1),
  { start: 0, end: 1000, count: 11 }
);
check(
  "rango con negativos",
  getVisibleGridRange(-250, 250, 100, 1),
  { start: -300, end: 300, count: 7 }
);
check(
  "rango no alineado",
  getVisibleGridRange(37, 912, 100, 1),
  { start: 0, end: 1000, count: 11 }
);
check(
  "culling por zoom bajo (5px < 8px)",
  getVisibleGridRange(0, 10000, 100, 0.05),
  { start: 0, end: 0, count: 0 }
);
check(
  "frontera exacta de 8px sí renderiza",
  getVisibleGridRange(0, 1000, 100, MIN_GRID_SPACING_PX / 100),
  { start: 0, end: 1000, count: 11 }
);
check(
  "gridSize 0 no renderiza",
  getVisibleGridRange(0, 1000, 0, 1),
  { start: 0, end: 0, count: 0 }
);
check(
  "gridSize negativo no renderiza",
  getVisibleGridRange(0, 1000, -50, 1),
  { start: 0, end: 0, count: 0 }
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll checks passed");
