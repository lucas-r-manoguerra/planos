/**
 * Capa de overlay de validación normativa
 *
 * Renderiza badges sobre habitaciones con violaciones normativas.
 * Badges muestran conteo de violaciones, color por severidad,
 * tooltip con primer mensaje al hover, y selección al clic.
 */

"use client";

import { memo, useState, useCallback } from "react";
import { Group, Circle, Rect, Text } from "react-konva";
import { useValidationStore } from "@/stores/validation.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useSelectionStore } from "@/stores/selection.store";
import { Room } from "@/types/plan";

const BADGE_RADIUS = 10;
const BADGE_X_OFFSET = -10;
const BADGE_Y_OFFSET = -10;
const TOOLTIP_WIDTH = 220;
const TOOLTIP_PADDING = 6;

interface BadgeData {
  room: Room;
  count: number;
  hasError: boolean;
  firstMessage: string;
}

function collectBadgeData(
  rooms: Room[],
  violations: { roomId?: string; severity: string; message: string }[],
): BadgeData[] {
  const result: BadgeData[] = [];
  for (const room of rooms) {
    const roomViolations = violations.filter((v) => v.roomId === room.id);
    if (roomViolations.length === 0) continue;
    const hasError = roomViolations.some((v) => v.severity === "error");
    result.push({
      room,
      count: roomViolations.length,
      hasError,
      firstMessage: roomViolations[0].message.length > 40
        ? `${roomViolations[0].message.slice(0, 40)}…`
        : roomViolations[0].message,
    });
  }
  return result;
}

const Badge = memo(function Badge({
  data,
  onHover,
  onLeave,
  onClick,
}: {
  data: BadgeData;
  onHover: (roomId: string) => void;
  onLeave: () => void;
  onClick: (roomId: string) => void;
}) {
  const { room, count, hasError } = data;
  const fill = hasError ? "#ef4444" : "#f59e0b";
  const badgeX = room.x + room.width + BADGE_X_OFFSET;
  const badgeY = room.y + BADGE_Y_OFFSET;

  return (
    <Group
      x={badgeX}
      y={badgeY}
      onMouseEnter={() => onHover(room.id)}
      onMouseLeave={onLeave}
      onClick={(e) => {
        e.cancelBubble = true;
        onClick(room.id);
      }}
    >
      <Circle
        radius={BADGE_RADIUS}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={1.5}
        shadowColor="rgba(0,0,0,0.25)"
        shadowBlur={3}
        shadowOffsetY={1}
      />
      <Text
        text={String(count)}
        fontSize={10}
        fontStyle="bold"
        fill="#ffffff"
        align="center"
        verticalAlign="middle"
        width={BADGE_RADIUS * 2}
        height={BADGE_RADIUS * 2}
        offsetX={BADGE_RADIUS}
        offsetY={BADGE_RADIUS}
        listening={false}
      />
    </Group>
  );
});

const Tooltip = memo(function Tooltip({
  data,
}: {
  data: BadgeData;
}) {
  const { room, firstMessage, count, hasError } = data;
  const fill = hasError ? "#ef4444" : "#f59e0b";
  const badgeX = room.x + room.width + BADGE_X_OFFSET;
  const badgeY = room.y + BADGE_Y_OFFSET;
  const tooltipY = badgeY + BADGE_RADIUS + 4;
  const text = count > 1 ? `${firstMessage} (+${count - 1} más)` : firstMessage;

  return (
    <Group x={badgeX} y={tooltipY} listening={false}>
      <Rect
        width={TOOLTIP_WIDTH}
        height={28}
        fill={fill}
        cornerRadius={4}
        shadowColor="rgba(0,0,0,0.2)"
        shadowBlur={4}
        shadowOffsetY={1}
      />
      <Text
        text={text}
        fontSize={10}
        fill="#ffffff"
        width={TOOLTIP_WIDTH - TOOLTIP_PADDING * 2}
        x={TOOLTIP_PADDING}
        y={TOOLTIP_PADDING}
        wrap="word"
        ellipsis
      />
    </Group>
  );
});

export const ValidationOverlayLayer = memo(function ValidationOverlayLayer() {
  const violations = useValidationStore((s) => s.violations);
  const floors = useFloorsStore((s) => s.floors);
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);
  const select = useSelectionStore((s) => s.select);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);

  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const rooms = activeFloor?.rooms || [];
  const badges = collectBadgeData(rooms, violations);

  const handleHover = useCallback((roomId: string) => {
    setHoveredRoomId(roomId);
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredRoomId(null);
  }, []);

  const handleClick = useCallback(
    (roomId: string) => {
      select(roomId);
    },
    [select],
  );

  if (badges.length === 0) return null;

  const hoveredBadge = hoveredRoomId
    ? badges.find((b) => b.room.id === hoveredRoomId) ?? null
    : null;

  return (
    <>
      {badges.map((badge) => (
        <Badge
          key={badge.room.id}
          data={badge}
          onHover={handleHover}
          onLeave={handleLeave}
          onClick={handleClick}
        />
      ))}
      {hoveredBadge && <Tooltip data={hoveredBadge} />}
    </>
  );
});
