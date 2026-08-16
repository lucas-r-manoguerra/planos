/**
 * Ajuste de la vista del canvas al terreno (S3 fix): cálculo puro de zoom y
 * pan para que el terreno entre completo y centrado en el viewport.
 *
 * Regla 01: librería pura — no importa stores ni componentes. Solo recibe
 * dimensiones y devuelve el fit; el store (canvas.store) lo aplica.
 *
 * Unidad: centímetros (cm) para el terreno; píxeles para el viewport.
 * zoom = min(availW / terrainW, availH / terrainH), clampado a [minZoom,
 * maxZoom]; pan centra el terreno escalado en el viewport.
 */

import { clamp } from "@/lib/utils";

export interface FitResult {
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * Zoom y pan para centrar un terreno de (terrainW × terrainH) cm en un
 * viewport de (viewportW × viewportH) px con un margen `padding` px.
 * Viewports/terrenos degenerados se defienden con mínimo de 1.
 */
export function fitToView(
  terrainW: number,
  terrainH: number,
  viewportW: number,
  viewportH: number,
  minZoom: number,
  maxZoom: number,
  padding: number = 40
): FitResult {
  const availW = Math.max(viewportW - padding * 2, 1);
  const availH = Math.max(viewportH - padding * 2, 1);
  const fit = Math.min(
    availW / Math.max(terrainW, 1),
    availH / Math.max(terrainH, 1)
  );
  const zoom = clamp(fit, minZoom, maxZoom);
  return {
    zoom,
    panX: (viewportW - terrainW * zoom) / 2,
    panY: (viewportH - terrainH * zoom) / 2,
  };
}
