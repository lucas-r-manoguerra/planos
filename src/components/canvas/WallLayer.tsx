/**
 * Capa de paredes
 *
 * Renderiza las paredes de cada habitación.
 * Detecta paredes compartidas entre habitaciones adyacentes y las fusiona.
 */

"use client";

import { memo } from "react";
import { Rect, Line } from "react-konva";
import { useFloorsStore } from "@/stores/floors.store";
import { Room } from "@/types/plan";
import { getRoomWallSegments, WallSegment } from "@/lib/walls";
import { useCanvasColors } from "./canvas-colors";

const MERGE_THRESHOLD = 5; // cm — distance to consider rooms adjacent for merging

export interface WallPreview {
  roomId: string;
  side: "top" | "bottom" | "left" | "right";
  x: number;
  y: number;
  offset: number;
  wallLength: number;
}

/**
 * Detects shared walls between two adjacent rooms and returns merged wall segments.
 * Two rooms are "adjacent" if they share an edge within MERGE_THRESHOLD.
 */
function findMergedWalls(roomA: Room, roomB: Room): WallSegment[] {
  const segments: WallSegment[] = [];
  const maxWallWidth = Math.max(roomA.wallWidth ?? 10, roomB.wallWidth ?? 10);

  // Check if rooms share a vertical edge (left/right)
  const aLeft = roomA.x;
  const aRight = roomA.x + roomA.width;
  const bLeft = roomB.x;
  const bRight = roomB.x + roomB.width;

  // A's right edge touches B's left edge
  if (Math.abs(aRight - bLeft) < MERGE_THRESHOLD) {
    // Find overlapping Y range
    const overlapTop = Math.max(roomA.y, roomB.y);
    const overlapBottom = Math.min(roomA.y + roomA.height, roomB.y + roomB.height);
    if (overlapBottom - overlapTop > 0) {
      // Merged wall centered on the shared edge
      segments.push({
        x: aRight - maxWallWidth / 2,
        y: overlapTop,
        width: maxWallWidth,
        height: overlapBottom - overlapTop,
      });
    }
  }

  // B's right edge touches A's left edge
  if (Math.abs(bRight - aLeft) < MERGE_THRESHOLD) {
    const overlapTop = Math.max(roomA.y, roomB.y);
    const overlapBottom = Math.min(roomA.y + roomA.height, roomB.y + roomB.height);
    if (overlapBottom - overlapTop > 0) {
      segments.push({
        x: aLeft - maxWallWidth / 2,
        y: overlapTop,
        width: maxWallWidth,
        height: overlapBottom - overlapTop,
      });
    }
  }

  // Check if rooms share a horizontal edge (top/bottom)
  const aTop = roomA.y;
  const aBottom = roomA.y + roomA.height;
  const bTop = roomB.y;
  const bBottom = roomB.y + roomB.height;

  // A's bottom edge touches B's top edge
  if (Math.abs(aBottom - bTop) < MERGE_THRESHOLD) {
    const overlapLeft = Math.max(roomA.x, roomB.x);
    const overlapRight = Math.min(roomA.x + roomA.width, roomB.x + roomB.width);
    if (overlapRight - overlapLeft > 0) {
      segments.push({
        x: overlapLeft,
        y: aBottom - maxWallWidth / 2,
        width: overlapRight - overlapLeft,
        height: maxWallWidth,
      });
    }
  }

  // B's bottom edge touches A's top edge
  if (Math.abs(bBottom - aTop) < MERGE_THRESHOLD) {
    const overlapLeft = Math.max(roomA.x, roomB.x);
    const overlapRight = Math.min(roomA.x + roomA.width, roomB.x + roomB.width);
    if (overlapRight - overlapLeft > 0) {
      segments.push({
        x: overlapLeft,
        y: aTop - maxWallWidth / 2,
        width: overlapRight - overlapLeft,
        height: maxWallWidth,
      });
    }
  }

  return segments;
}

/**
 * Checks if a wall segment is covered by a merged wall.
 */
function isCovered(
  wall: WallSegment,
  roomX: number,
  roomY: number,
  merged: WallSegment[]
): boolean {
  const wx = roomX + wall.x;
  const wy = roomY + wall.y;

  for (const m of merged) {
    // Check if the wall center is inside the merged wall
    const wallCenterX = wx + wall.width / 2;
    const wallCenterY = wy + wall.height / 2;

    if (
      wallCenterX >= m.x &&
      wallCenterX <= m.x + m.width &&
      wallCenterY >= m.y &&
      wallCenterY <= m.y + m.height
    ) {
      return true;
    }
  }
  return false;
}

export const WallLayer = memo(function WallLayer({
  wallPreview,
}: {
  wallPreview: WallPreview | null;
}) {
  const floors = useFloorsStore((s) => s.floors);
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);
  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const rooms = activeFloor?.rooms || [];
  const { wall: wallColor } = useCanvasColors();

  // Phase 1: Find all merged wall segments
  const mergedSegments: WallSegment[] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const segments = findMergedWalls(rooms[i], rooms[j]);
      mergedSegments.push(...segments);
    }
  }

  return (
    <>
      {/* Merged walls (shared between adjacent rooms) */}
      {mergedSegments.map((seg, idx) => (
        <Rect
          key={`merged-${idx}`}
          x={seg.x}
          y={seg.y}
          width={seg.width}
          height={seg.height}
          fill={wallColor}
        />
      ))}

      {/* Individual room walls */}
      {rooms.map((room) => {
        const walls = getRoomWallSegments(
          room,
          mergedSegments,
          room.enclosed !== false
        );
        return walls.map((wall, wIdx) => {
          if (isCovered(wall, room.x, room.y, mergedSegments)) {
            return null; // Skip — covered by merged wall
          }
          return (
            <Rect
              key={`wall-${room.id}-${wIdx}`}
              x={room.x + wall.x}
              y={room.y + wall.y}
              width={wall.width}
              height={wall.height}
              fill={wallColor}
            />
          );
        });
      })}

      {/* Línea de pared resaltada en modo colocación puerta/ventana */}
      {wallPreview &&
        (() => {
          const room = rooms.find((r) => r.id === wallPreview.roomId);
          if (!room) return null;

          let x1: number;
          let y1: number;
          let x2: number;
          let y2: number;
          switch (wallPreview.side) {
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
        })()}
    </>
  );
});
