"use client";

import { memo } from "react";
import { Line, Text } from "react-konva";
import { useTerrainStore } from "@/stores/rooms.store";
import { useValidationStore } from "@/stores/validation.store";
import { DEFAULT_SETBACKS } from "@/lib/normative-rules";
import { cmToDisplay } from "@/lib/utils";

export const SetbackLayer = memo(function SetbackLayer() {
  const terrain = useTerrainStore((s) => s.terrain);
  const visible = useValidationStore((s) => s.overlays.setbacks);

  if (!visible || !terrain.setbacks) return null;

  const sb = {
    front: terrain.setbacks.front ?? DEFAULT_SETBACKS.front,
    rear: terrain.setbacks.rear ?? DEFAULT_SETBACKS.rear,
    left: terrain.setbacks.left ?? DEFAULT_SETBACKS.left,
    right: terrain.setbacks.right ?? DEFAULT_SETBACKS.right,
  };

  const left = sb.left;
  const right = terrain.width - sb.right;

  let top: number;
  let bottom: number;
  switch (terrain.front) {
    case "top":
      top = sb.front;
      bottom = terrain.height - sb.rear;
      break;
    case "bottom":
      top = sb.rear;
      bottom = terrain.height - sb.front;
      break;
    case "left":
    case "right":
      top = sb.front;
      bottom = terrain.height - sb.rear;
      break;
  }

  if (left >= right || top >= bottom) return null;

  const points = [
    left, top,
    right, top,
    right, bottom,
    left, bottom,
    left, top,
  ];

  const dashPattern: [number, number] = [10, 5];

  return (
    <>
      <Line
        points={points}
        stroke="#f97316"
        strokeWidth={1.5}
        dash={dashPattern}
        listening={false}
      />

      {sb.front > 0 && (
        <Text
          x={left + 4}
          y={terrain.front === "top" ? top + 4 : top - 18}
          text={`Frente: ${cmToDisplay(sb.front)}`}
          fontSize={10}
          fill="#f97316"
          listening={false}
        />
      )}

      {sb.rear > 0 && (
        <Text
          x={left + 4}
          y={terrain.front === "top" ? bottom - 18 : bottom + 4}
          text={`Fondo: ${cmToDisplay(sb.rear)}`}
          fontSize={10}
          fill="#f97316"
          listening={false}
        />
      )}

      {sb.left > 0 && (
        <Text
          x={left + 4}
          y={top + 14}
          text={`Izq: ${cmToDisplay(sb.left)}`}
          fontSize={10}
          fill="#f97316"
          listening={false}
        />
      )}

      {sb.right > 0 && (
        <Text
          x={right - 80}
          y={top + 14}
          text={`Der: ${cmToDisplay(sb.right)}`}
          fontSize={10}
          fill="#f97316"
          listening={false}
        />
      )}
    </>
  );
});
