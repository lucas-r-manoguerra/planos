/**
 * Utilidades de la grilla del canvas
 *
 * La grilla solo dibuja las líneas visibles en el viewport actual en vez
 * de generar una línea por cada celda del terreno (regla 09 — perf).
 * Todas las unidades del mundo están en centímetros (regla 03).
 */

export interface WorldViewport {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Convierte el viewport en píxeles (tamaño del contenedor + pan + zoom)
 * a coordenadas de mundo en cm.
 *
 * El Stage se posiciona en (panX, panY) con escala zoom: un píxel de
 * pantalla p corresponde al mundo (p - pan) / zoom.
 */
export function getWorldViewport(
  viewportWidth: number,
  viewportHeight: number,
  panX: number,
  panY: number,
  zoom: number
): WorldViewport {
  return {
    minX: -panX / zoom,
    minY: -panY / zoom,
    maxX: (viewportWidth - panX) / zoom,
    maxY: (viewportHeight - panY) / zoom,
  };
}

export interface GridRange {
  start: number;
  end: number;
  count: number;
}

/**
 * Separación mínima en píxeles entre líneas para renderizar la grilla.
 * Por debajo de esto las líneas se funden en una mancha sólida.
 */
export const MIN_GRID_SPACING_PX = 8;

/**
 * Calcula el rango de líneas de grilla visibles en una dirección del mundo.
 *
 * - `count === 0` cuando la separación en píxeles (gridSize * zoom) es menor
 *   a MIN_GRID_SPACING_PX, o si gridSize no es positivo.
 * - `start`/`end` son múltiplos de gridSize que encierran el rango pedido.
 */
export function getVisibleGridRange(
  minWorld: number,
  maxWorld: number,
  gridSize: number,
  zoom: number
): GridRange {
  if (gridSize <= 0 || gridSize * zoom < MIN_GRID_SPACING_PX) {
    return { start: 0, end: 0, count: 0 };
  }

  const start = Math.floor(minWorld / gridSize) * gridSize;
  const end = Math.ceil(maxWorld / gridSize) * gridSize;
  const count = Math.round((end - start) / gridSize) + 1;
  return { start, end, count };
}
