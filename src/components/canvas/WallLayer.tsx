/**
 * Capa de paredes
 *
 * Renderiza las entidades Wall de la planta activa (v4). Las paredes
 * derivadas de habitaciones las materializa lib/wall-utils.ts (store
 * walls.store); esta capa solo dibuja — sin lógica de fusión local.
 * Selector fino: se suscribe SOLO a las paredes de la planta activa.
 */

"use client";

import { memo } from "react";
import { Rect, Line } from "react-konva";
import { useShallow } from "zustand/react/shallow";
import { useFloorsStore } from "@/stores/floors.store";
import { useWallsStore } from "@/stores/walls.store";
import { Wall } from "@/types/plan";
import { useCanvasColors } from "./canvas-colors";

export interface WallPreview {
  roomId: string;
  side: "top" | "bottom" | "left" | "right";
  x: number;
  y: number;
  offset: number;
  wallLength: number;
}

/** Rect de una pared: banda de `thickness` alrededor de su línea central */
function wallRect(
  wall: Wall
): { x: number; y: number; width: number; height: number } {
  if (wall.y1 === wall.y2) {
    // Horizontal
    return {
      x: Math.min(wall.x1, wall.x2),
      y: wall.y1 - wall.thickness / 2,
      width: Math.abs(wall.x2 - wall.x1),
      height: wall.thickness,
    };
  }
  // Vertical
  return {
    x: wall.x1 - wall.thickness / 2,
    y: Math.min(wall.y1, wall.y2),
    width: wall.thickness,
    height: Math.abs(wall.y2 - wall.y1),
  };
}

/**
 * Línea de pared resaltada en modo colocación puerta/ventana.
 * Componente aparte para que la capa no se suscriba a las habitaciones:
 * solo se monta mientras hay un preview activo.
 */
function WallPreviewLine({ preview }: { preview: WallPreview }) {
  const floors = useFloorsStore((s) => s.floors);
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);
  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const room = activeFloor?.rooms.find((r) => r.id === preview.roomId);
  if (!room) return null;

  let x1: number;
  let y1: number;
  let x2: number;
  let y2: number;
  switch (preview.side) {
    case "top":
      x1 = room.x; y1 = room.y; x2 = room.x + room.width; y2 = room.y;
      break;
    case "bottom":
      x1 = room.x; y1 = room.y + room.height; x2 = room.x + room.width; y2 = room.y + room.height;
      break;
    case "left":
      x1 = room.x; y1 = room.y; x2 = room.x; y2 = room.y + room.height;
      break;
    case "right":
      x1 = room.x + room.width; y1 = room.y; x2 = room.x + room.width; y2 = room.y + room.height;
      break;
  }

  return (
    <Line
      points={[x1, y1, x2, y2]}
      stroke="#3b82f6"
      strokeWidth={3}
      dash={[6, 4]}
      pointerEvents="none"
    />
  );
}

export const WallLayer = memo(function WallLayer({
  wallPreview,
}: {
  wallPreview: WallPreview | null;
}) {
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);
  const walls = useWallsStore(
    useShallow((s) => s.getWallsForFloor(activeFloorId))
  );
  const { wall: wallColor } = useCanvasColors();

  return (
    <>
      {/* Paredes de la planta activa (entidades v4) */}
      {walls.map((wall) => {
        const rect = wallRect(wall);
        if (rect.width <= 0 || rect.height <= 0) return null;
        return (
          <Rect
            key={wall.id}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill={wallColor}
          />
        );
      })}

      {wallPreview && <WallPreviewLine preview={wallPreview} />}
    </>
  );
});
