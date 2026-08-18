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
import { Stage, Layer, Line } from "react-konva";
import { useCanvasStore } from "@/stores/canvas.store";
import { useRulerStore } from "@/stores/ruler.store";
import { GridLayer } from "./GridLayer";
import { TerrainLayer } from "./TerrainLayer";
import { SetbackLayer } from "./SetbackLayer";
import { ShadowLayer } from "./ShadowLayer";
import { RoomLayer } from "./RoomLayer";
import { FixtureLayer } from "./FixtureLayer";
import { WallLayer, WallPreview, WallDrawPreview } from "./WallLayer";
import { IsometricLayer } from "./IsometricLayer";
import { MeasurementLayer } from "./MeasurementLayer";
import { SunArcLayer } from "./SunArcLayer";
import { ValidationOverlayLayer } from "./ValidationOverlayLayer";
import { FloorOverlayLayer } from "./FloorOverlayLayer";
import { CompassOverlay } from "./CompassOverlay";
import { CoordinateDisplay } from "./CoordinateDisplay";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useWallsStore } from "@/stores/walls.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useStructuralStore } from "@/stores/structural.store";
import { getCatalogItem, calculateStairs } from "@/lib/fixtures-catalog";
import { findNearestWallEntity } from "@/lib/wall-snap";
import { resolveWallEnd, effectiveMagnetism, isSnapped } from "@/lib/wall-angle-snap";
import { snapWallStart } from "@/lib/terrain-snap";
import { DEFAULT_WALL_THICKNESS, wallBandPoints } from "@/lib/wall-utils";
import { isWithinTerrain, snapBeamEndpoint, validateBeam, DEFAULT_BEAM_WIDTH } from "@/lib/structural-utils";
import { activePreset } from "@/components/sidebar/StructuralSection";
import { Point } from "@/types/plan";
import { StructuralLayer } from "./StructuralLayer";

export function PlanCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [wallPreview, setWallPreview] = useState<WallPreview | null>(null);
  const [drawPreview, setDrawPreview] = useState<WallDrawPreview | null>(null);
  const [beamPreview, setBeamPreview] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const drawStartRef = useRef<Point | null>(null);
  /** Listener de window mouseup del trazo activo (identidad para removal) */
  const windowMouseUpRef = useRef<((e: MouseEvent) => void) | null>(null);

  const { zoom, panX, panY, smoothZoom, setPan, activeTool, setActiveTool, viewMode } = useCanvasStore();
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

  /** Punto del cursor en coordenadas de canvas (cm) */
  const pointerToCanvas = useCallback((stage: Konva.Stage): Point | null => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    const { zoom: z, panX: px, panY: py } = useCanvasStore.getState();
    return { x: (pointer.x - px) / z, y: (pointer.y - py) / z };
  }, []);

  /** Convierte un punto snap en coords de canvas según el estado vivo */
  const snapToCanvasPoint = useCallback((p: Point): Point => {
    const { activeFloorId } = useFloorsStore.getState();
    const rooms = useFloorsStore.getState().getActiveRooms();
    const walls = useWallsStore.getState().getWallsForFloor(activeFloorId);
    const terrain = useTerrainStore.getState().terrain;
    return snapWallStart(p, rooms, walls, terrain);
  }, []);

  /**
   * Resuelve el EXTREMO del trazo (dibujo y resize): cadena única del diseño
   * (D3) — snap direccional de puntos → snap de ángulo → snap al terreno
   * (wall-drawing-8, banda a espesor/2) → puntero crudo, gobernada por el
   * magnetismo efectivo (flag del store XOR Shift).
   */
  const resolveCanvasWallEnd = useCallback((p: Point, start: Point, magnetize: boolean): Point => {
    const { activeFloorId } = useFloorsStore.getState();
    const rooms = useFloorsStore.getState().getActiveRooms();
    const walls = useWallsStore.getState().getWallsForFloor(activeFloorId);
    const terrain = useTerrainStore.getState().terrain;
    return resolveWallEnd(p, start, rooms, walls, magnetize, terrain, DEFAULT_WALL_THICKNESS);
  }, []);

  /** Quita el listener de window mouseup del trazo (si quedó registrado) */
  const finishWindowListeners = useCallback(() => {
    if (windowMouseUpRef.current) {
      window.removeEventListener("mouseup", windowMouseUpRef.current);
      windowMouseUpRef.current = null;
    }
  }, []);

  /** Finaliza el trazo: crea la pared o viga si el trazo tiene longitud */
  const completeDraw = useCallback((shiftKey: boolean) => {
    const start = drawStartRef.current;
    drawStartRef.current = null;
    setDrawPreview(null);
    setBeamPreview(null);
    finishWindowListeners();
    if (!start) return;

    const stage = stageRef.current;
    if (!stage) return;
    const p = pointerToCanvas(stage);
    if (!p) return;

    // En modo isométrico no se crea geometría (viewMode es display-only): cancelar
    if (useCanvasStore.getState().viewMode !== "2d") return;

    const tool = useCanvasStore.getState().activeTool;
    const magnetize = effectiveMagnetism(useCanvasStore.getState().magnetismEnabled, shiftKey);

    if (tool === "beam") {
      const { activeFloorId } = useFloorsStore.getState();
      const columns = useStructuralStore.getState().getColumnsForFloor(activeFloorId);
      const walls = useWallsStore.getState().getWallsForFloor(activeFloorId);
      const end = snapBeamEndpoint(p, columns, walls, magnetize);
      const beam = {
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        width: DEFAULT_BEAM_WIDTH,
      };
      if (!validateBeam(beam)) return;
      useStructuralStore.getState().addBeam(beam);
    } else {
      // Wall
      const end = resolveCanvasWallEnd(p, start, magnetize);
      if (Math.abs(end.x - start.x) <= 0 && Math.abs(end.y - start.y) <= 0) return;
      useWallsStore.getState().addWall({
        floorId: useFloorsStore.getState().activeFloorId,
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        thickness: 10,
      });
    }
  }, [pointerToCanvas, resolveCanvasWallEnd, finishWindowListeners]);

  const handleWindowMouseUp = useCallback((e: MouseEvent) => {
    if (!drawStartRef.current) return;
    completeDraw(e.shiftKey);
  }, [completeDraw]);

  // Cancelar modo colocación / trazo de pared / salir de la herramienta con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (placingFixture) {
        setPlacingFixture(null);
        setWallPreview(null);
        return;
      }
      if (drawStartRef.current) {
        // Prioridad 1: cancelar el trazo en curso (no crea pared/viga)
        finishWindowListeners();
        drawStartRef.current = null;
        setDrawPreview(null);
        setBeamPreview(null);
        return;
      }
      if (activeTool === "wall") {
        // Prioridad 2: salir de la herramienta pared
        setActiveTool("select");
      }
      if (activeTool === "column") {
        setActiveTool("select");
      }
      if (activeTool === "beam") {
        setActiveTool("select");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [placingFixture, setPlacingFixture, activeTool, setActiveTool, finishWindowListeners]);

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const { activeTool: tool, viewMode: mode } = useCanvasStore.getState();
      const { placingFixture: placing } = useFixtureStore.getState();
      if (tool !== "wall" && tool !== "beam") return;
      if (placing || mode !== "2d") return;

      const stage = e.target.getStage();
      if (!stage) return;
      const p = pointerToCanvas(stage);
      if (!p) return;

      // Inicio del trazo: magnetismo efectivo (flag XOR Shift en el mousedown).
      const magnetize = effectiveMagnetism(useCanvasStore.getState().magnetismEnabled, e.evt.shiftKey);
      let start = magnetize ? snapToCanvasPoint(p) : p;

      if (tool === "beam") {
        const { activeFloorId } = useFloorsStore.getState();
        const columns = useStructuralStore.getState().getColumnsForFloor(activeFloorId);
        const walls = useWallsStore.getState().getWallsForFloor(activeFloorId);
        start = snapBeamEndpoint(p, columns, walls, magnetize);
      }

      drawStartRef.current = start;

      if (tool === "wall") {
        setDrawPreview({
          x1: start.x,
          y1: start.y,
          x2: start.x,
          y2: start.y,
          snapped: isSnapped(p, start),
        });
      } else {
        setBeamPreview({ x1: start.x, y1: start.y, x2: start.x, y2: start.y });
      }

      // El mouseup puede ocurrir fuera del Stage: safety en window
      finishWindowListeners();
      windowMouseUpRef.current = handleWindowMouseUp;
      window.addEventListener("mouseup", windowMouseUpRef.current);
    },
    [pointerToCanvas, snapToCanvasPoint, handleWindowMouseUp, finishWindowListeners],
  );

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

        // Actualizar preview de trazo de pared o viga en curso
        if (drawStartRef.current) {
          const start = drawStartRef.current;
          const magnetize = effectiveMagnetism(useCanvasStore.getState().magnetismEnabled, e.evt.shiftKey);

          if (useCanvasStore.getState().activeTool === "beam") {
            const { activeFloorId } = useFloorsStore.getState();
            const columns = useStructuralStore.getState().getColumnsForFloor(activeFloorId);
            const walls = useWallsStore.getState().getWallsForFloor(activeFloorId);
            const end = snapBeamEndpoint({ x, y }, columns, walls, magnetize);
            setBeamPreview({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
          } else {
            const end = resolveCanvasWallEnd({ x, y }, start, magnetize);
            setDrawPreview({
              x1: start.x,
              y1: start.y,
              x2: end.x,
              y2: end.y,
              snapped: isSnapped({ x, y }, end),
            });
          }
        }

        // Detectar pared (entidad Wall) al colocar puertas/ventanas (solo 2D)
        if (placingFixture && viewMode === "2d") {
          const catalogItem = getCatalogItem(placingFixture);
          if (catalogItem && (catalogItem.category === "door" || catalogItem.category === "window")) {
            const { activeFloorId } = useFloorsStore.getState();
            const walls = useWallsStore.getState().getWallsForFloor(activeFloorId);
            const hit = findNearestWallEntity({ x, y }, walls);
            setWallPreview(
              hit
                ? {
                    wallId: hit.wall.id,
                    x1: hit.wall.x1,
                    y1: hit.wall.y1,
                    x2: hit.wall.x2,
                    y2: hit.wall.y2,
                    x: hit.x,
                    y: hit.y,
                    offset: hit.offset,
                  }
                : null,
            );
          } else {
            setWallPreview(null);
          }
        } else {
          setWallPreview(null);
        }
      }
    },
    [panX, panY, zoom, rulerActive, setPointerPos, placingFixture, resolveCanvasWallEnd, viewMode],
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
      // En modo isométrico no se colocan fixtures ni se mide (preview 3/4)
      if (useCanvasStore.getState().viewMode !== "2d") return;

      // Columna: colocar en la posición del click
      if (useCanvasStore.getState().activeTool === "column") {
        const stage = e.target.getStage();
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const canvasX = (pointer.x - panX) / zoom;
        const canvasY = (pointer.y - panY) / zoom;
        const terrain = useTerrainStore.getState().terrain;
        if (!isWithinTerrain(canvasX, canvasY, terrain)) return;
        const [presetW, presetH] = activePreset.current;
        useStructuralStore.getState().addColumn({
          x: canvasX,
          y: canvasY,
          sectionWidth: presetW,
          sectionHeight: presetH,
        });
        return;
      }

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

        // Puertas y ventanas solo se colocan en paredes (entidad Wall)
        if (catalogItem.category === "door" || catalogItem.category === "window") {
          if (!wallPreview) return;

          const isHorizontal = wallPreview.y1 === wallPreview.y2;
          const fixtureWidth = catalogItem.width;
          const fixtureHeight = catalogItem.height;

          // Lado de la pared según la posición del puntero respecto de la línea central
          const wallSide =
            isHorizontal
              ? canvasY < wallPreview.y1
                ? "top"
                : "bottom"
              : canvasX < wallPreview.x1
                ? "left"
                : "right";

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
            wallId: wallPreview.wallId,
            wallSide,
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
      className="plan-canvas flex-1 min-w-0 bg-gray-100 overflow-hidden relative focus:outline-none dark:bg-[#16171a]"
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={zoom}
        scaleY={zoom}
        x={panX}
        y={panY}
        draggable={viewMode === "isometric" || (activeTool !== "wall" && activeTool !== "beam")}
        onDragEnd={handleDragEnd}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
      >
        {/* Una Layer por dominio: cada capa redibuja solo lo que le corresponde.
            En modo isométrico la escena proyectada reemplaza a las capas 2D
            (spec isometric-view-3: reusa la misma geometría, no se superpone). */}
        {viewMode === "isometric" ? (
          <Layer>
            <IsometricLayer />
          </Layer>
        ) : (
          <>
            <Layer>
              <GridLayer viewportWidth={size.width} viewportHeight={size.height} />
            </Layer>
            <Layer>
              <TerrainLayer />
            </Layer>
            <Layer>
              <SetbackLayer />
            </Layer>
            <Layer>
              <ShadowLayer />
            </Layer>
            <Layer>
              <RoomLayer />
            </Layer>
            <Layer>
              <StructuralLayer />
              {beamPreview && (
                <Line
                  points={wallBandPoints(
                    beamPreview.x1, beamPreview.y1,
                    beamPreview.x2, beamPreview.y2,
                    DEFAULT_BEAM_WIDTH,
                  )}
                  closed
                  fill="rgba(148, 163, 184, 0.4)"
                  stroke="#94a3b8"
                  strokeWidth={1}
                  dash={[6, 4]}
                  pointerEvents="none"
                />
              )}
            </Layer>
            <Layer>
              <FixtureLayer />
            </Layer>
            <Layer>
              <WallLayer wallPreview={wallPreview} drawPreview={drawPreview} />
            </Layer>
            <Layer>
              <FloorOverlayLayer />
            </Layer>
            <Layer>
              <MeasurementLayer />
            </Layer>
            <Layer>
              <SunArcLayer />
            </Layer>
            <Layer>
              <ValidationOverlayLayer />
            </Layer>
          </>
        )}
      </Stage>
      <CompassOverlay />
      {/* Indicador de pared detectada en modo colocación puerta/ventana (solo 2D) */}
      {viewMode === "2d" && wallPreview && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow-lg pointer-events-none">
          Pared detectada — clic para colocar
        </div>
      )}
      <CoordinateDisplay x={cursorPos.x} y={cursorPos.y} />
    </div>
  );
}
