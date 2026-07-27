/**
 * Capa de grilla para el canvas de planos
 *
 * Renderiza líneas horizontales y verticales en la grilla configurada.
 * La grilla se dibuja detrás de todos los demás elementos del plano.
 * Cada línea es un componente Line individual para evitar el comportamiento
 * de polilínea que conecta puntos consecutivos.
 */

"use client";

import { Line } from "react-konva";
import { useCanvasStore } from "@/stores/canvas.store";
import { useTerrainStore } from "@/stores/rooms.store";

export function GridLayer() {
  const { gridVisible, gridSize } = useCanvasStore();
  const { terrain } = useTerrainStore();

  if (!gridVisible) return null;

  // Cantidad de líneas en cada dirección
  const verticalCount = Math.floor(terrain.width / gridSize) + 1;
  const horizontalCount = Math.floor(terrain.height / gridSize) + 1;

  return (
    <>
      {/* Líneas verticales */}
      {Array.from({ length: verticalCount }).map((_, i) => (
        <Line
          key={`grid-v-${i}`}
          points={[i * gridSize, 0, i * gridSize, terrain.height]}
          stroke="#e0e0e0"
          strokeWidth={1}
          opacity={0.3}
        />
      ))}

      {/* Líneas horizontales */}
      {Array.from({ length: horizontalCount }).map((_, i) => (
        <Line
          key={`grid-h-${i}`}
          points={[0, i * gridSize, terrain.width, i * gridSize]}
          stroke="#e0e0e0"
          strokeWidth={1}
          opacity={0.3}
        />
      ))}
    </>
  );
}
