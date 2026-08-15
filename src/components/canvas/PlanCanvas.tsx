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
import { useRulerStore } from "@/stores/ruler.store";
import { GridLayer } from "./GridLayer";
import { TerrainLayer } from "./TerrainLayer";
import { ShadowLayer } from "./ShadowLayer";
import { RoomLayer } from "./RoomLayer";
import { FixtureLayer } from "./FixtureLayer";
import { WallLayer, WallPreview } from "./WallLayer";
import { MeasurementLayer } from "./MeasurementLayer";
import { SunArcLayer } from "./SunArcLayer";
import { CompassOverlay } from "./CompassOverlay";
import { CoordinateDisplay } from "./CoordinateDisplay";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useFloorsStore } from "@/stores/floors.store";
import { getCatalogItem, calculateStairs } from "@/lib/fixtures-catalog";
import { findNearestWall } from "@/lib/utils";

export function PlanCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [wallPreview, setWallPreview] = useState<WallPreview | null>(null);

  const { zoom, panX, panY, smoothZoom, setPan } = useCanvasStore();
  const { active: rulerActive, pointA, setPointA, setPointerPos, addMeasurement, deactivate } = useRulerStore();
  const { placingFixture, addFixture, setPlacingFixture } = useFixtureStore();

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

  // Exponer el Stage de Konva al store para la exportación PNG
  useEffect(() => {
    useCanvasStore.setState({ stageRef: stageRef.current });
    return () => useCanvasStore.setState({ stageRef: null });
  }, []);

  // Cancelar modo colocación con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && placingFixture) {
        setPlacingFixture(null);
        setWallPreview(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [placingFixture, setPlacingFixture]);

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

        // Detectar pared cercana al colocar puertas/ventanas
        if (placingFixture) {
          const catalogItem = getCatalogItem(placingFixture);
          if (catalogItem && (catalogItem.category === "door" || catalogItem.category === "window")) {
            const rooms = useFloorsStore.getState().getActiveRooms();
            const preview = findNearestWall(x, y, rooms);
            setWallPreview(preview);
          } else {
            setWallPreview(null);
          }
        } else {
          setWallPreview(null);
        }
      }
    },
    [panX, panY, zoom, rulerActive, setPointerPos, placingFixture],
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
      // Si hay un fixture en modo colocación, colocarlo
      if (placingFixture) {
        const stage = e.target.getStage();
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const canvasX = (pointer.x - panX) / zoom;
        const canvasY = (pointer.y - panY) / zoom;

        const catalogItem = getCatalogItem(placingFixture);
        if (!catalogItem) return;

        // Puertas y ventanas solo se colocan en paredes
        if (catalogItem.category === "door" || catalogItem.category === "window") {
          if (!wallPreview) return;

          const isHorizontal = wallPreview.side === "top" || wallPreview.side === "bottom";
          const fixtureWidth = catalogItem.width;
          const fixtureHeight = catalogItem.height;

          let fx: number;
          let fy: number;
          let rotation = 0;

          if (isHorizontal) {
            fx = wallPreview.x - fixtureWidth / 2;
            fy = wallPreview.y - fixtureHeight / 2;
            rotation = 0;
          } else {
            fx = wallPreview.x - fixtureHeight / 2;
            fy = wallPreview.y - fixtureWidth / 2;
            rotation = 90;
          }

          addFixture({
            catalogId: placingFixture,
            label: catalogItem.label,
            category: catalogItem.category,
            x: fx,
            y: fy,
            width: fixtureWidth,
            height: fixtureHeight,
            rotation,
            color: catalogItem.color,
            props: catalogItem.props ? { ...catalogItem.props } : {},
            wallId: wallPreview.roomId,
            wallSide: wallPreview.side,
            wallOffset: wallPreview.offset,
          });
          setWallPreview(null);
          return;
        }

        // Resto de fixtures (muebles, plantas, etc.) — colocación libre
        let width = catalogItem.width;
        let height = catalogItem.height;
        if (catalogItem.category === "stair" && catalogItem.props) {
          const p = catalogItem.props;
          const calc = calculateStairs(
            (p.floorHeight as number) ?? 280,
            (p.stepHeight as number) ?? 18,
            (p.stepWidth as number) ?? 28,
            (p.flights as number) ?? 1,
            (p.stairWidth as number) ?? 90,
            (p.separation as number) ?? 10,
          );
          width = calc.calculatedWidth;
          height = calc.calculatedHeight;
        }

        addFixture({
          catalogId: placingFixture,
          label: catalogItem.label,
          category: catalogItem.category,
          x: canvasX - width / 2,
          y: canvasY - height / 2,
          width,
          height,
          rotation: 0,
          color: catalogItem.color,
          props: catalogItem.props ? { ...catalogItem.props } : {},
        });
        return;
      }

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
    [placingFixture, addFixture, rulerActive, pointA, panX, panY, zoom, setPointA, addMeasurement, deactivate, wallPreview],
  );

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="plan-canvas flex-1 bg-gray-100 overflow-hidden relative focus:outline-none dark:bg-[#16171a]"
    >
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
        {/* Una Layer por dominio: cada capa redibuja solo lo que le corresponde */}
        <Layer>
          <GridLayer viewportWidth={size.width} viewportHeight={size.height} />
        </Layer>
        <Layer>
          <TerrainLayer />
        </Layer>
        <Layer>
          <ShadowLayer />
        </Layer>
        <Layer>
          <RoomLayer />
        </Layer>
        <Layer>
          <FixtureLayer />
        </Layer>
        <Layer>
          <WallLayer wallPreview={wallPreview} />
        </Layer>
        <Layer>
          <MeasurementLayer />
        </Layer>
        <Layer>
          <SunArcLayer />
        </Layer>
      </Stage>
      <CompassOverlay />
      {/* Indicador de pared detectada en modo colocación puerta/ventana */}
      {wallPreview && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow-lg pointer-events-none">
          Pared detectada — clic para colocar
        </div>
      )}
      <CoordinateDisplay x={cursorPos.x} y={cursorPos.y} />
    </div>
  );
}
