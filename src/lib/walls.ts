/**
 * Lógica pura de paredes: cálculo de segmentos y cascada de aberturas.
 *
 * Unidad: centímetros (cm), mismo sistema que el resto del editor.
 * No importa stores ni componentes: recibe los valores por parámetro.
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

interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Tolerancia (cm) para considerar dos bordes coincidentes */
const EPS = 1;

/** Lado opuesto (espejo) de una pared */
const MIRROR: Record<WallSide, WallSide> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

/** Segmento de pared de una habitación para un lado dado */
function sideSegment(room: Room, side: WallSide): Seg {
  switch (side) {
    case "top":
      return { x1: room.x, y1: room.y, x2: room.x + room.width, y2: room.y };
    case "bottom":
      return {
        x1: room.x,
        y1: room.y + room.height,
        x2: room.x + room.width,
        y2: room.y + room.height,
      };
    case "left":
      return { x1: room.x, y1: room.y, x2: room.x, y2: room.y + room.height };
    case "right":
      return {
        x1: room.x + room.width,
        y1: room.y,
        x2: room.x + room.width,
        y2: room.y + room.height,
      };
  }
}

/** ¿Dos segmentos de pared son colineales y se superponen? */
function segmentsCoincide(a: Seg, b: Seg): boolean {
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

export interface CascadeResult {
  /** Fixtures resultantes (aberturas reasignadas + el resto intacto) */
  fixtures: Fixture[];
  /** IDs de aberturas reasignadas a otra habitación */
  reassigned: string[];
  /** IDs de aberturas descartadas (sin pared compartida) */
  removedIds: string[];
}

/**
 * Cascada al eliminar una habitación:
 * - Aberturas ancladas a una pared compartida con otra habitación se
 *   reasignan a esa habitación (lado espejo), conservando wallOffset.
 * - Aberturas sin pared compartida se descartan (quedarían flotando).
 */
export function cascadeOpenings(
  removed: Room,
  roomId: string,
  openings: Fixture[],
  remaining: Room[],
): CascadeResult {
  const anchored = openings.filter((f) => f.wallId === roomId);
  if (anchored.length === 0) {
    return { fixtures: openings, reassigned: [], removedIds: [] };
  }

  const anchoredIds = new Set(anchored.map((f) => f.id));
  const result: Fixture[] = [];
  const reassigned: string[] = [];
  const removedIds: string[] = [];

  for (const opening of anchored) {
    const side = opening.wallSide;
    if (!side) {
      // Abertura anclada sin lado definido: no se puede reasignar
      removedIds.push(opening.id);
      continue;
    }
    const removedSeg = sideSegment(removed, side);
    let neighbor: Room | undefined;
    for (const candidate of remaining) {
      if (segmentsCoincide(removedSeg, sideSegment(candidate, MIRROR[side]))) {
        neighbor = candidate;
        break;
      }
    }
    if (!neighbor) {
      removedIds.push(opening.id);
    } else {
      result.push({
        ...opening,
        wallId: neighbor.id,
        wallSide: MIRROR[side],
      });
      reassigned.push(opening.id);
    }
  }

  return {
    fixtures: [...openings.filter((f) => !anchoredIds.has(f.id)), ...result],
    reassigned,
    removedIds,
  };
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
