/**
 * Fusión de paredes libres colineales (spec wall-drawing-7, slice P2).
 *
 * `addWall` llama a `tryMergeCollinearWalls` con la pared nueva ANTES de
 * insertarla. Si existe una pared que cumple TODOS los predicados (D5):
 *   - libre (sin `roomId`), mismo piso, espesor a ≤ EPS,
 *   - casi colineal (dot ≥ 1−1e-3, direcciones sin signo) y sobre la misma
 *     línea (distancia a la línea ≤ EPS),
 *   - contigua o solapada en el eje compartido (gap ≤ EPS; el extremo
 *     compartido cuenta),
 * devuelve el array con la pared absorbida reemplazada por UNA pared nueva
 * (id fresco, spanning la unión). Si no, devuelve `null` (append en el store).
 * Una sola fusión por llamada: fixpoint/cascade fuera de alcance (D4).
 */
import { Wall } from "@/types/plan";
import { generateId } from "@/lib/utils";
import { EPS } from "@/lib/walls";

/** Umbral de colinealidad: dot ≥ 1−1e-3 (D5) */
const COLLINEAR_DOT = 1 - 1e-3;

interface Direction {
  ux: number;
  uy: number;
  len: number;
}

/** Vector unitario de dirección; null si el segmento es degenerado (≤ EPS) */
function unitDirection(x1: number, y1: number, x2: number, y2: number): Direction | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len <= EPS) return null;
  return { ux: dx / len, uy: dy / len, len };
}

/** Distancia perpendicular de un punto a la línea (x1,y1) + t·(ux,uy) */
function distanceToLine(
  px: number,
  py: number,
  x1: number,
  y1: number,
  ux: number,
  uy: number
): number {
  return Math.abs((px - x1) * uy - (py - y1) * ux);
}

export function tryMergeCollinearWalls(walls: Wall[], newWall: Wall): Wall[] | null {
  // La pared entrante debe ser libre (wd-7)
  if (newWall.roomId) return null;

  const n = unitDirection(newWall.x1, newWall.y1, newWall.x2, newWall.y2);
  if (!n) return null;

  for (const wall of walls) {
    // Las paredes derivadas de habitaciones jamás se fusionan (wd-7)
    if (wall.roomId) continue;
    if (wall.floorId !== newWall.floorId) continue;
    if (Math.abs(wall.thickness - newWall.thickness) > EPS) continue;

    const u = unitDirection(wall.x1, wall.y1, wall.x2, wall.y2);
    if (!u) continue;

    // Misma orientación (undirected: dot en valor absoluto)
    const dot = Math.abs(u.ux * n.ux + u.uy * n.uy);
    if (dot < COLLINEAR_DOT) continue;

    // Sobre la misma línea: ambos extremos de la pared nueva a ≤ EPS
    if (distanceToLine(newWall.x1, newWall.y1, wall.x1, wall.y1, u.ux, u.uy) > EPS) continue;
    if (distanceToLine(newWall.x2, newWall.y2, wall.x1, wall.y1, u.ux, u.uy) > EPS) continue;

    // Intervalos sobre el eje compartido (proyección sobre el vector unitario)
    const along = (px: number, py: number) => (px - wall.x1) * u.ux + (py - wall.y1) * u.uy;
    const aLo = 0; // along(wall.x1, wall.y1)
    const aHi = along(wall.x2, wall.y2);
    const b1 = along(newWall.x1, newWall.y1);
    const b2 = along(newWall.x2, newWall.y2);
    const bLo = Math.min(b1, b2);
    const bHi = Math.max(b1, b2);

    // Contiguo o solapado: gap entre intervalos ≤ EPS (extremo compartido cuenta)
    if (Math.max(aLo, bLo) > Math.min(aHi, bHi) + EPS) continue;

    const lo = Math.min(aLo, bLo);
    const hi = Math.max(aHi, bHi);

    // D4: pared nueva = entidad nueva con id fresco; ambas fuentes desaparecen
    const merged: Wall = {
      id: generateId(),
      floorId: wall.floorId,
      x1: wall.x1 + lo * u.ux,
      y1: wall.y1 + lo * u.uy,
      x2: wall.x1 + hi * u.ux,
      y2: wall.y1 + hi * u.uy,
      thickness: wall.thickness,
    };
    return walls.filter((w) => w.id !== wall.id).concat(merged);
  }

  return null;
}
