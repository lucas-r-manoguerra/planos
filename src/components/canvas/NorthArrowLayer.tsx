/**
 * Capa de flecha norte (brújula)
 *
 * Renderiza una rosa de los vientos / flecha de norte en la esquina
 * superior derecha del terreno, rotada según la configuración northAt.
 */

"use client";

import { Group, Line, Text } from "react-konva";
import { useSunStore } from "@/stores/sun.store";
import { useTerrainStore } from "@/stores/rooms.store";

const ARROW_SIZE = 40;
const ARROW_PADDING = 15;

export function NorthArrowLayer() {
  const { enabled } = useSunStore();
  const { terrain } = useTerrainStore();

  if (!enabled) return null;

  // Posicionar en la esquina superior derecha, fuera del terreno
  const cx = terrain.width + ARROW_PADDING + ARROW_SIZE;
  const cy = ARROW_PADDING + ARROW_SIZE;

  // Rotación según la dirección del norte
  const rotationMap: Record<string, number> = {
    top: 0, // Norte arriba (canvas -y)
    right: 90, // Norte a la derecha (+x)
    bottom: 180, // Norte abajo (+y)
    left: 270, // Norte a la izquierda (-x)
  };
  const rotation = rotationMap[terrain.northAt ?? "top"];

  return (
    <Group x={cx} y={cy} rotation={rotation}>
      {/* Línea principal de la flecha */}
      <Line
        points={[0, ARROW_SIZE, 0, -ARROW_SIZE]}
        stroke="#e74c3c"
        strokeWidth={2}
      />
      {/* Punta de la flecha (norte) */}
      <Line
        points={[0, -ARROW_SIZE, -6, -ARROW_SIZE + 10, 6, -ARROW_SIZE + 10]}
        fill="#e74c3c"
        closed
      />
      {/* Etiqueta "N" */}
      <Text
        text="N"
        x={-6}
        y={-ARROW_SIZE - 18}
        fontSize={14}
        fill="#e74c3c"
        fontStyle="bold"
      />
    </Group>
  );
}
