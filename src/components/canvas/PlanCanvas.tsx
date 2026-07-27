/**
 * Canvas principal del editor de planos
 *
 * Compone todas las capas del canvas: grilla, terreno y habitaciones.
 * Maneja paneo (arrastrar el stage) y zoom (rueda del mouse).
 * Rastrea la posición del cursor para el CoordinateDisplay.
 */

"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Konva from "konva";
import { Stage, Layer } from "react-konva";
import { useCanvasStore } from "@/stores/canvas.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useRulerStore } from "@/stores/ruler.store";
import { GridLayer } from "./GridLayer";
import { TerrainLayer } from "./TerrainLayer";
import { RoomLayer } from "./RoomLayer";
import { MeasurementLayer } from "./MeasurementLayer";
import { WallLayer } from "./WallLayer";
import { CoordinateDisplay } from "./CoordinateDisplay";

export function PlanCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const { zoom, panX, panY, smoothZoom, setPan } = useCanvasStore();
  const { terrain } = useTerrainStore();
  const { active: rulerActive, pointA, setPointA, setPointerPos, addMeasurement, deactivate } = useRulerStore();

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleWheel = useCallback(
    (e: { evt: { deltaY: number; preventDefault: () => void } }) => {
      e.evt.preventDefault();
      const scaleBy = 1.1;
      const currentZoom = useCanvasStore.getState().zoom;
      const newZoom = e.evt.deltaY > 0 ? currentZoom / scaleBy : currentZoom * scaleBy;
      smoothZoom(newZoom);
    },
    [smoothZoom],
  );

  const handleDragEnd = useCallback(
    (e: { target: { x: () => number; y: () => number } }) => {
      const newX = e.target.x();
      const newY = e.target.y();
      setPan(newX, newY);
    },
    [setPan],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        const x = Math.round((pos.x - panX) / zoom);
        const y = Math.round((pos.y - panY) / zoom);
        setCursorPos({ x, y });
        if (rulerActive) {
          setPointerPos(x, y);
        }
      }
    },
    [panX, panY, zoom, rulerActive, setPointerPos],
  );

  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.evt.preventDefault();

      const target = e.target;
      const isTerrainOrRoom = target !== e.target.getStage();

      if (!isTerrainOrRoom) {
        const event = new CustomEvent("canvas-empty-contextmenu", {
          detail: { clientX: e.evt.clientX, clientY: e.evt.clientY },
          bubbles: true,
        });
        e.target.getStage()?.container().dispatchEvent(event);
      }
    },
    [],
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!rulerActive) return;

      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const x = Math.round((pointer.x - panX) / zoom);
      const y = Math.round((pointer.y - panY) / zoom);

      if (!pointA) {
        setPointA(x, y);
      } else {
        addMeasurement(pointA.x, pointA.y, x, y);
        deactivate();
      }
    },
    [rulerActive, pointA, panX, panY, zoom, setPointA, addMeasurement, deactivate],
  );

  return (
    <div ref={containerRef} className="flex-1 bg-gray-100 overflow-hidden">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={zoom}
        scaleY={zoom}
        x={panX}
        y={panY}
        draggable
        onDragEnd={handleDragEnd}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
      >
        <Layer>
          <GridLayer />
          <TerrainLayer />
          <RoomLayer />
          <WallLayer />
          <MeasurementLayer />
        </Layer>
      </Stage>
      <CoordinateDisplay x={cursorPos.x} y={cursorPos.y} />
    </div>
  );
}
