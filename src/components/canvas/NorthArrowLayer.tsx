"use client";

import { useRef, useState, useCallback } from "react";
import { Group, Line, Text, Circle } from "react-konva";
import { useSunStore } from "@/stores/sun.store";
import { useTerrainStore } from "@/stores/terrain.store";
import Konva from "konva";

const ROSE_RADIUS = 45;
const ROSE_PADDING = 25;

export function NorthArrowLayer() {
  const enabled = useSunStore((s) => s.enabled);
  const terrain = useTerrainStore((s) => s.terrain);
  const setTerrainAngle = useTerrainStore((s) => s.setTerrainAngle);
  const groupRef = useRef<Konva.Group>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Valores derivados (ANTES del early return)
  const cx = terrain.width + ROSE_PADDING + ROSE_RADIUS;
  const cy = terrain.height + ROSE_PADDING + ROSE_RADIUS;
  const angle = terrain.northAngle ?? 0;

  // Hooks (ANTES del early return)
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const zoom = stage.scaleX();
      const panX = stage.x();
      const panY = stage.y();

      const canvasX = (pointer.x - panX) / zoom;
      const canvasY = (pointer.y - panY) / zoom;

      const dx = canvasX - cx;
      const dy = canvasY - cy;
      const newAngle = (Math.atan2(dx, -dy) * 180) / Math.PI;

      const normalized = ((newAngle % 360) + 360) % 360;
      setTerrainAngle(Math.round(normalized));
    },
    [cx, cy, setTerrainAngle]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Early return DESPUÉS de todos los hooks
  if (!enabled) return null;

  // Direcciones cardinales fijas (rotadas por el ángulo)
  const cardinalDirections = [
    { label: "N", color: "#e74c3c", bold: true },
    { label: "E", color: "#666", bold: false },
    { label: "S", color: "#666", bold: false },
    { label: "O", color: "#666", bold: false },
  ];

  return (
    <Group
      ref={groupRef}
      x={cx}
      y={cy}
      draggable
      onDragStart={handleDragStart}
      onDragMove={handleDrag}
      onDragEnd={handleDragEnd}
    >
      {/* Círculo de fondo */}
      <Circle
        radius={ROSE_RADIUS + 5}
        fill={isDragging ? "rgba(231, 76, 60, 0.1)" : "rgba(255,255,255,0.8)"}
        stroke={isDragging ? "#e74c3c" : "#ccc"}
        strokeWidth={isDragging ? 2 : 1}
      />

      {/* Líneas de dirección (rotadas por northAngle) */}
      {cardinalDirections.map((d, i) => {
        const dirAngle = ((angle + i * 90) * Math.PI) / 180;
        const innerR = 8;
        const outerR = d.bold ? ROSE_RADIUS : ROSE_RADIUS - 5;
        return (
          <Line
            key={d.label}
            points={[
              Math.sin(dirAngle) * innerR,
              -Math.cos(dirAngle) * innerR,
              Math.sin(dirAngle) * outerR,
              -Math.cos(dirAngle) * outerR,
            ]}
            stroke={d.color}
            strokeWidth={d.bold ? 2.5 : 1.5}
          />
        );
      })}

      {/* Punta de flecha norte */}
      {(() => {
        const nAngle = (angle * Math.PI) / 180;
        const tipR = ROSE_RADIUS;
        const baseR = ROSE_RADIUS - 12;
        const spread = 6;
        return (
          <>
            <Line
              points={[
                Math.sin(nAngle) * tipR,
                -Math.cos(nAngle) * tipR,
                Math.sin(nAngle - 0.15) * baseR - Math.cos(nAngle) * spread,
                -Math.cos(nAngle - 0.15) * baseR - Math.sin(nAngle) * spread,
              ]}
              fill="#e74c3c"
              closed
            />
            <Line
              points={[
                Math.sin(nAngle) * tipR,
                -Math.cos(nAngle) * tipR,
                Math.sin(nAngle + 0.15) * baseR + Math.cos(nAngle) * spread,
                -Math.cos(nAngle + 0.15) * baseR + Math.sin(nAngle) * spread,
              ]}
              fill="#e74c3c"
              closed
            />
          </>
        );
      })()}

      {/* Etiquetas de dirección */}
      {cardinalDirections.map((d, i) => {
        const dirAngle = ((angle + i * 90) * Math.PI) / 180;
        const labelR = ROSE_RADIUS + 12;
        const lx = Math.sin(dirAngle) * labelR;
        const ly = -Math.cos(dirAngle) * labelR;
        return (
          <Text
            key={d.label}
            text={d.label}
            x={lx - 5}
            y={ly - 7}
            fontSize={11}
            fill={d.color}
            fontStyle={d.bold ? "bold" : "normal"}
          />
        );
      })}

      {/* Ángulo actual (debajo de la brújula) */}
      <Text
        text={`${angle}°`}
        x={-12}
        y={ROSE_RADIUS + 16}
        fontSize={10}
        fill="#999"
        fontFamily="monospace"
      />
    </Group>
  );
}
