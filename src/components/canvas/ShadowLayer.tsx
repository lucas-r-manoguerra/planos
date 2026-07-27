/**
 * Capa de sombras para la simulación solar
 *
 * Renderiza polígonos de sombra proyectados por cada habitación
 * de la planta activa, calculados a partir de la posición del sol
 * y la altura acumulada del piso.
 */

"use client";

import { Line } from "react-konva";
import { useSunStore } from "@/stores/sun.store";
import { useFloorsStore } from "@/stores/floors.store";
import { computeShadowVector, computeShadowPolygon } from "@/lib/shadow";

const SHADOW_COLOR = "rgba(0, 0, 0, 0.15)";
const MIN_ELEVATION = 2; // grados — ocultar sombras cuando el sol está muy bajo
const MAX_SHADOW_LENGTH = 5000; // cm (50 m)

export function ShadowLayer() {
  const { enabled, floorHeight, getSunPosition } = useSunStore();
  const { floors, activeFloorId } = useFloorsStore();

  if (!enabled) return null;

  const { azimuth, elevation } = getSunPosition();
  if (elevation < MIN_ELEVATION) return null;

  const activeFloor = floors.find((f) => f.id === activeFloorId);
  if (!activeFloor) return null;

  // Altura acumulada = índice del piso × altura por piso
  const floorIndex = floors.findIndex((f) => f.id === activeFloorId);
  const cumulativeHeight = (floorIndex + 1) * floorHeight;

  return (
    <>
      {activeFloor.rooms.map((room) => {
        const vector = computeShadowVector(
          azimuth,
          elevation,
          cumulativeHeight
        );

        // Limitar la longitud máxima de la sombra
        const length = Math.sqrt(vector.x ** 2 + vector.y ** 2);
        if (length > MAX_SHADOW_LENGTH) {
          const scale = MAX_SHADOW_LENGTH / length;
          vector.x *= scale;
          vector.y *= scale;
        }

        const polygon = computeShadowPolygon(
          room.x,
          room.y,
          room.width,
          room.height,
          vector
        );

        const points = polygon.flatMap((p) => [p.x, p.y]);

        return (
          <Line
            key={`shadow-${room.id}`}
            points={points}
            fill={SHADOW_COLOR}
            closed
          />
        );
      })}
    </>
  );
}
