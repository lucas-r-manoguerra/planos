/**
 * Capa de paredes
 *
 * Renderiza las entidades Wall de la planta activa (v4) y dos previews:
 * - wallPreview: pared detectada al colocar puertas/ventanas (basado en la
 *   entidad Wall, no en habitaciones).
 * - drawPreview: línea de dibujo mientras se traza una pared nueva (S2).
 *
 * Edición (S2.3/S2.4): mover la pared arrastra toda la línea central con
 * snap (wall-drawing-4); los handles de extremo redimensionan un extremo.
 * Selector fino: se suscribe SOLO a las paredes de la planta activa.
 */

"use client";

import { memo } from "react";
import { Circle, Line } from "react-konva";
import Konva from "konva";
import { useShallow } from "zustand/react/shallow";
import { useFloorsStore } from "@/stores/floors.store";
import { useWallsStore } from "@/stores/walls.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useCanvasStore } from "@/stores/canvas.store";
import { useHistoryStore } from "@/stores/history.store";
import { useTerrainStore } from "@/stores/terrain.store";
import { Wall } from "@/types/plan";
import { snapWallPoint } from "@/lib/wall-snap";
import { resolveWallEnd, effectiveMagnetism, isSnapped } from "@/lib/wall-angle-snap";
import { snapWallToTerrain } from "@/lib/terrain-snap";
import { wallBandPoints, DEFAULT_WALL_THICKNESS } from "@/lib/wall-utils";
import { useCanvasColors } from "./canvas-colors";
import { WallPreviewReadout } from "./WallPreviewReadout";

/** Pared detectada para colocar una abertura (findNearestWallEntity) */
export interface WallPreview {
  wallId: string;
  /** Línea central de la pared (cm) */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Punto sobre la línea central (proyección del cursor) */
  x: number;
  y: number;
  /** Desplazamiento a lo largo de la pared (0..largo) */
  offset: number;
}

/** Preview de trazo de pared nueva (mousedown → mouseup, wall tool) */
export interface WallDrawPreview {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Espesor de la banda (cm); por defecto DEFAULT_WALL_THICKNESS */
  thickness?: number;
  /** Extremo magnetizado (snap de punto/ángulo aplicado); readouts en P3 */
  snapped?: boolean;
}

const SELECT_COLOR = "#3b82f6";

const WALL_STYLE: Record<string, { stroke: string; strokeWidth: number; dash?: number[] }> = {
  exterior: { stroke: "#1e3a5f", strokeWidth: 3 },
  interior: { stroke: "#6b7280", strokeWidth: 1 },
  medianera: { stroke: "#9333ea", strokeWidth: 2, dash: [8, 4] },
};

function getWallStyle(type?: string) {
  return WALL_STYLE[type ?? "interior"] ?? WALL_STYLE.interior;
}

/** Pared resaltada en modo colocación puerta/ventana (línea central) */
function WallPreviewLine({ preview }: { preview: WallPreview }) {
  return (
    <Line
      points={[preview.x1, preview.y1, preview.x2, preview.y2]}
      stroke={SELECT_COLOR}
      strokeWidth={3}
      dash={[6, 4]}
      pointerEvents="none"
    />
  );
}

/**
 * Preview de trazo mientras se dibuja una pared nueva: banda sólida (el
 * usuario ve el espesor real de la pared) + línea central punteada +
 * readouts (ángulo cerca del cursor, largo en el punto medio, indicador de
 * snap) — solo mientras el preview existe (editor-rendering-4).
 */
function WallDrawPreviewLine({ preview }: { preview: WallDrawPreview }) {
  const { wall: wallColor } = useCanvasColors();
  const thickness = preview.thickness ?? DEFAULT_WALL_THICKNESS;
  const band = wallBandPoints(preview.x1, preview.y1, preview.x2, preview.y2, thickness);
  return (
    <>
      <Line
        points={band}
        closed
        fill={wallColor}
        stroke={SELECT_COLOR}
        strokeWidth={1}
        pointerEvents="none"
      />
      <Line
        points={[preview.x1, preview.y1, preview.x2, preview.y2]}
        stroke={SELECT_COLOR}
        strokeWidth={1.5}
        dash={[8, 6]}
        pointerEvents="none"
      />
      <WallPreviewReadout preview={preview} />
    </>
  );
}

/**
 * Entidad Wall interactiva: mover (drag de la banda con snap) y
 * redimensionar (handles de extremo). El drag es manual vía listeners del
 * Stage — no Konva drag — para que la banda no se desdoble por doble
 * posicionamiento y para poder snapear el punto arrastrado.
 * Cada drag es UN paso de undo (beginGesture/endGesture).
 */
const WallEntity = memo(function WallEntity({ wall }: { wall: Wall }) {
  const moveWall = useWallsStore((s) => s.moveWall);
  const resizeWall = useWallsStore((s) => s.resizeWall);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const select = useSelectionStore((s) => s.select);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const terrain = useTerrainStore((s) => s.terrain);
  const { wall: wallColor } = useCanvasColors();
  const isSelected = selectedId === wall.id;

  // Pared degenerada (longitud cero): no se dibuja
  if (wall.x1 === wall.x2 && wall.y1 === wall.y2) return null;
  const band = wallBandPoints(wall.x1, wall.y1, wall.x2, wall.y2, wall.thickness);
  const wallStyle = getWallStyle(wall.type);

  /** Firma de listeners de arrastre: mueve o redimensiona la pared */
  const startDrag = (e: Konva.KonvaEventObject<MouseEvent>, mode: "move" | "start" | "end") => {
    if (activeTool !== "select") return; // wall tool: deja dibujar al Stage
    e.cancelBubble = true;
    select(wall.id);
    const stage = e.target.getStage();
    if (!stage) return;
    const startScreen = stage.getPointerPosition();
    if (!startScreen) return;

    const { zoom, panX, panY } = useCanvasStore.getState();
    const start = { x: (startScreen.x - panX) / zoom, y: (startScreen.y - panY) / zoom };
    const base = { x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 };
    useHistoryStore.getState().beginGesture();

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      stage.off("mousemove", handleMove);
      window.removeEventListener("mouseup", finish);
      useHistoryStore.getState().endGesture();
    };

    const handleMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
      const screen = stage.getPointerPosition();
      if (!screen) return;
      const { zoom: z, panX: px, panY: py } = useCanvasStore.getState();
      const p = { x: (screen.x - px) / z, y: (screen.y - py) / z };
      const rooms = useFloorsStore.getState().getActiveRooms();
      const others = useWallsStore
        .getState()
        .walls.filter((w) => w.id !== wall.id && w.floorId === wall.floorId);

      if (mode === "move") {
        // Mover: gate por magnetismo efectivo (flag XOR Shift, wall-drawing-6/4
        // — OFF o Shift = traslación cruda, sin snap de ningún tipo).
        // ON: snap de puntos (ambos extremos se desplazan por el mismo delta)
        // y, SOLO si el snap de punto no cambió el pointer y la pared es libre
        // (sin roomId), lock al terreno (wall-drawing-8, D3): la pared libre
        // se ancla al borde más cercano (de-punta o paralelo a espesor/2).
        const magnetize = effectiveMagnetism(useCanvasStore.getState().magnetismEnabled, e.evt.shiftKey);
        let dx = p.x - start.x;
        let dy = p.y - start.y;
        if (magnetize) {
          const snapped = snapWallPoint(p, rooms, others);
          dx = snapped.x - start.x;
          dy = snapped.y - start.y;
          if (!isSnapped(p, snapped) && !wall.roomId) {
            const translated = { ...wall, x1: base.x1 + dx, y1: base.y1 + dy, x2: base.x2 + dx, y2: base.y2 + dy };
            const locked = snapWallToTerrain(translated, terrain);
            if (locked !== translated) {
              dx = locked.x1 - base.x1;
              dy = locked.y1 - base.y1;
            }
          }
        }
        moveWall(wall.id, base.x1 + dx, base.y1 + dy, base.x2 + dx, base.y2 + dy);
        return;
      }

      // Resize: el extremo arrastrado se resuelve como en dibujo — snap de
      // puntos, luego ángulo (pivote = extremo fijo), luego terreno (banda a
      // espesor/2 con el espesor VIVO de la pared), luego crudo; el
      // magnetismo efectivo es flag XOR Shift del evento (wall-drawing-4/6/8).
      // Leer la pared viva (el closure guarda la versión del mousedown).
      const live = useWallsStore.getState().walls.find((w) => w.id === wall.id);
      if (!live) return;
      const magnetize = effectiveMagnetism(useCanvasStore.getState().magnetismEnabled, e.evt.shiftKey);
      const pivot =
        mode === "start"
          ? { x: live.x2, y: live.y2 }
          : { x: live.x1, y: live.y1 };
      const resolved = resolveWallEnd(p, pivot, rooms, others, magnetize, terrain, live.thickness);
      const next =
        mode === "start"
          ? { x1: resolved.x, y1: resolved.y, x2: live.x2, y2: live.y2 }
          : { x1: live.x1, y1: live.y1, x2: resolved.x, y2: resolved.y };
      resizeWall(wall.id, next.x1, next.y1, next.x2, next.y2);
    };

    stage.on("mousemove", handleMove);
    window.addEventListener("mouseup", finish);
  };

  return (
    <>
      <Line
        points={band}
        closed
        fill={wallColor}
        stroke={isSelected ? SELECT_COLOR : wallStyle.stroke}
        strokeWidth={isSelected ? 2 : wallStyle.strokeWidth}
        dash={isSelected ? undefined : wallStyle.dash}
        onMouseDown={(e) => startDrag(e, "move")}
      />
      {isSelected && activeTool === "select" && (
        <>
          <Circle
            x={wall.x1}
            y={wall.y1}
            radius={4}
            fill={SELECT_COLOR}
            onMouseDown={(e) => startDrag(e, "start")}
          />
          <Circle
            x={wall.x2}
            y={wall.y2}
            radius={4}
            fill={SELECT_COLOR}
            onMouseDown={(e) => startDrag(e, "end")}
          />
        </>
      )}
    </>
  );
});

export const WallLayer = memo(function WallLayer({
  wallPreview,
  drawPreview,
}: {
  wallPreview: WallPreview | null;
  drawPreview: WallDrawPreview | null;
}) {
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);
  const walls = useWallsStore(
    useShallow((s) => s.getWallsForFloor(activeFloorId))
  );

  return (
    <>
      {/* Paredes de la planta activa (entidades v4) */}
      {walls.map((wall) => (
        <WallEntity key={wall.id} wall={wall} />
      ))}

      {wallPreview && <WallPreviewLine preview={wallPreview} />}
      {drawPreview && <WallDrawPreviewLine preview={drawPreview} />}
    </>
  );
});
