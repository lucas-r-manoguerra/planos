/**
 * Capa de habitaciones para el canvas de planos
 *
 * Renderiza las habitaciones de la planta activa como rectángulos arrastrables.
 * Cada habitación muestra su nombre y dimensiones en el centro.
 * El arrastre actualiza la posición en el store con snapping a grilla.
 */

"use client";

import { memo } from "react";
import { Group, Rect, Text } from "react-konva";
import Konva from "konva";
import { useFloorsStore } from "@/stores/floors.store";
import { useSelectionStore } from "@/stores/selection.store";
import { Room } from "@/types/plan";
import { formatDimensions } from "@/lib/utils";
import { ROOM_COLORS } from "@/lib/constants";
import { useCanvasColors } from "./canvas-colors";

const draggedRoomIdRef = { current: null as string | null };

const RoomRect = memo(function RoomRect({ room }: { room: Room }) {
  const moveRoom = useFloorsStore((s) => s.moveRoom);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const select = useSelectionStore((s) => s.select);
  const { roomStroke, roomLabel, roomDim } = useCanvasColors();
  const isSelected = selectedId === room.id;

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    draggedRoomIdRef.current = room.id;
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    draggedRoomIdRef.current = null;
    const newX = e.target.x();
    const newY = e.target.y();
    moveRoom(room.id, newX, newY);
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    select(room.id);
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    e.evt.stopPropagation();
    const event = new CustomEvent("room-contextmenu", {
      detail: { room, clientX: e.evt.clientX, clientY: e.evt.clientY },
      bubbles: true,
    });
    e.target.getStage()?.container().dispatchEvent(event);
  };

  // During active drag, DON'T set x/y via props — Konva manages position internally
  // This prevents React re-renders from resetting the drag position
  const isDragging = draggedRoomIdRef.current === room.id;
  const posX = isDragging ? undefined : room.x;
  const posY = isDragging ? undefined : room.y;

  return (
    <Group
      x={posX}
      y={posY}
      draggable
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <Rect
        width={room.width}
        height={room.height}
        fill={room.color || ROOM_COLORS[room.type]}
        opacity={room.opacity ?? 1}
        stroke={isSelected ? "#2563eb" : roomStroke}
        strokeWidth={isSelected ? 3 : 1}
      />
      <Text
        text={room.label}
        fontSize={12}
        fill={roomLabel}
        width={room.width}
        align="center"
        y={room.height / 2 - 20}
      />
      <Text
        text={formatDimensions(room.width, room.height)}
        fontSize={10}
        fill={roomDim}
        width={room.width}
        align="center"
        y={room.height / 2}
      />
    </Group>
  );
});

export const RoomLayer = memo(function RoomLayer() {
  const floors = useFloorsStore((s) => s.floors);
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);
  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const rooms = activeFloor?.rooms || [];

  return (
    <>
      {rooms.map((room) => (
        <RoomRect key={room.id} room={room} />
      ))}
    </>
  );
});
