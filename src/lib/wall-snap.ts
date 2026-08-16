/**
 * Snapping de paredes (S2): puntos de dibujo/edición y detección de la
 * pared más cercana para colocar aberturas.
 *
 * Unidad: centímetros (cm). Puro: no importa stores ni componentes
 * (regla 01) — solo tipos y otras utilidades de lib/.
 *
 * Reglas (spec wall-drawing-3, fixtures-management-4):
 * - snapWallPoint: esquinas de habitaciones con prioridad sobre extremos
 *   de paredes. Comparación estricta: dist === threshold NO hace snap
 *   (paridad con clampPosition).
 * - findNearestWallEntity: proyección del punto sobre la línea central
 *   de cada pared con t clampado a [0,1]; offset = t * largo de la pared.
 *   Reemplaza a findNearestWall de lib/utils (que era room-based).
 */

import { Point, Room, Wall } from "@/types/plan";
import { SNAP_THRESHOLD } from "@/lib/constants";
import { clamp } from "@/lib/utils";
import { wallAlongStart, wallLength } from "@/lib/wall-utils";

/** Umbral por defecto para colocar aberturas (paridad con findNearestWall) */
const WALL_ENTITY_THRESHOLD = 15;

/** Hit de findNearestWallEntity: pared + punto sobre su línea central */
export interface WallEntityHit {
  wall: Wall;
  /** Punto sobre la línea central (proyección clampada) */
  x: number;
  y: number;
  /** Desplazamiento a lo largo de la pared (0..wallLength) */
  offset: number;
}

/**
 * Snap de un punto durante dibujo/edición de paredes.
 * Prioridad: esquinas de habitaciones (ganan aunque un extremo de pared
 * esté más cerca); luego extremos de paredes; si nada cae dentro del
 * umbral, devuelve el punto original sin cambios.
 */
export function snapWallPoint(
  p: Point,
  rooms: Room[],
  walls: Wall[],
  threshold: number = SNAP_THRESHOLD
): Point {
  // 1) Esquinas de habitaciones (prioridad)
  let bestCorner: Point | null = null;
  let bestCornerDist = threshold; // estricto: dist === threshold no snap
  for (const room of rooms) {
    const corners: Point[] = [
      { x: room.x, y: room.y },
      { x: room.x + room.width, y: room.y },
      { x: room.x, y: room.y + room.height },
      { x: room.x + room.width, y: room.y + room.height },
    ];
    for (const corner of corners) {
      const dist = Math.hypot(corner.x - p.x, corner.y - p.y);
      if (dist < bestCornerDist) {
        bestCornerDist = dist;
        bestCorner = corner;
      }
    }
  }
  if (bestCorner) return bestCorner;

  // 2) Extremos de paredes
  let bestEnd: Point | null = null;
  let bestEndDist = threshold;
  for (const wall of walls) {
    const ends: Point[] = [
      { x: wall.x1, y: wall.y1 },
      { x: wall.x2, y: wall.y2 },
    ];
    for (const end of ends) {
      const dist = Math.hypot(end.x - p.x, end.y - p.y);
      if (dist < bestEndDist) {
        bestEndDist = dist;
        bestEnd = end;
      }
    }
  }
  if (bestEnd) return bestEnd;

  return { x: p.x, y: p.y };
}

/**
 * Snap direccional para el EXTREMO de un trazo de pared nueva (S2 fix).
 *
 * Mismo contrato que snapWallPoint (esquinas con prioridad, comparación
 * estricta) pero respeta el eje dominante del trazo para que el snap no
 * colapse la pared a un segmento perpendicular:
 *
 * - Se calcula el eje dominante a partir del inicio del trazo (ya snapeado).
 * - Las esquinas de habitaciones y los extremos de paredes que COMPARTEN la
 *   coordenada del eje dominante con el inicio se descartan: snapear ahí
 *   produciría una pared vertical/horizontal de longitud ~0.
 * - Además, un trazo horizontal ignora los extremos de paredes verticales
 *   (y viceversa), para que una pared perpendicular cercana no "capture" el
 *   trazo y lo desvíe de su dirección.
 *
 * Causa raíz del bug "las paredes solo se extienden en vertical": con el snap
 * completo, el extremo podía caer en un extremo de pared (o esquina) alineado
 * en x con el inicio — p. ej. arrancar de la esquina (300,0) y que el extremo
 * vaya a (300,5) → pared vertical de 5 cm en un trazo horizontal.
 */
export function snapWallPointDirectional(
  p: Point,
  start: Point,
  rooms: Room[],
  walls: Wall[],
  threshold: number = SNAP_THRESHOLD
): Point {
  // Eje dominante del trazo: |dx| >= |dy| → trazo horizontal
  const horizontal = Math.abs(p.x - start.x) >= Math.abs(p.y - start.y);
  const collides = (point: Point): boolean =>
    horizontal ? point.x === start.x : point.y === start.y;

  // 1) Esquinas de habitaciones (prioridad), salvo las que colapsarían el trazo
  let bestCorner: Point | null = null;
  let bestCornerDist = threshold;
  for (const room of rooms) {
    const corners: Point[] = [
      { x: room.x, y: room.y },
      { x: room.x + room.width, y: room.y },
      { x: room.x, y: room.y + room.height },
      { x: room.x + room.width, y: room.y + room.height },
    ];
    for (const corner of corners) {
      if (collides(corner)) continue;
      const dist = Math.hypot(corner.x - p.x, corner.y - p.y);
      if (dist < bestCornerDist) {
        bestCornerDist = dist;
        bestCorner = corner;
      }
    }
  }
  if (bestCorner) return bestCorner;

  // 2) Extremos de paredes de la MISMA orientación que el trazo (las paredes
  //    diagonales participan en ambos casos) y que no colapsen el trazo.
  let bestEnd: Point | null = null;
  let bestEndDist = threshold;
  for (const wall of walls) {
    const wallHorizontal = wall.y1 === wall.y2;
    const wallVertical = wall.x1 === wall.x2;
    if (wallHorizontal && !horizontal) continue;
    if (wallVertical && horizontal) continue;
    const ends: Point[] = [
      { x: wall.x1, y: wall.y1 },
      { x: wall.x2, y: wall.y2 },
    ];
    for (const end of ends) {
      if (collides(end)) continue;
      const dist = Math.hypot(end.x - p.x, end.y - p.y);
      if (dist < bestEndDist) {
        bestEndDist = dist;
        bestEnd = end;
      }
    }
  }
  if (bestEnd) return bestEnd;

  return { x: p.x, y: p.y };
}

/**
 * Pared más cercana a un punto, sobre su línea central (proyección).
 * Devuelve null si ninguna pared está dentro del umbral. La abertura se
 * ancla a la pared ganadora: wallId = wall.id, wallOffset = offset.
 */
export function findNearestWallEntity(
  p: Point,
  walls: Wall[],
  threshold: number = WALL_ENTITY_THRESHOLD
): WallEntityHit | null {
  let best: WallEntityHit | null = null;
  let bestDist = threshold; // estricto: dist === threshold no ancla

  for (const wall of walls) {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq <= 0) continue; // pared degenerada (longitud cero)

    const t = clamp(
      ((p.x - wall.x1) * dx + (p.y - wall.y1) * dy) / lenSq,
      0,
      1
    );
    const cx = wall.x1 + t * dx;
    const cy = wall.y1 + t * dy;
    const dist = Math.hypot(p.x - cx, p.y - cy);
    if (dist < bestDist) {
      bestDist = dist;
      // Offset desde el inicio geométrico de la pared (wallAlongStart),
      // consistente con placeOnWall / reanchorOpenings (semántica wallOffset)
      const along = wall.y1 === wall.y2 ? cx : cy;
      best = {
        wall,
        x: cx,
        y: cy,
        offset: clamp(along - wallAlongStart(wall), 0, wallLength(wall)),
      };
    }
  }

  return best;
}
