/**
 * Capa de arco solar
 *
 * Renderiza la trayectoria del sol a lo largo del día como un arco
 * punteado, junto con un marcador de la posición actual del sol.
 * Proyecta azimuth sobre el terreno usando la dirección del norte.
 */

"use client";

import { Line, Circle, Text } from "react-konva";
import { useSunStore } from "@/stores/sun.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { getSunPosition } from "@/lib/solar";

const ARC_COLOR = "#f39c12";
const SUN_COLOR = "#f1c40f";
const MARKER_RADIUS = 8;
const ARC_SAMPLES = 48; // muestras para dibujar el arco

export function SunArcLayer() {
  const { enabled, date, time, location, getSunPosition: getPos } =
    useSunStore();
  const { terrain } = useTerrainStore();

  if (!enabled) return null;

  const { azimuth, elevation } = getPos();

  // Centro del terreno
  const cx = terrain.width / 2;
  const cy = terrain.height / 2;

  // Radio máximo del arco (que quepa dentro del terreno)
  const maxRadius = Math.min(terrain.width, terrain.height) * 0.4;

  // Mapeo de dirección norte a ángulo en canvas
  const northAngleMap: Record<string, number> = {
    top: -90,
    right: 0,
    bottom: 90,
    left: 180,
  };
  const northAngle = northAngleMap[terrain.northAt ?? "top"];

  // Dibujar arco: muestrear posiciones solares a lo largo del día
  const arcPoints: number[] = [];

  for (let i = 0; i <= ARC_SAMPLES; i++) {
    const sampleTime = (i / ARC_SAMPLES) * 24;
    const pos = getSunPosition(
      location.latitude,
      location.longitude,
      date,
      sampleTime
    );

    if (pos.elevation <= 0) continue; // saltar debajo del horizonte

    // Proyectar azimuth como ángulo desde el centro del terreno
    const canvasAngle = ((northAngle + pos.azimuth) * Math.PI) / 180;

    // Radio proporcional a la elevación: más cerca = sol más bajo
    const r = maxRadius * (pos.elevation / 90);
    const px = cx + r * Math.cos(canvasAngle);
    const py = cy + r * Math.sin(canvasAngle);

    arcPoints.push(px, py);
  }

  // Posición actual del sol
  const currentAngle = ((northAngle + azimuth) * Math.PI) / 180;
  const currentR = maxRadius * (elevation / 90);
  const sunX = cx + currentR * Math.cos(currentAngle);
  const sunY = cy + currentR * Math.sin(currentAngle);

  return (
    <>
      {/* Trayectoria del arco */}
      {arcPoints.length > 2 && (
        <Line
          points={arcPoints}
          stroke={ARC_COLOR}
          strokeWidth={1.5}
          dash={[6, 4]}
          tension={0.3}
        />
      )}

      {/* Marcador de posición actual del sol */}
      {elevation > 0 && (
        <>
          <Circle
            x={sunX}
            y={sunY}
            radius={MARKER_RADIUS}
            fill={SUN_COLOR}
            stroke={ARC_COLOR}
            strokeWidth={2}
          />
          <Text
            text={`${Math.round(azimuth)}° ${Math.round(elevation)}°`}
            x={sunX + 12}
            y={sunY - 8}
            fontSize={10}
            fill="#666"
          />
        </>
      )}
    </>
  );
}
