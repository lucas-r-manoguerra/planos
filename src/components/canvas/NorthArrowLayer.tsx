"use client";

import { Group, Line, Text } from "react-konva";
import { useSunStore } from "@/stores/sun.store";
import { useTerrainStore } from "@/stores/rooms.store";

const ROSE_SIZE = 50;
const ROSE_PADDING = 20;

export function NorthArrowLayer() {
  const { enabled } = useSunStore();
  const { terrain } = useTerrainStore();

  if (!enabled) return null;

  // Posicionar en la esquina superior derecha, fuera del terreno
  const cx = terrain.width + ROSE_PADDING + ROSE_SIZE;
  const cy = ROSE_PADDING + ROSE_SIZE;

  // Rotación según la dirección del norte
  const rotationMap: Record<string, number> = {
    top: 0,
    right: 90,
    bottom: 180,
    left: 270,
  };
  const rotation = rotationMap[terrain.northAt ?? "top"];

  // Etiquetas según northAt: N siempre apunta en la dirección indicada
  const directions = [
    { label: "N", dx: 0, dy: -ROSE_SIZE - 8, color: "#e74c3c", bold: true },
    { label: "S", dx: 0, dy: ROSE_SIZE + 8, color: "#666", bold: false },
    { label: "E", dx: ROSE_SIZE + 8, dy: 0, color: "#666", bold: false },
    { label: "O", dx: -ROSE_SIZE - 8, dy: 0, color: "#666", bold: false },
  ];

  return (
    <Group x={cx} y={cy} rotation={rotation}>
      {/* Línea principal vertical (N-S) */}
      <Line
        points={[0, ROSE_SIZE, 0, -ROSE_SIZE]}
        stroke="#999"
        strokeWidth={1}
      />
      {/* Línea principal horizontal (E-O) */}
      <Line
        points={[-ROSE_SIZE, 0, ROSE_SIZE, 0]}
        stroke="#999"
        strokeWidth={1}
      />
      {/* Punta de flecha norte */}
      <Line
        points={[0, -ROSE_SIZE, -5, -ROSE_SIZE + 8, 5, -ROSE_SIZE + 8]}
        fill="#e74c3c"
        closed
      />
      {/* Etiquetas de dirección */}
      {directions.map((d) => (
        <Text
          key={d.label}
          text={d.label}
          x={d.dx - 5}
          y={d.dy - 7}
          fontSize={12}
          fill={d.color}
          fontStyle={d.bold ? "bold" : "normal"}
        />
      ))}
    </Group>
  );
}
