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
import { Circle, Line, Rect } from "react-konva";
import Konva from "konva";
import { useShallow } from "zustand/react/shallow";
import { useFloorsStore } from "@/stores/floors.store";
import { useWallsStore } from "@/stores/walls.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useCanvasStore } from "@/stores/canvas.store";
import { useHistoryStore } from "@/stores/history.store";
import { Wall } from "@/types/plan";
import { snapWallPoint } from "@/lib/wall-snap";
import { useCanvasColors } from "./canvas-colors";

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
}

const SELECT_COLOR = "#3b82f6";

/** Rect de una pared: banda de `thickness` alrededor de su línea central */
function wallRect(
  wall: Wall
): { x: number; y: number; width: number; height: number } {
  if (wall.y1 === wall.y2) {
    // Horizontal
    return {
      x: Math.min(wall.x1, wall.x2),
      y: wall.y1 - wall.thickness / 2,
      width: Math.abs(wall.x2 - wall.x1),
      height: wall.thickness,
    };
  }
  // Vertical
  return {
    x: wall.x1 - wall.thickness / 2,
    y: Math.min(wall.y1, wall.y2),
    width: wall.thickness,
    height: Math.abs(wall.y2 - wall.y1),
  };
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

/** Preview de trazo mientras se dibuja una pared nueva */
function WallDrawPreviewLine({ preview }: { preview: WallDrawPreview }) {
  return (
    <Line
      points={[preview.x1, preview.y1, preview.x2, preview.y2]}
      stroke={SELECT_COLOR}
      strokeWidth={2}
      dash={[8, 6]}
      pointerEvents="none"
    />
  );
}

/**
 * Entidad Wall interactiva: mover (drag de la banda con snap) y
 * redimensionar (handles de extremo). El drag es manual vía listeners del
 * Stage — no Konva drag — para que la banda no se desdoble por doble
 * posicionamiento y para poder snapear el punto arrastrado.
 * Cada drag es UN paso de undo (beginGesture/endGesture).
 */
function WallEntity({ wall }: { wall: Wall }) {
  const moveWall = useWallsStore((s) => s.moveWall);
  const resizeWall = useWallsStore((s) => s.resizeWall);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const select = useSelectionStore((s) => s.select);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const { wall: wallColor } = useCanvasColors();
  const isSelected = selectedId === wall.id;

  const rect = wallRect(wall);
  if (rect.width <= 0 || rect.height <= 0) return null;

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

    const handleMove = () => {
      const screen = stage.getPointerPosition();
      if (!screen) return;
      const { zoom: z, panX: px, panY: py } = useCanvasStore.getState();
      const p = { x: (screen.x - px) / z, y: (screen.y - py) / z };
      const rooms = useFloorsStore.getState().getActiveRooms();
      const others = useWallsStore
        .getState()
        .walls.filter((w) => w.id !== wall.id && w.floorId === wall.floorId);
      const snapped = snapWallPoint(p, rooms, others);

      if (mode === "move") {
        // Ambos extremos se desplazan por el mismo delta (wall-drawing-4)
        const dx = snapped.x - start.x;
        const dy = snapped.y - start.y;
        moveWall(wall.id, base.x1 + dx, base.y1 + dy, base.x2 + dx, base.y2 + dy);
        return;
      }

      // Resize: extremo arrastrado va al punto snap; el otro queda fijo.
      // Leer la pared viva (el closure guarda la versión del mousedown).
      const live = useWallsStore.getState().walls.find((w) => w.id === wall.id);
      if (!live) return;
      const next =
        mode === "start"
          ? { x1: snapped.x, y1: snapped.y, x2: live.x2, y2: live.y2 }
          : { x1: live.x1, y1: live.y1, x2: snapped.x, y2: snapped.y };
      resizeWall(wall.id, next.x1, next.y1, next.x2, next.y2);
    };

    stage.on("mousemove", handleMove);
    window.addEventListener("mouseup", finish);
  };

  return (
    <>
      <Rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill={wallColor}
        stroke={isSelected ? SELECT_COLOR : undefined}
        strokeWidth={isSelected ? 2 : 0}
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
}

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
