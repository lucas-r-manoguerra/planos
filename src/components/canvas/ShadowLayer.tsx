"use client";

import { Line, Text } from "react-konva";
import { useSunStore } from "@/stores/sun.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { computeShadowVector, computeShadowPolygon } from "@/lib/shadow";

const SHADOW_COLOR = "rgba(0, 0, 0, 0.15)";
const MIN_ELEVATION = 2;
const MAX_SHADOW_LENGTH = 5000;

export function ShadowLayer() {
  const { enabled, floorHeight, getSunPosition } = useSunStore();
  const { floors, activeFloorId } = useFloorsStore();
  const { terrain } = useTerrainStore();

  if (!enabled) return null;

  const { azimuth, elevation } = getSunPosition();
  if (elevation < MIN_ELEVATION) return null;

  const activeFloor = floors.find((f) => f.id === activeFloorId);
  if (!activeFloor) return null;

  const floorIndex = floors.findIndex((f) => f.id === activeFloorId);
  const cumulativeHeight = (floorIndex + 1) * floorHeight;

  // Dirección de la sombra para debug (rotada según northAngle)
  const dirVector = computeShadowVector(azimuth, elevation, cumulativeHeight);

  // Rotar vector geográfico (Norte = -y, Este = +x) al canvas según northAngle
  const northAngle = terrain.northAngle ?? 0;
  const rad = (northAngle * Math.PI) / 180;
  // Rotación: canvas_x = geo_x * cos(θ) + geo_y * sin(θ)
  //           canvas_y = -geo_x * sin(θ) + geo_y * cos(θ)
  const dirDx = dirVector.x * Math.cos(rad) + dirVector.y * Math.sin(rad);
  const dirDy = -dirVector.x * Math.sin(rad) + dirVector.y * Math.cos(rad);

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
        const vector = computeShadowVector(
          azimuth,
          elevation,
          cumulativeHeight
        );

        // Rotar vector geográfico (Norte = -y, Este = +x) al canvas según northAngle
        const canvasDx = vector.x * Math.cos(rad) + vector.y * Math.sin(rad);
        const canvasDy = -vector.x * Math.sin(rad) + vector.y * Math.cos(rad);

        vector.x = canvasDx;
        vector.y = canvasDy;

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

      {/* Debug: info del sol en la parte superior del terreno */}
      <Text
        text={`☀ Az: ${azimuth.toFixed(0)}° El: ${elevation.toFixed(0)}° → Sombra: ${dirLabel}`}
        x={10}
        y={-25}
        fontSize={11}
        fill="#666"
        fontFamily="monospace"
      />
    </>
  );
}
