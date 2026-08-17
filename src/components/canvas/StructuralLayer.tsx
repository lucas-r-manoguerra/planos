/**
 * Capa de elementos estructurales (columnas + vigas).
 *
 * Renderiza las columnas de la planta activa como rectángulos
 * de sección centrados en x/y, y las vigas como bandas sobre
 * la línea central (mismo patrón que wallBandPoints).
 * Selector fino: suscribe solo los elementos de la planta activa
 * (regla 04, 09).
 *
 * Unidades: 1 unidad = 1 centímetro (cm).
 */

"use client";

import { memo } from "react";
import { Line, Rect } from "react-konva";
import { useShallow } from "zustand/react/shallow";
import { useFloorsStore } from "@/stores/floors.store";
import { useStructuralStore } from "@/stores/structural.store";
import { useSelectionStore } from "@/stores/selection.store";
import { Beam, Column } from "@/types/plan";
import { wallBandPoints } from "@/lib/wall-utils";

const COLUMN_FILL = "#60a5fa";
const COLUMN_STROKE = "#2563eb";
const COLUMN_SELECT_STROKE = "#f59e0b";

const BEAM_FILL = "#94a3b8";
const BEAM_STROKE = "#475569";
const BEAM_SELECT_STROKE = "#f59e0b";

function ColumnRect({ col, isSelected }: { col: Column; isSelected: boolean }) {
  const select = useSelectionStore((s) => s.select);

  return (
    <Rect
      x={col.x - col.sectionWidth / 2}
      y={col.y - col.sectionHeight / 2}
      width={col.sectionWidth}
      height={col.sectionHeight}
      fill={COLUMN_FILL}
      stroke={isSelected ? COLUMN_SELECT_STROKE : COLUMN_STROKE}
      strokeWidth={isSelected ? 2 : 1}
      listening
      onClick={(e) => {
        e.cancelBubble = true;
        select(col.id);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        select(col.id);
      }}
    />
  );
}

const MemoizedColumnRect = memo(ColumnRect);

function BeamBand({ beam, isSelected }: { beam: Beam; isSelected: boolean }) {
  const select = useSelectionStore((s) => s.select);
  const band = wallBandPoints(beam.x1, beam.y1, beam.x2, beam.y2, beam.width);

  return (
    <Line
      points={band}
      closed
      fill={BEAM_FILL}
      stroke={isSelected ? BEAM_SELECT_STROKE : BEAM_STROKE}
      strokeWidth={isSelected ? 2 : 0}
      listening
      onClick={(e) => {
        e.cancelBubble = true;
        select(beam.id);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        select(beam.id);
      }}
    />
  );
}

const MemoizedBeamBand = memo(BeamBand);

export function StructuralLayer() {
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);
  const columns = useStructuralStore(
    useShallow((s) => s.columns.filter((c) => c.floorId === activeFloorId))
  );
  const beams = useStructuralStore(
    useShallow((s) => s.beams.filter((b) => b.floorId === activeFloorId))
  );
  const selectedId = useSelectionStore((s) => s.selectedId);

  if (columns.length === 0 && beams.length === 0) return null;

  return (
    <>
      {columns.map((col) => (
        <MemoizedColumnRect
          key={col.id}
          col={col}
          isSelected={selectedId === col.id}
        />
      ))}
      {beams.map((beam) => (
        <MemoizedBeamBand
          key={beam.id}
          beam={beam}
          isSelected={selectedId === beam.id}
        />
      ))}
    </>
  );
}
