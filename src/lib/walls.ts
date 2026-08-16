/**
 * Lógica pura de paredes: cálculo de segmentos de habitaciones.
 *
 * Unidad: centímetros (cm), mismo sistema que el resto del editor.
 * No importa stores ni componentes: recibe los valores por parámetro.
 * Los segmentos son bandas LOCALES a la habitación; la conversión a
 * líneas centrales absolutas vive en wall-utils.ts (materialización).
 */

import { Fixture, Room } from "@/types/plan";

export type WallSide = NonNullable<Fixture["wallSide"]>;

export interface WallSegment {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Tamaño del vano: 30% del largo de la pared */
export const GAP_RATIO = 0.3;
/** Vano mínimo (cm) */
export const GAP_MIN = 40;
/** Vano máximo (cm) */
export const GAP_MAX = 250;

/** Segmento de línea (coordenadas absolutas) usado para coincidencia */
export interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Tolerancia (cm) para considerar dos bordes coincidentes */
export const EPS = 1;

/** ¿Dos segmentos de pared son colineales y se superponen? */
export function segmentsCoincide(a: Seg, b: Seg): boolean {
  const horizontal = a.y1 === a.y2 && b.y1 === b.y2;
  const vertical = a.x1 === a.x2 && b.x1 === b.x2;

  if (horizontal && Math.abs(a.y1 - b.y1) <= EPS) {
    // Solape positivo en x: un punto de contacto (esquina) NO cuenta
    const start = Math.max(Math.min(a.x1, a.x2), Math.min(b.x1, b.x2));
    const end = Math.min(Math.max(a.x1, a.x2), Math.max(b.x1, b.x2));
    return start < end;
  }
  if (vertical && Math.abs(a.x1 - b.x1) <= EPS) {
    // Solape positivo en y
    const start = Math.max(Math.min(a.y1, a.y2), Math.min(b.y1, b.y2));
    const end = Math.min(Math.max(a.y1, a.y2), Math.max(b.y1, b.y2));
    return start < end;
  }
  return false;
}

/** Distancia (cm) para considerar dos habitaciones adyacentes */
export const MERGE_THRESHOLD = 5;

/**
 * Detecta paredes compartidas entre dos habitaciones adyacentes y devuelve
 * los segmentos fusionados (bandas absolutas). Dos habitaciones son
 * "adyacentes" si comparten un borde dentro de MERGE_THRESHOLD.
 *
 * V3-exact: la línea central de la pared fusionada cae exactamente sobre el
 * borde de la habitación A (dueña), con espesor = mayor wallWidth.
 */
export function findMergedWalls(roomA: Room, roomB: Room): WallSegment[] {
  const segments: WallSegment[] = [];
  const maxWallWidth = Math.max(roomA.wallWidth ?? 10, roomB.wallWidth ?? 10);

  // Check if rooms share a vertical edge (left/right)
  const aLeft = roomA.x;
  const aRight = roomA.x + roomA.width;
  const bLeft = roomB.x;
  const bRight = roomB.x + roomB.width;

  // A's right edge touches B's left edge
  if (Math.abs(aRight - bLeft) < MERGE_THRESHOLD) {
    // Find overlapping Y range
    const overlapTop = Math.max(roomA.y, roomB.y);
    const overlapBottom = Math.min(roomA.y + roomA.height, roomB.y + roomB.height);
    if (overlapBottom - overlapTop > 0) {
      // Merged wall centered on the shared edge
      segments.push({
        x: aRight - maxWallWidth / 2,
        y: overlapTop,
        width: maxWallWidth,
        height: overlapBottom - overlapTop,
      });
    }
  }

  // B's right edge touches A's left edge
  if (Math.abs(bRight - aLeft) < MERGE_THRESHOLD) {
    const overlapTop = Math.max(roomA.y, roomB.y);
    const overlapBottom = Math.min(roomA.y + roomA.height, roomB.y + roomB.height);
    if (overlapBottom - overlapTop > 0) {
      segments.push({
        x: aLeft - maxWallWidth / 2,
        y: overlapTop,
        width: maxWallWidth,
        height: overlapBottom - overlapTop,
      });
    }
  }

  // Check if rooms share a horizontal edge (top/bottom)
  const aTop = roomA.y;
  const aBottom = roomA.y + roomA.height;
  const bTop = roomB.y;
  const bBottom = roomB.y + roomB.height;

  // A's bottom edge touches B's top edge
  if (Math.abs(aBottom - bTop) < MERGE_THRESHOLD) {
    const overlapLeft = Math.max(roomA.x, roomB.x);
    const overlapRight = Math.min(roomA.x + roomA.width, roomB.x + roomB.width);
    if (overlapRight - overlapLeft > 0) {
      segments.push({
        x: overlapLeft,
        y: aBottom - maxWallWidth / 2,
        width: overlapRight - overlapLeft,
        height: maxWallWidth,
      });
    }
  }

  // B's bottom edge touches A's top edge
  if (Math.abs(bBottom - aTop) < MERGE_THRESHOLD) {
    const overlapLeft = Math.max(roomA.x, roomB.x);
    const overlapRight = Math.min(roomA.x + roomA.width, roomB.x + roomB.width);
    if (overlapRight - overlapLeft > 0) {
      segments.push({
        x: overlapLeft,
        y: aTop - maxWallWidth / 2,
        width: overlapRight - overlapLeft,
        height: maxWallWidth,
      });
    }
  }

  return segments;
}

/**
 * Checks if a wall segment is covered by a merged wall.
 */
export function isCovered(
  wall: WallSegment,
  roomX: number,
  roomY: number,
  merged: WallSegment[]
): boolean {
  const wx = roomX + wall.x;
  const wy = roomY + wall.y;

  for (const m of merged) {
    // Check if the wall center is inside the merged wall
    const wallCenterX = wx + wall.width / 2;
    const wallCenterY = wy + wall.height / 2;

    if (
      wallCenterX >= m.x &&
      wallCenterX <= m.x + m.width &&
      wallCenterY >= m.y &&
      wallCenterY <= m.y + m.height
    ) {
      return true;
    }
  }
  return false;
}

const ALL_SIDES: WallSide[] = ["top", "bottom", "left", "right"];

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * ¿El lado de la habitación está completamente cubierto por una pared
 * fusionada (compartida con una habitación adyacente)?
 */
function sideFullyCovered(
  room: Room,
  side: WallSide,
  merged: WallSegment[]
): boolean {
  for (const m of merged) {
    if (side === "top" || side === "bottom") {
      const wallY = side === "top" ? room.y : room.y + room.height;
      if (m.y <= wallY && wallY <= m.y + m.height) {
        if (
          m.x <= room.x + EPS &&
          m.x + m.width >= room.x + room.width - EPS
        ) {
          return true;
        }
      }
    } else {
      const wallX = side === "left" ? room.x : room.x + room.width;
      if (m.x <= wallX && wallX <= m.x + m.width) {
        if (
          m.y <= room.y + EPS &&
          m.y + m.height >= room.y + room.height - EPS
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Segmentos de pared de una habitación (coordenadas locales, cm).
 *
 * - Habitación encerrada: 4 paredes sólidas.
 * - Habitación abierta (enclosed=false): cada pared libre lleva un vano
 *   central de 30% del largo (clamp 40–250 cm) para puertas/ventanas.
 *   Las paredes compartidas con otra habitación (fusionadas) quedan sólidas.
 *   Si el vano excede el largo de la pared, esa pared queda totalmente abierta.
 */
export function getRoomWallSegments(
  room: Room,
  merged: WallSegment[],
  enclosed: boolean
): WallSegment[] {
  const ww = room.wallWidth ?? 10;
  if (ww <= 0) return [];

  const gapSides: WallSide[] = enclosed
    ? []
    : ALL_SIDES.filter((side) => !sideFullyCovered(room, side, merged));

  const walls: WallSegment[] = [];

  for (const side of ALL_SIDES) {
    if (gapSides.includes(side)) continue;

    // Pared sólida
    switch (side) {
      case "top":
        walls.push({ x: 0, y: 0, width: room.width, height: ww });
        break;
      case "bottom":
        walls.push({ x: 0, y: room.height - ww, width: room.width, height: ww });
        break;
      case "left":
        walls.push({ x: 0, y: 0, width: ww, height: room.height });
        break;
      case "right":
        walls.push({ x: room.width - ww, y: 0, width: ww, height: room.height });
        break;
    }
  }

  for (const side of gapSides) {
    const length = side === "top" || side === "bottom" ? room.width : room.height;
    const gap = Math.min(clamp(length * GAP_RATIO, GAP_MIN, GAP_MAX), length);
    if (gap >= length) continue; // pared totalmente abierta
    const start = (length - gap) / 2;
    const end = start + gap;

    switch (side) {
      case "top":
        walls.push({ x: 0, y: 0, width: start, height: ww });
        walls.push({ x: end, y: 0, width: length - end, height: ww });
        break;
      case "bottom":
        walls.push({ x: 0, y: room.height - ww, width: start, height: ww });
        walls.push({ x: end, y: room.height - ww, width: length - end, height: ww });
        break;
      case "left":
        walls.push({ x: 0, y: 0, width: ww, height: start });
        walls.push({ x: 0, y: end, width: ww, height: length - end });
        break;
      case "right":
        walls.push({ x: room.width - ww, y: 0, width: ww, height: start });
        walls.push({ x: room.width - ww, y: end, width: ww, height: length - end });
        break;
    }
  }

  return walls;
}
