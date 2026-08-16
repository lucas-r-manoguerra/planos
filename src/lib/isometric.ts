/**
 * Proyección isométrica (2.5D) del plano — librería pura (regla 01).
 *
 * Convención: dimetric 2:1 (design D6, tareas S3.1). Eje X de pantalla =
 * (x − y), eje Y de pantalla = (x + y) / 2 − z. La spec isometric-view deja
 * el ángulo abierto; se adopta el 2:1 estándar (26.57°, usado en pixel art
 * y juegos) y se documenta aquí.
 *
 * 1 unidad de plano (cm) = 1 unidad proyectada (ISO_UNIT). El Stage de Konva
 * aplica zoom/pan sobre la escena ya proyectada, de modo que la proyección
 * NUNCA se recalcula en pan/zoom (spec isometric-view-3, regla 09).
 *
 * Puro: no importa stores ni componentes; recibe geometría por parámetro y es
 * determinista para entradas idénticas (spec isometric-view-2).
 */

import { Point, Wall } from "@/types/plan";

/** Escala de pantalla: 1 cm de plano → 1 unidad proyectada */
export const ISO_UNIT = 1;

/** Punto proyectado en espacio de pantalla (unidades de canvas) */
export interface IsoPoint {
  sx: number;
  sy: number;
}

/** Polígono proyectado: pares [sx0, sy0, sx1, sy1, ...] (formato Konva Line) */
export type IsoPolygon = number[];

/**
 * Proyecta un punto (x, y, z) en cm a espacio de pantalla isométrico.
 * z es la elevación en cm (0 = piso). Determinista.
 */
export function projectToIsometric(x: number, y: number, z = 0): IsoPoint {
  return {
    sx: (x - y) * ISO_UNIT,
    sy: ((x + y) / 2) * ISO_UNIT - z * ISO_UNIT,
  };
}

/**
 * Inversa de projectToIsometric sobre un plano horizontal fijo (z dado).
 * Útil para round-trip de proyección y futura interacción en iso.
 */
export function unprojectIsometric(sx: number, sy: number, z = 0): Point {
  const s = (sy + z) / ISO_UNIT;
  const h = sx / 2 / ISO_UNIT;
  return { x: h + s, y: s - h };
}

/**
 * Proyecta un rectángulo plano (ancho × alto en cm) a altura z.
 * Vértices en orden: (x,y), (x+w,y), (x+w,y+h), (x,y+h).
 */
export function isoRect(
  x: number,
  y: number,
  width: number,
  height: number,
  z = 0
): IsoPolygon {
  const a = projectToIsometric(x, y, z);
  const b = projectToIsometric(x + width, y, z);
  const c = projectToIsometric(x + width, y + height, z);
  const d = projectToIsometric(x, y + height, z);
  return [a.sx, a.sy, b.sx, b.sy, c.sx, c.sy, d.sx, d.sy];
}

/** Caras proyectadas del prisma de una pared extruida */
export interface IsoWallFaces {
  /** Tapa superior del prisma (z = height) */
  top: IsoPolygon;
  /** Cara larga en el lado +normal (n = (−dy, dx) de la dirección) */
  sideA: IsoPolygon;
  /** Cara larga en el lado −normal */
  sideB: IsoPolygon;
  /** Profundidad para orden de pintado: sy del centro de la línea en z = 0 */
  depth: number;
}

/**
 * Caras de una pared extruida: banda de `thickness` alrededor de la línea
 * central, desde z = 0 hasta z = `height`. Devuelve null si la pared es
 * degenerada (longitud 0 — no hay dirección).
 */
export function isoWallFaces(
  wall: Wall,
  height: number
): IsoWallFaces | null {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;

  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;
  const half = wall.thickness / 2;

  // Esquinas de la banda en el piso (z = 0): A/B = +normal, D/C = −normal
  const ax = wall.x1 + nx * half;
  const ay = wall.y1 + ny * half;
  const bx = wall.x2 + nx * half;
  const by = wall.y2 + ny * half;
  const cx = wall.x2 - nx * half;
  const cy = wall.y2 - ny * half;
  const dxd = wall.x1 - nx * half;
  const dyd = wall.y1 - ny * half;

  const a0 = projectToIsometric(ax, ay, 0);
  const b0 = projectToIsometric(bx, by, 0);
  const c0 = projectToIsometric(cx, cy, 0);
  const d0 = projectToIsometric(dxd, dyd, 0);
  const ah = projectToIsometric(ax, ay, height);
  const bh = projectToIsometric(bx, by, height);
  const ch = projectToIsometric(cx, cy, height);
  const dh = projectToIsometric(dxd, dyd, height);

  return {
    top: [ah.sx, ah.sy, bh.sx, bh.sy, ch.sx, ch.sy, dh.sx, dh.sy],
    sideA: [a0.sx, a0.sy, b0.sx, b0.sy, bh.sx, bh.sy, ah.sx, ah.sy],
    sideB: [d0.sx, d0.sy, c0.sx, c0.sy, ch.sx, ch.sy, dh.sx, dh.sy],
    depth: projectToIsometric(
      (wall.x1 + wall.x2) / 2,
      (wall.y1 + wall.y2) / 2,
      0
    ).sy,
  };
}

/**
 * Abertura anclada a una pared (puerta/ventana): rectángulo vertical sobre la
 * cara +normal de la pared, en `offset` cm a lo largo de la línea central,
 * `width` cm de ancho y `height` cm de alto desde z = `zStart`. El offset se
 * clampa a [0, largo]; el ancho al extremo de la pared. Devuelve null si la
 * pared es degenerada.
 */
export function isoOpeningQuad(
  wall: Wall,
  offset: number,
  width: number,
  height: number,
  zStart = 0
): IsoPolygon | null {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;

  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;
  const half = wall.thickness / 2;

  const start = Math.min(Math.max(offset, 0), length);
  const end = Math.min(start + width, length);

  const ax = wall.x1 + nx * half;
  const ay = wall.y1 + ny * half;
  const p0 = { x: ax + ux * start, y: ay + uy * start };
  const p1 = { x: ax + ux * end, y: ay + uy * end };
  const p0h = projectToIsometric(p0.x, p0.y, zStart);
  const p1h = projectToIsometric(p1.x, p1.y, zStart);
  const p0t = projectToIsometric(p0.x, p0.y, zStart + height);
  const p1t = projectToIsometric(p1.x, p1.y, zStart + height);

  return [p0h.sx, p0h.sy, p1h.sx, p1h.sy, p1t.sx, p1t.sy, p0t.sx, p0t.sy];
}
