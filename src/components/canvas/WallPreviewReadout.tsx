/**
 * Wall draw preview readouts (P3, editor-rendering-4).
 *
 * Rendered ONLY while a wall stroke preview is active. Everything derives
 * from the segment already resolved in the preview (x1/y1/x2/y2 — the
 * SNAPPED end), so the readouts show the effective angle/length, never the
 * raw pointer. The component reads NO store state (no zoom/pan/theme):
 * readouts depend solely on the preview prop, so pan/zoom never recompute
 * them (rule 09, spec er-4 scenario 4).
 *
 * Follows the MeasurementLayer rotated-Text pattern (repo reference):
 * monospace bold text rotated along the stroke, flipped when the stroke
 * points left so it never reads upside-down. The snap indicator is a
 * contrasting amber circle at the magnetized end.
 */

"use client";

import { memo } from "react";
import { Circle, Group, Text } from "react-konva";
import type { WallDrawPreview } from "./WallLayer";
import { wallReadout, formatAngleReadout, formatLengthReadout } from "@/lib/wall-angle-snap";

/** Blue used by selection + ruler live preview (MeasurementLayer) */
const READOUT_COLOR = "#3b82f6";
/** Amber: distinct marker for a magnetized preview end */
const SNAP_COLOR = "#f59e0b";
const READOUT_FONT_SIZE = 11;
const READOUT_WIDTH = 90;

export const WallPreviewReadout = memo(function WallPreviewReadout({
  preview,
}: {
  preview: WallDrawPreview;
}) {
  const { angleDeg, lengthCm } = wallReadout(preview.x1, preview.y1, preview.x2, preview.y2);

  // Signed rotation follows the stroke direction; flip when pointing left so
  // the text reads top-to-bottom (MeasurementLayer pattern).
  const dx = preview.x2 - preview.x1;
  const dy = preview.y2 - preview.y1;
  const signedDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const flipText = signedDeg > 90 || signedDeg < -90;
  const rotation = flipText ? signedDeg + 180 : signedDeg;

  const midX = (preview.x1 + preview.x2) / 2;
  const midY = (preview.y1 + preview.y2) / 2;

  return (
    <Group>
      {/* Length readout at the stroke midpoint */}
      <Text
        x={midX}
        y={midY - 14}
        text={formatLengthReadout(lengthCm)}
        fontSize={READOUT_FONT_SIZE}
        fontFamily="monospace"
        fill={READOUT_COLOR}
        fontStyle="bold"
        width={READOUT_WIDTH}
        align="center"
        offsetX={READOUT_WIDTH / 2}
        rotation={rotation}
        pointerEvents="none"
      />
      {/* Angle readout near the cursor end */}
      <Text
        x={preview.x2}
        y={preview.y2 - 14}
        text={formatAngleReadout(angleDeg)}
        fontSize={READOUT_FONT_SIZE}
        fontFamily="monospace"
        fill={READOUT_COLOR}
        fontStyle="bold"
        width={READOUT_WIDTH}
        align="center"
        offsetX={READOUT_WIDTH / 2}
        rotation={rotation}
        pointerEvents="none"
      />
      {/* Snap indicator: the preview end is magnetized (point or angle snap) */}
      {preview.snapped && (
        <Circle
          x={preview.x2}
          y={preview.y2}
          radius={6}
          fill={SNAP_COLOR}
          stroke="#ffffff"
          strokeWidth={1.5}
          pointerEvents="none"
        />
      )}
    </Group>
  );
});
