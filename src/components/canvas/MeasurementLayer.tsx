/**
 * Capa de mediciones del canvas
 *
 * Renderiza las líneas de medición y la guía en tiempo real
 */

"use client";

import { memo } from "react";
import { Line, Text, Circle, Group } from "react-konva";
import { useRulerStore } from "@/stores/ruler.store";

function MeasurementLine({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distanceCm = Math.round(Math.sqrt(dx * dx + dy * dy));
  const distanceM = (distanceCm / 100).toFixed(2);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const angle = Math.atan2(dy, dx);
  const angleDeg = (angle * 180) / Math.PI;
  const flipText = angleDeg > 90 || angleDeg < -90;

  return (
    <Group>
      <Circle x={x1} y={y1} radius={4} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />
      <Circle x={x2} y={y2} radius={4} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />

      <Line
        points={[x1, y1, x2, y2]}
        stroke="#ef4444"
        strokeWidth={1.5}
        dash={[6, 3]}
      />

      <Text
        x={midX}
        y={midY - 14}
        text={`${distanceM} m`}
        fontSize={11}
        fontFamily="monospace"
        fill="#ef4444"
        fontStyle="bold"
        width={80}
        align="center"
        offsetX={40}
        rotation={flipText ? angleDeg + 180 : angleDeg}
      />
    </Group>
  );
}

export const MeasurementLayer = memo(function MeasurementLayer() {
  const active = useRulerStore((s) => s.active);
  const pointA = useRulerStore((s) => s.pointA);
  const pointerPos = useRulerStore((s) => s.pointerPos);
  const measurements = useRulerStore((s) => s.measurements);

  const previewDx = pointerPos && pointA ? pointerPos.x - pointA.x : 0;
  const previewDy = pointerPos && pointA ? pointerPos.y - pointA.y : 0;
  const previewDistanceCm = Math.round(Math.sqrt(previewDx * previewDx + previewDy * previewDy));
  const previewDistanceM = (previewDistanceCm / 100).toFixed(2);
  const previewMidX = pointA && pointerPos ? (pointA.x + pointerPos.x) / 2 : 0;
  const previewMidY = pointA && pointerPos ? (pointA.y + pointerPos.y) / 2 : 0;

  return (
    <>
      {measurements.map((m) => (
        <MeasurementLine key={m.id} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} />
      ))}

      {active && pointA && pointerPos && (
        <Group>
          <Line
            points={[pointA.x, pointA.y, pointerPos.x, pointerPos.y]}
            stroke="#3b82f6"
            strokeWidth={1.5}
            dash={[8, 4]}
          />
          <Text
            x={previewMidX}
            y={previewMidY - 14}
            text={`${previewDistanceM} m`}
            fontSize={11}
            fontFamily="monospace"
            fill="#3b82f6"
            fontStyle="bold"
            width={80}
            align="center"
            offsetX={40}
          />
        </Group>
      )}

      {active && pointA && !pointerPos && (
        <Circle
          x={pointA.x}
          y={pointA.y}
          radius={5}
          fill="#3b82f6"
          stroke="#fff"
          strokeWidth={2}
        />
      )}
    </>
  );
});
