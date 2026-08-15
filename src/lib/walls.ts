/**
 * Lógica pura de paredes: cálculo de segmentos y cascada de aberturas.
 *
 * Unidad: centímetros (cm), mismo sistema que el resto del editor.
 * No importa stores ni componentes: recibe los valores por parámetro.
 */

import { Fixture, Room } from "@/types/plan";

export type WallSide = NonNullable<Fixture["wallSide"]>;

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
