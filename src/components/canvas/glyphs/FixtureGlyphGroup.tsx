/**
 * Grupo compartido de glifos de fixtures (S4).
 *
 * Centraliza la interacción del canvas que antes vivía en FixtureLayer:
 * drag con gesture de history, selección, context menu con propiedades, y
 * hover opcional (puertas/ventanas). La capa delega el dibujo a los glifos
 * (DoorGlyph/WindowGlyph/StairGlyph) que viven como children.
 *
 * Durante un drag activo no se setea x/y por props: Konva maneja la posición
 * internamente (misma semántica que S2). `onHoverChange` solo se cablea para
 * aberturas — muebles/escaleras conservan el comportamiento S1-S3 exacto.
 */

"use client";

import { memo, ReactNode } from "react";
import { Group } from "react-konva";
import Konva from "konva";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useContextMenuStore } from "@/stores/context-menu.store";
import { usePanelStore, type PanelType } from "@/stores/panel.store";
import { useHistoryStore } from "@/stores/history.store";
import { Fixture } from "@/types/plan";

const draggedFixtureIdRef = { current: null as string | null };

export interface FixtureGlyphGroupProps {
  fixture: Fixture;
  /** El Group es draggable solo con herramienta select */
  draggable: boolean;
  /** Callback de hover (solo aberturas); ausente = sin estado hover */
  onHoverChange?: (hovered: boolean) => void;
  children: ReactNode;
}

export const FixtureGlyphGroup = memo(function FixtureGlyphGroup({
  fixture,
  draggable,
  onHoverChange,
  children,
}: FixtureGlyphGroupProps) {
  const moveFixture = useFixtureStore((s) => s.moveFixture);
  const removeFixture = useFixtureStore((s) => s.removeFixture);
  const select = useSelectionStore((s) => s.select);
  const show = useContextMenuStore((s) => s.show);
  const openPanel = usePanelStore((s) => s.openPanel);

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    draggedFixtureIdRef.current = fixture.id;
    select(fixture.id);
    useHistoryStore.getState().beginGesture();
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    draggedFixtureIdRef.current = null;
    const newX = e.target.x();
    const newY = e.target.y();
    moveFixture(fixture.id, newX, newY);
    useHistoryStore.getState().endGesture();
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    select(fixture.id);
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    e.evt.stopPropagation();
    select(fixture.id);

    const panelType: PanelType =
      fixture.category === "door" || fixture.category === "window"
        ? "opening"
        : fixture.category === "stair"
          ? "stair"
          : "fixture";

    show(e.evt.clientX, e.evt.clientY, [
      {
        label: "Propiedades",
        icon: "⚙️",
        action: () => openPanel(panelType, fixture.id),
      },
      { label: "", divider: true },
      {
        label: "Eliminar",
        icon: "🗑️",
        danger: true,
        action: () => removeFixture(fixture.id),
      },
    ]);
  };

  // Durante drag activo, no setear x/y via props — Konva maneja la posición internamente
  const isDragging = draggedFixtureIdRef.current === fixture.id;
  const posX = isDragging ? undefined : fixture.x;
  const posY = isDragging ? undefined : fixture.y;

  return (
    <Group
      x={posX}
      y={posY}
      draggable={draggable}
      rotation={fixture.rotation}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={onHoverChange ? () => onHoverChange(true) : undefined}
      onMouseLeave={onHoverChange ? () => onHoverChange(false) : undefined}
    >
      {children}
    </Group>
  );
});
