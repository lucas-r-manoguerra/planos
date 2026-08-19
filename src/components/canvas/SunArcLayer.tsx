/**
 * Capa de arco solar
 *
 * Renderiza la trayectoria del sol a lo largo del día como un arco
 * punteado, junto con un marcador de la posición actual del sol.
 * Proyecta azimuth sobre el terreno usando la dirección del norte.
 */

"use client";

import { memo, useMemo } from "react";
import { Line, Circle, Text } from "react-konva";
import { useSunStore } from "@/stores/sun.store";
import { useTerrainStore } from "@/stores/terrain.store";
import { getSunPosition } from "@/lib/solar";
import { useCanvasColors } from "./canvas-colors";

const ARC_COLOR = "#f39c12";
const SUN_COLOR = "#f1c40f";
const MARKER_RADIUS = 8;
const ARC_SAMPLES = 48; // muestras para dibujar el arco

export const SunArcLayer = memo(function SunArcLayer() {
  const enabled = useSunStore((s) => s.enabled);
  const date = useSunStore((s) => s.date);
  const location = useSunStore((s) => s.location);
  const getPos = useSunStore((s) => s.getSunPosition);
  const terrain = useTerrainStore((s) => s.terrain);
  const { textMuted } = useCanvasColors();

  // All derived values and hooks BEFORE early return
  const cx = terrain.width / 2;
  const cy = terrain.height / 2;
  const maxRadius = Math.min(terrain.width, terrain.height) * 0.4;
  const canvasNorthAngle = (terrain.northAngle ?? 0) - 90;

  // Memoize arc computation — only recompute when location/terrain/date changes
  const arcPoints = useMemo(() => {
    if (!enabled) return [];
    const pts: number[] = [];
    for (let i = 0; i <= ARC_SAMPLES; i++) {
      const sampleTime = (i / ARC_SAMPLES) * 24;
      const pos = getSunPosition(
        location.latitude,
        location.longitude,
        date,
        sampleTime
      );
      if (pos.elevation <= 0) continue;
      const canvasAngle = ((canvasNorthAngle + pos.azimuth) * Math.PI) / 180;
      const r = maxRadius * (pos.elevation / 90);
      pts.push(cx + r * Math.cos(canvasAngle), cy + r * Math.sin(canvasAngle));
    }
    return pts;
  }, [enabled, location.latitude, location.longitude, date, canvasNorthAngle, maxRadius, cx, cy]);

  if (!enabled) return null;

  const { azimuth, elevation } = getPos();

  // Posición actual del sol
  const currentAngle = ((canvasNorthAngle + azimuth) * Math.PI) / 180;
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
            fill={textMuted}
          />
        </>
      )}
    </>
  );
});
