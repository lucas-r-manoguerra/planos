/**
 * Capa de habitaciones para el canvas de planos
 *
 * Renderiza las habitaciones de la planta activa como rectángulos arrastrables.
 * Cada habitación muestra su nombre y dimensiones en el centro.
 * El arrastre actualiza la posición en el store con snapping a grilla.
 */

"use client";

import { Group, Rect, Text } from "react-konva";
import Konva from "konva";
import { useFloorsStore } from "@/stores/floors.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useSelectionStore } from "@/stores/selection.store";
import { Room } from "@/types/plan";
import { formatDimensions, clampPosition } from "@/lib/utils";
import { ROOM_COLORS } from "@/lib/constants";

function RoomRect({ room }: { room: Room }) {
  const { moveRoom } = useFloorsStore();
  const { terrain } = useTerrainStore();
  const { selectedId, select } = useSelectionStore();
  const isSelected = selectedId === room.id;

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    const newX = e.target.x();
    const newY = e.target.y();
    const clamped = clampPosition(newX, newY, room, terrain);
    moveRoom(room.id, clamped.x, clamped.y);
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

  return (
    <Group
      x={room.x}
      y={room.y}
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
        stroke={isSelected ? "#2563eb" : "#666666"}
        strokeWidth={isSelected ? 3 : 1}
      />
      <Text
        text={room.label}
        fontSize={12}
        fill="#333333"
        width={room.width}
        align="center"
        y={room.height / 2 - 20}
      />
      <Text
        text={formatDimensions(room.width, room.height)}
        fontSize={10}
        fill="#666666"
        width={room.width}
        align="center"
        y={room.height / 2}
      />
    </Group>
  );
}

export function RoomLayer() {
  const { floors, activeFloorId } = useFloorsStore();
  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const rooms = activeFloor?.rooms || [];

  return (
    <>
      {rooms.map((room) => (
        <RoomRect key={room.id} room={room} />
      ))}
    </>
  );
}
