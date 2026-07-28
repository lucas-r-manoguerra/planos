/**
 * Capa de fixtures (muebles, plantas, puertas, ventanas, escaleras)
 *
 * Renderiza todos los fixtures de la planta activa en el canvas.
 * Permite seleccionar, arrastrar y eliminar fixtures.
 */

"use client";

import { Group, Rect, Text, Line } from "react-konva";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useContextMenuStore } from "@/stores/context-menu.store";
import { usePanelStore } from "@/stores/panel.store";
import Konva from "konva";
import { Fixture } from "@/types/plan";

const draggedFixtureIdRef = { current: null as string | null };

function FixtureRect({ fixture }: { fixture: Fixture }) {
  const { moveFixture, removeFixture } = useFixtureStore();
  const { selectedId, select } = useSelectionStore();
  const { show } = useContextMenuStore();
  const { openPanel } = usePanelStore();
  const isSelected = selectedId === fixture.id;

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    draggedFixtureIdRef.current = fixture.id;
    select(fixture.id);
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
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    select(fixture.id);
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    e.evt.stopPropagation();
    select(fixture.id);

    show(e.evt.clientX, e.evt.clientY, [
      {
        label: "Propiedades",
        icon: "⚙️",
        action: () => openPanel(fixture.id, e.evt.clientX + 10, e.evt.clientY + 10, "fixture"),
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

  const strokeColor = isSelected ? "#3b82f6" : "#666";
  const strokeWidth = isSelected ? 2 : 1;

  switch (fixture.category) {
    case "furniture":
    case "plant":
    case "bathroom":
    case "vehicle":
      return (
        <Group
          x={posX}
          y={posY}
          draggable
          rotation={fixture.rotation}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          <Rect
            width={fixture.width}
            height={fixture.height}
            fill={fixture.color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            cornerRadius={2}
          />
          <Text
            text={fixture.label}
            fontSize={9}
            fill="#333"
            width={fixture.width}
            align="center"
            y={fixture.height / 2 - 6}
            pointerEvents="none"
          />
        </Group>
      );

    case "door":
      return (
        <Group
          x={posX}
          y={posY}
          draggable
          rotation={fixture.rotation}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          <Rect
            width={fixture.width}
            height={fixture.height}
            fill={fixture.color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
          {fixture.props.openingAngle && !fixture.props.sliding && (
            <Line
              points={[0, 0, fixture.width, 0]}
              stroke="#8b4513"
              strokeWidth={1}
              dash={[4, 4]}
              pointerEvents="none"
            />
          )}
          <Text
            text={fixture.label}
            fontSize={8}
            fill="#666"
            width={fixture.width}
            align="center"
            y={-12}
            pointerEvents="none"
          />
        </Group>
      );

    case "window":
      return (
        <Group
          x={posX}
          y={posY}
          draggable
          rotation={fixture.rotation}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          <Rect
            width={fixture.width}
            height={fixture.height}
            fill={fixture.color}
            stroke={isSelected ? "#3b82f6" : "#4682b4"}
            strokeWidth={strokeWidth}
          />
          <Line
            points={[2, fixture.height / 2, fixture.width - 2, fixture.height / 2]}
            stroke="#4682b4"
            strokeWidth={0.5}
            pointerEvents="none"
          />
          <Text
            text={fixture.label}
            fontSize={8}
            fill="#4682b4"
            width={fixture.width}
            align="center"
            y={-12}
            pointerEvents="none"
          />
        </Group>
      );

    case "stair":
      return (
        <Group
          x={posX}
          y={posY}
          draggable
          rotation={fixture.rotation}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          <Rect
            width={fixture.width}
            height={fixture.height}
            fill="#f5f0e8"
            stroke={isSelected ? "#3b82f6" : "#8b7355"}
            strokeWidth={strokeWidth}
          />
          {(() => {
            const stepWidth = (fixture.props.stepWidth as number) || 28;
            const numSteps = Math.floor(fixture.height / stepWidth);
            const points: number[] = [];
            for (let i = 1; i < numSteps; i++) {
              const y = i * stepWidth;
              points.push(0, y, fixture.width, y);
            }
            return (
              <Line
                points={points}
                stroke="#8b7355"
                strokeWidth={0.5}
                pointerEvents="none"
              />
            );
          })()}
          <Line
            points={[
              fixture.width / 2,
              fixture.height - 10,
              fixture.width / 2,
              10,
            ]}
            stroke="#8b4513"
            strokeWidth={1.5}
            pointerEvents="none"
          />
          <Text
            text={fixture.label}
            fontSize={9}
            fill="#8b4513"
            width={fixture.width}
            align="center"
            y={fixture.height / 2 - 6}
            pointerEvents="none"
          />
        </Group>
      );

    default:
      return null;
  }
}

export function FixtureLayer() {
  const { fixtures } = useFixtureStore();

  return (
    <Group>
      {fixtures.map((fixture) => (
        <FixtureRect key={fixture.id} fixture={fixture} />
      ))}
    </Group>
  );
}
