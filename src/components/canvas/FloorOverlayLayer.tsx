/**
 * Capa de superposición de plantas adyacentes.
 *
 * Renderiza las paredes y elementos estructurales de la planta adyacente
 * en transparencia sobre la planta activa para facilitar la alineación
 * (spec floor-overlay). Render-only: no participa en selección, snap,
 * ni historial (floor-overlay-4).
 *
 * Unidades: 1 unidad = 1 centímetro (cm).
 */

"use client";

import { memo, useMemo } from "react";
import { Line, Rect, Group } from "react-konva";
import { useShallow } from "zustand/react/shallow";
import { useCanvasStore } from "@/stores/canvas.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useWallsStore } from "@/stores/walls.store";
import { useStructuralStore } from "@/stores/structural.store";
import { wallBandPoints } from "@/lib/wall-utils";
import type { Column, Floor } from "@/types/plan";

const OVERLAY_OPACITY = 0.3;
const WALL_FILL = "#94a3b8";
const WALL_STROKE = "#64748b";
const COLUMN_FILL = "#60a5fa";
const COLUMN_STROKE = "#2563eb";
const BEAM_FILL = "#94a3b8";
const BEAM_STROKE = "#475569";

/**
 * Determina la planta adyacente más cercana por nivel.
 * Tie-break: si dos plantas están a la misma distancia, gana la de abajo
 * (floor-overlay-2).
 * @returns null si no hay planta adyacente (planta única o todas al mismo nivel)
 */
function findAdjacentFloor(
  floors: Floor[],
  activeFloorId: string,
): Floor | null {
  const activeFloor = floors.find((f) => f.id === activeFloorId);
  if (!activeFloor) return null;

  const others = floors.filter(
    (f) => f.id !== activeFloorId && f.level !== activeFloor.level,
  );
  if (others.length === 0) return null;

  // Ordenar por distancia absoluta de nivel, tie-break: nivel menor primero
  others.sort((a, b) => {
    const distA = Math.abs(a.level - activeFloor.level);
    const distB = Math.abs(b.level - activeFloor.level);
    if (distA !== distB) return distA - distB;
    // Tie-break: planta de abajo gana (level menor)
    return a.level < b.level ? -1 : 1;
  });

  return others[0];
}

export const FloorOverlayLayer = memo(function FloorOverlayLayer() {
  const enabled = useCanvasStore((s) => s.floorOverlayEnabled);
  const floors = useFloorsStore((s) => s.floors);
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);

  // Planta adyacente (derived, no recompute on geometry change)
  const adjacentFloor = useMemo(
    () => (enabled ? findAdjacentFloor(floors, activeFloorId) : null),
    [enabled, floors, activeFloorId],
  );

  // Datos de la planta adyacente (solo si hay overlay activo)
  const walls = useWallsStore(
    useShallow((s) =>
      adjacentFloor
        ? s.walls.filter((w) => w.floorId === adjacentFloor.id)
        : [],
    ),
  );
  const columns = useStructuralStore(
    useShallow((s) =>
      adjacentFloor
        ? s.columns.filter((c) => c.floorId === adjacentFloor.id)
        : [],
    ),
  );
  const beams = useStructuralStore(
    useShallow((s) =>
      adjacentFloor
        ? s.beams.filter((b) => b.floorId === adjacentFloor.id)
        : [],
    ),
  );

  if (!adjacentFloor) return null;

  return (
    <Group listening={false}>
      {/* Paredes de la planta adyacente */}
      {walls.map((w) => (
        <Line
          key={`ow-${w.id}`}
          points={wallBandPoints(w.x1, w.y1, w.x2, w.y2, w.thickness)}
          closed
          fill={WALL_FILL}
          stroke={WALL_STROKE}
          strokeWidth={0.5}
          opacity={OVERLAY_OPACITY}
          listening={false}
          hitStrokeWidth={0}
        />
      ))}

      {/* Columnas de la planta adyacente */}
      {columns.map((col: Column) => (
        <Rect
          key={`oc-${col.id}`}
          x={col.x - col.sectionWidth / 2}
          y={col.y - col.sectionHeight / 2}
          width={col.sectionWidth}
          height={col.sectionHeight}
          fill={COLUMN_FILL}
          stroke={COLUMN_STROKE}
          strokeWidth={0.5}
          opacity={OVERLAY_OPACITY}
          listening={false}
          hitStrokeWidth={0}
        />
      ))}

      {/* Vigas de la planta adyacente */}
      {beams.map((b) => (
        <Line
          key={`ob-${b.id}`}
          points={wallBandPoints(b.x1, b.y1, b.x2, b.y2, b.width)}
          closed
          fill={BEAM_FILL}
          stroke={BEAM_STROKE}
          strokeWidth={0.5}
          opacity={OVERLAY_OPACITY}
          listening={false}
          hitStrokeWidth={0}
        />
      ))}
    </Group>
  );
});
