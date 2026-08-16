/**
 * Capa de fixtures (muebles, plantas, puertas, ventanas, escaleras)
 *
 * Renderiza todos los fixtures de la planta activa en el canvas.
 * Permite seleccionar, arrastrar y eliminar fixtures.
 */

"use client";

import { memo } from "react";
import { Group, Rect, Text, Line } from "react-konva";
import { useShallow } from "zustand/react/shallow";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useContextMenuStore } from "@/stores/context-menu.store";
import { usePanelStore, type PanelType } from "@/stores/panel.store";
import { useHistoryStore } from "@/stores/history.store";
import { useCanvasStore } from "@/stores/canvas.store";
import Konva from "konva";
import { Fixture } from "@/types/plan";
import { useCanvasColors } from "./canvas-colors";

const draggedFixtureIdRef = { current: null as string | null };

/** Genera puntos para un arco de circunferencia */
function arcPoints(cx: number, cy: number, r: number, startDeg: number, endDeg: number, segs = 24): number[] {
  const pts: number[] = [];
  const step = (endDeg - startDeg) / segs;
  for (let i = 0; i <= segs; i++) {
    const rad = ((startDeg + step * i) * Math.PI) / 180;
    pts.push(cx + r * Math.cos(rad), cy + r * Math.sin(rad));
  }
  return pts;
}

const FixtureRect = memo(function FixtureRect({ fixture }: { fixture: Fixture }) {
  const moveFixture = useFixtureStore((s) => s.moveFixture);
  const removeFixture = useFixtureStore((s) => s.removeFixture);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const select = useSelectionStore((s) => s.select);
  const show = useContextMenuStore((s) => s.show);
  const openPanel = usePanelStore((s) => s.openPanel);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const { fixtureStroke, fixtureLabel } = useCanvasColors();
  const isSelected = selectedId === fixture.id;

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

  const strokeColor = isSelected ? "#3b82f6" : fixtureStroke;
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
          draggable={activeTool === "select"}
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
            fill={fixtureLabel}
            width={fixture.width}
            align="center"
            y={fixture.height / 2 - 6}
            pointerEvents="none"
          />
        </Group>
      );

    case "door": {
      const isDoorOpen = fixture.props.isOpen !== false;
      const isSliding = !!fixture.props.sliding;
      const openingAngle = (fixture.props.openingAngle as number) ?? 90;
      const openingSide = (fixture.props.openingSide as string) ?? "right";
      const doorColor = fixture.color;
      const doorStroke = isSelected ? "#3b82f6" : fixtureStroke;

      return (
        <Group
          x={posX}
          y={posY}
          draggable={activeTool === "select"}
          rotation={fixture.rotation}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          {isDoorOpen ? (
            isSliding ? (
              <>
                <Rect width={fixture.width} height={fixture.height} fill={doorColor} stroke={doorStroke} strokeWidth={strokeWidth} />
                <Rect x={fixture.width * 0.05} y={-3} width={fixture.width * 0.9} height={fixture.height} fill={doorColor} stroke={doorStroke} strokeWidth={1} opacity={0.6} />
                <Line points={[fixture.width * 0.1, fixture.height + 6, fixture.width * 0.9, fixture.height + 6]} stroke="#8b4513" strokeWidth={1} pointerEvents="none" />
                <Line points={[fixture.width * 0.85, fixture.height + 3, fixture.width * 0.9, fixture.height + 6, fixture.width * 0.85, fixture.height + 9]} stroke="#8b4513" strokeWidth={1} pointerEvents="none" />
              </>
            ) : (() => {
              const hingeX = openingSide === "right" ? fixture.width : 0;
              const hingeY = 0;
              const dir = openingSide === "right" ? -1 : 1;
              const angleRad = (openingAngle * Math.PI) / 180;
              const leafLen = fixture.width;
              const tipX = hingeX + dir * leafLen * Math.cos(angleRad);
              const tipY = hingeY - leafLen * Math.sin(angleRad);
              const arcStart = openingSide === "right" ? 180 : 0;
              const arcEnd = openingSide === "right" ? 180 - openingAngle : openingAngle;
              return (
                <>
                  <Rect width={fixture.width} height={fixture.height} fill="transparent" stroke="none" />
                  <Line points={[hingeX, hingeY, tipX, tipY]} stroke={doorColor} strokeWidth={3} pointerEvents="none" />
                  <Line points={arcPoints(hingeX, hingeY, leafLen, arcStart, arcEnd)} stroke="#8b4513" strokeWidth={1} dash={[4, 3]} pointerEvents="none" />
                  <Line points={[hingeX - 2, hingeY, hingeX + 2, hingeY]} stroke={doorColor} strokeWidth={1} pointerEvents="none" />
                  <Line points={[hingeX, hingeY - 2, hingeX, hingeY + 2]} stroke={doorColor} strokeWidth={1} pointerEvents="none" />
                </>
              );
            })()
          ) : (
            <Rect width={fixture.width} height={fixture.height} fill={doorColor} stroke={fixtureStroke} strokeWidth={1.5} />
          )}
          <Text text={fixture.label} fontSize={8} fill={fixtureLabel} width={fixture.width} align="center" y={-12} pointerEvents="none" />
        </Group>
      );
    }

    case "window": {
      const isWindowOpen = fixture.props.isOpen !== false;
      const isSliding = !!fixture.props.sliding;
      const openingSide = (fixture.props.openingSide as string) ?? "right";
      const winStroke = isSelected ? "#3b82f6" : "#4682b4";

      return (
        <Group
          x={posX}
          y={posY}
          draggable={activeTool === "select"}
          rotation={fixture.rotation}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          <Rect width={fixture.width} height={fixture.height} fill={fixture.color} stroke={winStroke} strokeWidth={strokeWidth} />
          {isWindowOpen ? (
            isSliding ? (
              <>
                <Rect x={fixture.width * 0.05} y={-3} width={fixture.width * 0.9} height={fixture.height} fill={fixture.color} stroke={winStroke} strokeWidth={0.75} opacity={0.5} />
                <Line points={[fixture.width * 0.1, fixture.height + 5, fixture.width * 0.9, fixture.height + 5]} stroke="#4682b4" strokeWidth={0.75} pointerEvents="none" />
                <Line points={[fixture.width * 0.85, fixture.height + 2, fixture.width * 0.9, fixture.height + 5, fixture.width * 0.85, fixture.height + 8]} stroke="#4682b4" strokeWidth={0.75} pointerEvents="none" />
              </>
            ) : (() => {
              const hingeX = openingSide === "right" ? fixture.width : 0;
              const dir = openingSide === "right" ? -1 : 1;
              const paneAngle = 45;
              const paneRad = (paneAngle * Math.PI) / 180;
              const paneLen = fixture.width * 0.85;
              const tipX = hingeX + dir * paneLen * Math.cos(paneRad);
              const tipY = fixture.height / 2 - paneLen * Math.sin(paneRad);
              const arcStart = openingSide === "right" ? 180 : 0;
              const arcEnd = openingSide === "right" ? 180 - paneAngle : paneAngle;
              return (
                <>
                  <Line points={[hingeX, fixture.height / 2, tipX, tipY]} stroke="#4682b4" strokeWidth={2} pointerEvents="none" />
                  <Line points={arcPoints(hingeX, fixture.height / 2, paneLen, arcStart, arcEnd)} stroke="#4682b4" strokeWidth={0.75} dash={[3, 3]} pointerEvents="none" />
                </>
              );
            })()
          ) : (
            <Line points={[2, fixture.height / 2, fixture.width - 2, fixture.height / 2]} stroke="#4682b4" strokeWidth={0.5} pointerEvents="none" />
          )}
          <Text text={fixture.label} fontSize={8} fill="#4682b4" width={fixture.width} align="center" y={-12} pointerEvents="none" />
        </Group>
      );
    }

    case "stair": {
      const stepWidth = (fixture.props.stepWidth as number) || 28;
      const flights = (fixture.props.flights as number) || 1;
      const separation = (fixture.props.separation as number) || 10;

      if (flights === 2) {
        const flightWidth = (fixture.width - separation) / 2;
        const landingW = (fixture.props.landingWidth as number) || 90;
        const flightRun = fixture.height - landingW > stepWidth * 2
        ? fixture.height - landingW
        : fixture.height;

        const numStepsFlight = Math.floor(flightRun / stepWidth);
        const stepLinesLeft: number[] = [];
        for (let i = 1; i < numStepsFlight; i++) {
          const y = i * stepWidth;
          stepLinesLeft.push(0, y, flightWidth, y);
        }

        const stepLinesRight: number[] = [];
        for (let i = 1; i < numStepsFlight; i++) {
          const y = i * stepWidth;
          stepLinesRight.push(flightWidth + separation, y, fixture.width, y);
        }

        return (
          <Group
            x={posX}
            y={posY}
            draggable={activeTool === "select"}
            rotation={fixture.rotation}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
          >
            {/* Tramo izquierdo */}
            <Rect
              x={0}
              y={0}
              width={flightWidth}
              height={flightRun}
              fill="#f5f0e8"
              stroke={isSelected ? "#3b82f6" : "#8b7355"}
              strokeWidth={strokeWidth}
            />
            {stepLinesLeft.length > 0 && (
              <Line
                points={stepLinesLeft}
                stroke="#8b7355"
                strokeWidth={0.5}
                pointerEvents="none"
              />
            )}
            <Line
              points={[flightWidth / 2, flightRun - 10, flightWidth / 2, 10]}
              stroke="#8b4513"
              strokeWidth={1.5}
              pointerEvents="none"
            />

            {/* Separación entre tramos */}
            <Rect
              x={flightWidth}
              y={0}
              width={separation}
              height={flightRun}
              fill="#e8e0d0"
              stroke="none"
            />

            {/* Tramo derecho */}
            <Rect
              x={flightWidth + separation}
              y={0}
              width={flightWidth}
              height={flightRun}
              fill="#f5f0e8"
              stroke={isSelected ? "#3b82f6" : "#8b7355"}
              strokeWidth={strokeWidth}
            />
            {stepLinesRight.length > 0 && (
              <Line
                points={stepLinesRight}
                stroke="#8b7355"
                strokeWidth={0.5}
                pointerEvents="none"
              />
            )}
            <Line
              points={[
                flightWidth + separation + flightWidth / 2,
                flightRun - 10,
                flightWidth + separation + flightWidth / 2,
                10,
              ]}
              stroke="#8b4513"
              strokeWidth={1.5}
              pointerEvents="none"
            />

            {/* Descanso — plataforma al final de los tramos */}
            {(() => {
              const landingW = (fixture.props.landingWidth as number) || 90;
              const flightRun = fixture.height - landingW > stepWidth * 2
        ? fixture.height - landingW
        : fixture.height;
              return (
                <Rect
                  x={0}
                  y={flightRun}
                  width={fixture.width}
                  height={landingW}
                  fill="#e8dcc8"
                  stroke={isSelected ? "#3b82f6" : "#8b7355"}
                  strokeWidth={strokeWidth}
                  dash={[4, 4]}
                />
              );
            })()}

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
      }

      // Tramo único (1 tramo)
      const landingW = (fixture.props.landingWidth as number) || 90;
      const flightRun = fixture.height - landingW > stepWidth * 2
        ? fixture.height - landingW
        : fixture.height;

      const numSteps = Math.floor(flightRun / stepWidth);
      const stepLines: number[] = [];
      for (let i = 1; i < numSteps; i++) {
        const y = i * stepWidth;
        stepLines.push(0, y, fixture.width, y);
      }

      return (
        <Group
          x={posX}
          y={posY}
          draggable={activeTool === "select"}
          rotation={fixture.rotation}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        >
          {/* Tramo */}
          <Rect
            width={fixture.width}
            height={flightRun}
            fill="#f5f0e8"
            stroke={isSelected ? "#3b82f6" : "#8b7355"}
            strokeWidth={strokeWidth}
          />
          {stepLines.length > 0 && (
            <Line
              points={stepLines}
              stroke="#8b7355"
              strokeWidth={0.5}
              pointerEvents="none"
            />
          )}
          <Line
            points={[fixture.width / 2, flightRun - 10, fixture.width / 2, 10]}
            stroke="#8b4513"
            strokeWidth={1.5}
            pointerEvents="none"
          />

          {/* Descanso */}
          <Rect
            x={0}
            y={flightRun}
            width={fixture.width}
            height={landingW}
            fill="#e8dcc8"
            stroke={isSelected ? "#3b82f6" : "#8b7355"}
            strokeWidth={strokeWidth}
            dash={[4, 4]}
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
    }

    default:
      return null;
  }
});

export const FixtureLayer = memo(function FixtureLayer() {
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);
  const visibleFixtures = useFixtureStore(
    useShallow((s) => s.getFixturesForFloor(activeFloorId))
  );

  return (
    <Group>
      {visibleFixtures.map((fixture) => (
        <FixtureRect key={fixture.id} fixture={fixture} />
      ))}
    </Group>
  );
});
