/**
 * Capa de grilla para el canvas de planos
 *
 * Renderiza líneas horizontales y verticales de la grilla configurada.
 * La grilla se dibuja detrás de todos los demás elementos del plano.
 * Solo se dibujan las líneas visibles en el viewport actual (regla 09):
 * recibe el tamaño del contenedor desde PlanCanvas y calcula el rango
 * visible con lib/grid.ts. Cada línea es un componente Line individual
 * para evitar el comportamiento de polilínea que conecta puntos
 * consecutivos.
 */

"use client";

import { memo } from "react";
import { Line } from "react-konva";
import { useCanvasStore } from "@/stores/canvas.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useCanvasColors } from "./canvas-colors";
import { getVisibleGridRange, getWorldViewport } from "@/lib/grid";

interface GridLayerProps {
  viewportWidth: number;
  viewportHeight: number;
}

export const GridLayer = memo(function GridLayer({
  viewportWidth,
  viewportHeight,
}: GridLayerProps) {
  const gridVisible = useCanvasStore((s) => s.gridVisible);
  const gridSize = useCanvasStore((s) => s.gridSize);
  const zoom = useCanvasStore((s) => s.zoom);
  const panX = useCanvasStore((s) => s.panX);
  const panY = useCanvasStore((s) => s.panY);
  const terrain = useTerrainStore((s) => s.terrain);
  const { grid } = useCanvasColors();

  if (!gridVisible) return null;

  const viewport = getWorldViewport(viewportWidth, viewportHeight, panX, panY, zoom);
  const vRange = getVisibleGridRange(viewport.minX, viewport.maxX, gridSize, zoom);
  const hRange = getVisibleGridRange(viewport.minY, viewport.maxY, gridSize, zoom);

  // Sin separación mínima en píxeles la grilla se vería como una mancha
  // sólida: no dibujar nada en ese caso.
  if (vRange.count === 0 || hRange.count === 0) return null;

  // La grilla no sale del terreno: recortar al área visible ∩ terreno
  const vStart = Math.max(vRange.start, 0);
  const vEnd = Math.min(vRange.end, terrain.width);
  const hStart = Math.max(hRange.start, 0);
  const hEnd = Math.min(hRange.end, terrain.height);

  const vCount = Math.round((vEnd - vStart) / gridSize);
  const hCount = Math.round((hEnd - hStart) / gridSize);
  if (vCount < 0 || hCount < 0) return null;

  return (
    <>
      {/* Líneas verticales */}
      {Array.from({ length: Math.max(vCount + 1, 0) }).map((_, i) => {
        const x = vStart + i * gridSize;
        return (
          <Line
            key={`grid-v-${x}`}
            points={[x, hStart, x, hEnd]}
            stroke={grid}
            strokeWidth={1}
            opacity={0.3}
          />
        );
      })}

      {/* Líneas horizontales */}
      {Array.from({ length: Math.max(hCount + 1, 0) }).map((_, i) => {
        const y = hStart + i * gridSize;
        return (
          <Line
            key={`grid-h-${y}`}
            points={[vStart, y, vEnd, y]}
            stroke={grid}
            strokeWidth={1}
            opacity={0.3}
          />
        );
      })}
    </>
  );
});
