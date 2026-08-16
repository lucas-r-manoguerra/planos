/**
 * Snapping de paredes libres al borde del terreno (wall-drawing-8):
 * magnetismo de dibujo, movimiento y resize contra el límite del terreno.
 *
 * Unidad: centímetros (cm). Puro: no importa stores ni componentes
 * (regla 01) — solo tipos y otras utilidades de lib/.
 *
 * Reglas (spec wall-drawing-8, design D1/D3/D5/D6):
 * - De-punta: trazo/pared perpendicular a un borde con el extremo a
 *   distancia < SNAP_THRESHOLD del borde → el extremo se ancla al borde.
 * - Paralelo: trazo/pared paralelo a un borde con la línea central a
 *   distancia < SNAP_THRESHOLD de la posición de snap → la línea central
 *   queda en `borde ∓ thickness/2` (banda DENTRO, cara exterior en el borde).
 * - Ambos ejes pueden disparar de forma independiente (esquina).
 * - El snap se resuelve DESPUÉS del snap de punto/ángulo (nunca los
 *   sobreescribe) y ANTES del pointer crudo (wall-drawing-8). Nunca clamp:
 *   geometría más allá del umbral queda intacta (paredes fuera del terreno
 *   permitidas). Bordes axis-aligned en espacio mundo (y=0, y=height, x=0,
 *   x=width); `northAngle` es solo display (no afecta el snap).
 * - Umbral estricto `<` (24.9 snaps, 25.0 no — paridad con snapWallPoint).
 * - Guardas degeneradas (D6): trazo de longitud ≤ 0 → sin cambios; un lock
 *   que colapsaría el trazo a ≤ 0 en un eje → se descarta ese eje; locks de
 *   delta cero son no-ops (ya en posición → intacto).
 * - MOVE clasifica por igualdad EXACTA de ejes (y1===y2 horizontal,
 *   x1===x2 vertical); diagonal o degenerada → intacta (D1).
 */

import { Point, Room, Terrain, Wall } from "@/types/plan";
import { SNAP_THRESHOLD } from "@/lib/constants";
import { DEFAULT_WALL_THICKNESS } from "@/lib/wall-utils";
import { snapWallPoint } from "@/lib/wall-snap";

/** Tolerancia angular para clasificar paralelo/de-punta (grados, estricto <) */
export const TERRAIN_ANGLE_TOLERANCE = 4;

/**
 * Distancia circular entre dos ángulos no dirigidos, en [0, 180).
 * Trata 0° y 180° como el mismo ángulo (línea ~179.4° ≈ ~0.6° de 0°).
 */
export function angleDist(a: number, b: number): number {
  const diff = Math.abs(a - b) % 180;
  return Math.min(diff, 180 - diff);
}

/**
 * Lock más cercano entre deltas candidatos, con umbral ESTRICTO `<`:
 * devuelve el delta de menor |delta|; si ninguno cae dentro del umbral,
 * null. Empate → el primero del array (paridad con snapWallPoint).
 */
export function pickNearestLock(
  deltas: readonly number[],
  threshold: number
): number | null {
  let best: number | null = null;
  let bestAbs = threshold; // estricto: delta === threshold no lock
  for (const delta of deltas) {
    const abs = Math.abs(delta);
    if (abs < bestAbs) {
      bestAbs = abs;
      best = delta;
    }
  }
  return best;
}

/**
 * Ángulo no dirigido del trazo start→p en grados, [0, 180) — mismo patrón
 * que wallAngleDeg pero privado: terrain-snap NO importa wall-angle-snap
 * (wall-angle-snap importará terrain-snap en la fase de chain, U2).
 */
function strokeAngleDeg(p: Point, start: Point): number {
  const dx = p.x - start.x;
  const dy = p.y - start.y;
  return ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 180;
}

/**
 * Snap del EXTREMO de un trazo (draw/resize) contra el terreno.
 *
 * - De-punta (trazo dentro de 4° de la normal al borde): el extremo se
 *   ancla al borde; la coordenada del otro eje se conserva.
 * - Paralelo (trazo dentro de 4° de la dirección del borde): la línea
 *   central va a `borde ∓ thickness/2` (banda adentro).
 * - Ambos ejes evalúan de forma independiente → esquina = ambos locks.
 *
 * Devuelve el mismo punto `p` cuando no hay lock (o es no-op) — el caller
 * compara el resultado contra el pointer crudo para detectar snap.
 */
export function snapWallEndToTerrain(
  p: Point,
  start: Point,
  terrain: Terrain,
  thickness: number = DEFAULT_WALL_THICKNESS,
  threshold: number = SNAP_THRESHOLD
): Point {
  const dx = p.x - start.x;
  const dy = p.y - start.y;
  if (Math.hypot(dx, dy) <= 0) return p; // trazo degenerado (D6)

  const angle = strokeAngleDeg(p, start);
  const half = thickness / 2;
  const { width, height } = terrain;

  // Eje Y (bordes horizontales: y=0 top, y=height bottom)
  let yLock: number | null = null;
  if (angleDist(angle, 90) < TERRAIN_ANGLE_TOLERANCE) {
    // De-punta: el extremo ancla al borde (la normal al borde horizontal)
    yLock = pickNearestLock([-p.y, height - p.y], threshold);
    if (yLock !== null && p.y + yLock === start.y) yLock = null; // colapso
  } else if (angleDist(angle, 0) < TERRAIN_ANGLE_TOLERANCE) {
    // Paralelo: línea central a borde ∓ t/2 (banda adentro)
    yLock = pickNearestLock([half - p.y, height - half - p.y], threshold);
  }

  // Eje X (bordes verticales: x=0 left, x=width right)
  let xLock: number | null = null;
  if (angleDist(angle, 0) < TERRAIN_ANGLE_TOLERANCE) {
    // De-punta: el extremo ancla al borde
    xLock = pickNearestLock([-p.x, width - p.x], threshold);
    if (xLock !== null && p.x + xLock === start.x) xLock = null; // colapso
  } else if (angleDist(angle, 90) < TERRAIN_ANGLE_TOLERANCE) {
    // Paralelo
    xLock = pickNearestLock([half - p.x, width - half - p.x], threshold);
  }

  const appliedX = xLock ?? 0;
  const appliedY = yLock ?? 0;
  if (appliedX === 0 && appliedY === 0) return p; // sin lock o ya en posición
  return { x: p.x + appliedX, y: p.y + appliedY };
}

/**
 * Snap de una pared completa al moverla (whole-wall lock).
 *
 * Clasifica por igualdad EXACTA de ejes (D1): `y1===y2` → horizontal
 * (lock paralelo en Y a `borde ∓ t/2` + de-punta del extremo más cercano
 * en X); `x1===x2` → vertical (lock paralelo en X + de-punta en Y).
 * Diagonal, degenerada o sin lock → devuelve la MISMA referencia `wall`
 * (el caller compara con `!==` para detectar el lock).
 */
export function snapWallToTerrain(
  wall: Wall,
  terrain: Terrain,
  threshold: number = SNAP_THRESHOLD
): Wall {
  const { width, height } = terrain;
  if (wall.x1 === wall.x2 && wall.y1 === wall.y2) return wall; // degenerada
  const horizontal = wall.y1 === wall.y2;
  const vertical = wall.x1 === wall.x2;
  if (!horizontal && !vertical) return wall; // diagonal (D1)

  const half = wall.thickness / 2;
  let dx: number | null = null;
  let dy: number | null = null;

  if (horizontal) {
    dy = pickNearestLock([half - wall.y1, height - half - wall.y1], threshold);
    dx = pickNearestLock([-wall.x1, width - wall.x2], threshold);
  } else {
    dx = pickNearestLock([half - wall.x1, width - half - wall.x1], threshold);
    dy = pickNearestLock([-wall.y1, height - wall.y2], threshold);
  }

  const appliedX = dx ?? 0;
  const appliedY = dy ?? 0;
  if (appliedX === 0 && appliedY === 0) return wall; // sin lock o no-op
  return {
    ...wall,
    x1: wall.x1 + appliedX,
    y1: wall.y1 + appliedY,
    x2: wall.x2 + appliedX,
    y2: wall.y2 + appliedY,
  };
}

/**
 * Snap del INICIO de un trazo (D5): primero snapWallPoint (esquinas de
 * habitaciones → extremos de paredes, prioridad existente); si el punto NO
 * cambió, las 4 esquinas del terreno `(0,0),(w,0),(0,h),(w,h)` como targets
 * de MENOR prioridad (perímetro). Sin candidato dentro del umbral (estricto
 * `<`) o sin terreno → el punto original.
 */
export function snapWallStart(
  p: Point,
  rooms: Room[],
  walls: Wall[],
  terrain?: Terrain,
  threshold: number = SNAP_THRESHOLD
): Point {
  const point = snapWallPoint(p, rooms, walls, threshold);
  if (point.x !== p.x || point.y !== p.y) return point;
  if (!terrain) return p;

  const corners: Point[] = [
    { x: 0, y: 0 },
    { x: terrain.width, y: 0 },
    { x: 0, y: terrain.height },
    { x: terrain.width, y: terrain.height },
  ];
  let best: Point | null = null;
  let bestDist = threshold; // estricto: dist === threshold no snap
  for (const corner of corners) {
    const dist = Math.hypot(corner.x - p.x, corner.y - p.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = corner;
    }
  }
  return best ?? p;
}
