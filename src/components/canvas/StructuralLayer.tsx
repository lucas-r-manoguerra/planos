/**
 * Capa de elementos estructurales (columnas + vigas).
 *
 * Renderiza las columnas de la planta activa como rectángulos
 * arrastrables centrados en x/y, y las vigas como bandas
 * arrastrables sobre la línea central.
 * Selector fino: suscribe solo los elementos de la planta activa
 * (regla 04, 09).
 *
 * Drag: patrón idéntico a RoomLayer — Group wrapper, Konva gestiona
 * posición internamente durante drag, store se actualiza en onDragEnd.
 *
 * Unidades: 1 unidad = 1 centímetro (cm).
 */

"use client";

import { memo, useRef } from "react";
import { Group, Line, Rect } from "react-konva";
import Konva from "konva";
import { useShallow } from "zustand/react/shallow";
import { useFloorsStore } from "@/stores/floors.store";
import { useStructuralStore } from "@/stores/structural.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useCanvasStore } from "@/stores/canvas.store";
import { Beam, Column } from "@/types/plan";
import { wallBandPoints } from "@/lib/wall-utils";

const COLUMN_FILL = "#60a5fa";
const COLUMN_STROKE = "#2563eb";
const COLUMN_SELECT_STROKE = "#f59e0b";

const BEAM_FILL = "#94a3b8";
const BEAM_STROKE = "#475569";
const BEAM_SELECT_STROKE = "#f59e0b";

/* ── Column drag ─────────────────────────────────────────────── */

const draggedColumnIdRef = { current: null as string | null };

const ColumnRect = memo(function ColumnRect({
  col,
  isSelected,
}: {
  col: Column;
  isSelected: boolean;
}) {
  const moveColumn = useStructuralStore((s) => s.moveColumn);
  const select = useSelectionStore((s) => s.select);
  const activeTool = useCanvasStore((s) => s.activeTool);

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    draggedColumnIdRef.current = col.id;
    select(col.id);
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    draggedColumnIdRef.current = null;
    const newX = e.target.x();
    const newY = e.target.y();
    moveColumn(col.id, newX, newY);
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    select(col.id);
  };

  // During active drag, DON'T set x/y via props — Konva manages position internally
  const isDragging = draggedColumnIdRef.current === col.id;
  const posX = isDragging ? undefined : col.x;
  const posY = isDragging ? undefined : col.y;

  return (
    <Group
      x={posX}
      y={posY}
      draggable={activeTool === "select"}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      <Rect
        x={-col.sectionWidth / 2}
        y={-col.sectionHeight / 2}
        width={col.sectionWidth}
        height={col.sectionHeight}
        fill={COLUMN_FILL}
        stroke={isSelected ? COLUMN_SELECT_STROKE : COLUMN_STROKE}
        strokeWidth={isSelected ? 2 : 1}
      />
    </Group>
  );
});

/* ── Beam drag ───────────────────────────────────────────────── */

const draggedBeamIdRef = { current: null as string | null };

const BeamBand = memo(function BeamBand({
  beam,
  isSelected,
}: {
  beam: Beam;
  isSelected: boolean;
}) {
  const moveBeam = useStructuralStore((s) => s.moveBeam);
  const select = useSelectionStore((s) => s.select);
  const activeTool = useCanvasStore((s) => s.activeTool);

  // Track initial positions during drag to compute delta
  const dragStartRef = useRef<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    draggedBeamIdRef.current = beam.id;
    dragStartRef.current = {
      x1: beam.x1,
      y1: beam.y1,
      x2: beam.x2,
      y2: beam.y2,
    };
    select(beam.id);
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    draggedBeamIdRef.current = null;
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start) return;

    const dx = e.target.x();
    const dy = e.target.y();
    moveBeam(
      beam.id,
      start.x1 + dx,
      start.y1 + dy,
      start.x2 + dx,
      start.y2 + dy,
    );

    // Reset Group position so Konva doesn't double-apply
    e.target.position({ x: 0, y: 0 });
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    select(beam.id);
  };

  const band = wallBandPoints(beam.x1, beam.y1, beam.x2, beam.y2, beam.width);

  return (
    <Group
      draggable={activeTool === "select"}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      <Line
        points={band}
        closed
        fill={BEAM_FILL}
        stroke={isSelected ? BEAM_SELECT_STROKE : BEAM_STROKE}
        strokeWidth={isSelected ? 2 : 0}
      />
    </Group>
  );
});

/* ── Layer ───────────────────────────────────────────────────── */

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
        <ColumnRect
          key={col.id}
          col={col}
          isSelected={selectedId === col.id}
        />
      ))}
      {beams.map((beam) => (
        <BeamBand
          key={beam.id}
          beam={beam}
          isSelected={selectedId === beam.id}
        />
      ))}
    </>
  );
}
