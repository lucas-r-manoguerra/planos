/**
 * Capa de mediciones del canvas
 *
 * Renderiza las líneas de medición y la guía en tiempo real
 */

"use client";

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

export function MeasurementLayer() {
  const { active, pointA, measurements } = useRulerStore();

  return (
    <>
      {measurements.map((m) => (
        <MeasurementLine key={m.id} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} />
      ))}

      {active && pointA && (
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
}
