"use client";

import { memo } from "react";
import { Line, Text } from "react-konva";
import { useSunStore } from "@/stores/sun.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useTerrainStore } from "@/stores/terrain.store";
import { computeShadowVector, computeShadowPolygon } from "@/lib/shadow";
import { useCanvasColors } from "./canvas-colors";

const MIN_ELEVATION = 2;
const MAX_SHADOW_LENGTH = 5000;

export const ShadowLayer = memo(function ShadowLayer() {
  const enabled = useSunStore((s) => s.enabled);
  const floorHeight = useSunStore((s) => s.floorHeight);
  const getSunPosition = useSunStore((s) => s.getSunPosition);
  const floors = useFloorsStore((s) => s.floors);
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);
  const terrain = useTerrainStore((s) => s.terrain);
  const { shadow, textMuted } = useCanvasColors();

  if (!enabled) return null;

  const { azimuth, elevation } = getSunPosition();
  if (elevation < MIN_ELEVATION) return null;

  const activeFloor = floors.find((f) => f.id === activeFloorId);
  if (!activeFloor) return null;

  const floorIndex = floors.findIndex((f) => f.id === activeFloorId);
  const cumulativeHeight = (floorIndex + 1) * floorHeight;

  // Dirección de la sombra para debug (rotada según northAngle)
  const rawVector = computeShadowVector(azimuth, elevation, cumulativeHeight);

  // Rotar vector geográfico (Norte = -y, Este = +x) al canvas según northAngle
  const northAngle = terrain.northAngle ?? 0;
  const rad = (northAngle * Math.PI) / 180;
  // Rotación: canvas_x = geo_x * cos(θ) + geo_y * sin(θ)
  //           canvas_y = -geo_x * sin(θ) + geo_y * cos(θ)
  const dirDx = rawVector.x * Math.cos(rad) + rawVector.y * Math.sin(rad);
  const dirDy = -rawVector.x * Math.sin(rad) + rawVector.y * Math.cos(rad);

  const dirAngle = (Math.atan2(dirDy, dirDx) * 180) / Math.PI;
  let dirLabel = "";
  if (dirAngle > -22.5 && dirAngle <= 22.5) dirLabel = "→ E";
  else if (dirAngle > 22.5 && dirAngle <= 67.5) dirLabel = "↘ SE";
  else if (dirAngle > 67.5 && dirAngle <= 112.5) dirLabel = "↓ S";
  else if (dirAngle > 112.5 && dirAngle <= 157.5) dirLabel = "↙ SO";
  else if (dirAngle > 157.5 || dirAngle <= -157.5) dirLabel = "← O";
  else if (dirAngle > -157.5 && dirAngle <= -112.5) dirLabel = "↖ NO";
  else if (dirAngle > -112.5 && dirAngle <= -67.5) dirLabel = "↑ N";
  else if (dirAngle > -67.5 && dirAngle <= -22.5) dirLabel = "↗ NE";

  return (
    <>
      {activeFloor.rooms.map((room) => {
        // Reuse pre-computed rotated vector (was duplicated as computeShadowVector per room)
        const vx = dirDx;
        const vy = dirDy;

        const length = Math.sqrt(vx ** 2 + vy ** 2);
        let vectorX = vx;
        let vectorY = vy;
        if (length > MAX_SHADOW_LENGTH) {
          const scale = MAX_SHADOW_LENGTH / length;
          vectorX *= scale;
          vectorY *= scale;
        }

        const polygon = computeShadowPolygon(
          room.x,
          room.y,
          room.width,
          room.height,
          { x: vectorX, y: vectorY }
        );

        const points = polygon.flatMap((p) => [p.x, p.y]);

        return (
          <Line
            key={`shadow-${room.id}`}
            points={points}
            fill={shadow}
            closed
          />
        );
      })}

      {/* Debug: info del sol en la parte superior del terreno */}
      <Text
        text={`☀ Az: ${azimuth.toFixed(0)}° El: ${elevation.toFixed(0)}° → Sombra: ${dirLabel}`}
        x={10}
        y={-25}
        fontSize={11}
        fill={textMuted}
        fontFamily="monospace"
      />
    </>
  );
});
