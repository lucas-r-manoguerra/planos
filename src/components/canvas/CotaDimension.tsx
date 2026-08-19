/**
 * Dimension line component (cota)
 *
 * Renders a dimension line between two points with a value label.
 * Used by MeasurementLayer when the cotas overlay is enabled.
 */

"use client";

import { memo, useMemo } from "react";
import { Line, Text, Group } from "react-konva";

interface CotaDimensionProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Dimension value in cm */
  value: number;
  color?: string;
}

const TICK_LENGTH = 5;

function formatCotaValue(valueCm: number): string {
  if (valueCm < 1000) {
    return `${Math.round(valueCm)} cm`;
  }
  return `${(valueCm / 100).toFixed(2)} m`;
}

export const CotaDimension = memo(function CotaDimension({
  x1,
  y1,
  x2,
  y2,
  value,
  color = "#6b7280",
}: CotaDimensionProps) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const angle = Math.atan2(dy, dx);
  const isHorizontal = Math.abs(dx) >= Math.abs(dy);

  const tick1 = isHorizontal
    ? [x1, y1 - TICK_LENGTH, x1, y1 + TICK_LENGTH]
    : [x1 - TICK_LENGTH, y1, x1 + TICK_LENGTH, y1];

  const tick2 = isHorizontal
    ? [x2, y2 - TICK_LENGTH, x2, y2 + TICK_LENGTH]
    : [x2 - TICK_LENGTH, y2, x2 + TICK_LENGTH, y2];

  const label = useMemo(() => formatCotaValue(value), [value]);

  const textOffsetX = isHorizontal ? 40 : 6;
  const textOffsetY = isHorizontal ? 6 : 40;

  return (
    <Group listening={false}>
      <Line points={[x1, y1, x2, y2]} stroke={color} strokeWidth={0.8} />
      <Line points={tick1} stroke={color} strokeWidth={1.2} />
      <Line points={tick2} stroke={color} strokeWidth={1.2} />
      <Text
        x={midX}
        y={midY}
        text={label}
        fontSize={10}
        fontFamily="monospace"
        fontStyle="bold"
        fill={color}
        offsetX={textOffsetX}
        offsetY={textOffsetY}
        rotation={(angle * 180) / Math.PI}
        align="center"
      />
    </Group>
  );
});
