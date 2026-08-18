/**
 * Capa de mediciones del canvas
 *
 * Renderiza las líneas de medición y la guía en tiempo real.
 * Slice C: renderiza anotaciones de vanos estructurales cuando
 * structuralDimensioningEnabled está activo (spec structural-dimensioning).
 */

"use client";

import { memo, useMemo } from "react";
import { Line, Text, Circle, Group } from "react-konva";
import { useRulerStore } from "@/stores/ruler.store";
import { useCanvasStore } from "@/stores/canvas.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useStructuralStore } from "@/stores/structural.store";
import { useValidationStore } from "@/stores/validation.store";
import {
  computeSpanAnnotations,
  type SpanAnnotation,
} from "@/lib/structural-utils";
import { CotaDimension } from "./CotaDimension";

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

/** Anotación de vano estructural — mismo patrón visual que MeasurementLine */
function SpanAnnotationLine({ annotation }: { annotation: SpanAnnotation }) {
  const { x1, y1, x2, y2, distanceCm, inRange } = annotation;
  const distanceM = (distanceCm / 100).toFixed(2);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  const angleDeg = (angle * 180) / Math.PI;
  const flipText = angleDeg > 90 || angleDeg < -90;

  const fill = inRange ? "#ef4444" : "#f59e0b";

  return (
    <Group>
      <Circle x={x1} y={y1} radius={3} fill={fill} stroke="#fff" strokeWidth={1} />
      <Circle x={x2} y={y2} radius={3} fill={fill} stroke="#fff" strokeWidth={1} />
      <Line
        points={[x1, y1, x2, y2]}
        stroke={fill}
        strokeWidth={1}
        dash={[4, 3]}
      />
      <Text
        x={midX}
        y={midY - 14}
        text={`${distanceM} m`}
        fontSize={10}
        fontFamily="monospace"
        fill={fill}
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

  // Cotas overlay
  const cotasEnabled = useValidationStore((s) => s.overlays.cotas);
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);
  const getActiveRooms = useFloorsStore((s) => s.getActiveRooms);

  const cotaData = useMemo(() => {
    if (!cotasEnabled) return [];
    const floorRooms = getActiveRooms();
    const COTA_OFFSET = 15;
    const result: Array<{
      key: string;
      horizontal: { x1: number; y1: number; x2: number; y2: number; value: number };
      vertical: { x1: number; y1: number; x2: number; y2: number; value: number };
    }> = [];
    for (const room of floorRooms) {
      result.push({
        key: room.id,
        horizontal: {
          x1: room.x,
          y1: room.y - COTA_OFFSET,
          x2: room.x + room.width,
          y2: room.y - COTA_OFFSET,
          value: room.width,
        },
        vertical: {
          x1: room.x - COTA_OFFSET,
          y1: room.y,
          x2: room.x - COTA_OFFSET,
          y2: room.y + room.height,
          value: room.height,
        },
      });
    }
    return result;
  }, [cotasEnabled, getActiveRooms]);

  // Slice C: structural dimensioning toggle + data
  const structuralEnabled = useCanvasStore((s) => s.structuralDimensioningEnabled);
  const columns = useStructuralStore((s) => s.columns);
  const beams = useStructuralStore((s) => s.beams);

  // Memoizar anotaciones: solo recompute cuando cambia la geometría del piso activo
  const structuralAnnotations = useMemo(() => {
    if (!structuralEnabled) return [];
    const floorColumns = columns.filter((c) => c.floorId === activeFloorId);
    const floorBeams = beams.filter((b) => b.floorId === activeFloorId);
    return computeSpanAnnotations(floorColumns, floorBeams);
  }, [structuralEnabled, activeFloorId, columns, beams]);

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

      {/* ── Anotaciones de vanos estructurales (Slice C, structural-dimensioning) ── */}
      {structuralEnabled && structuralAnnotations.length > 0 && (
        <Group listening={false}>
          {structuralAnnotations.map((a, i) => (
            <SpanAnnotationLine key={`span-${i}`} annotation={a} />
          ))}
        </Group>
      )}

      {/* ── Cotas de habitaciones (validation overlay) ── */}
      {cotasEnabled && cotaData.length > 0 && (
        <Group listening={false}>
          {cotaData.map((c) => (
            <Group key={`cotas-${c.key}`}>
              <CotaDimension {...c.horizontal} />
              <CotaDimension {...c.vertical} />
            </Group>
          ))}
        </Group>
      )}
    </>
  );
});
