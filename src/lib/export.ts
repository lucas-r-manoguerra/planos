/**
 * Exportación del plano a PNG.
 *
 * Captura el Stage de Konva completo (no "el primer canvas" del DOM) a una
 * resolución múltiplo (pixelRatio) y dibuja la brújula, cotas y leyenda
 * encima cuando están activas.
 */

import Konva from "konva";

import {
  drawCompassIntoCanvas,
  CompassColors,
  COMPASS_LIGHT,
  COMPASS_SIZE,
  COMPASS_ROSE_RADIUS,
} from "@/lib/compass";
import { Floor, Terrain } from "@/types/plan";
import { calculateFosFot } from "@/lib/normative/gualeguay/fos-fot";

export type ExportScale = 1 | 2 | 4;

export interface ExportPlanOptions {
  /** Resolución: 1x = pantalla, 2x y 4x para alta resolución */
  scale: ExportScale;
  /** Ángulo del Norte en grados; null = sin brújula (sol desactivado) */
  compassAngle: number | null;
  /** Colores de la brújula según el tema activo */
  colors?: CompassColors;
  /** Show cotas (dimension annotations) on rooms */
  showCotas?: boolean;
  /** Show legend (terrain info, FOS/FOT) */
  showLegend?: boolean;
  /** Floors data for legend */
  floors?: Floor[];
  /** Terrain data for legend */
  terrain?: Terrain;
}

/** Genera y descarga el PNG con la resolución pedida. */
export function exportPlanPNG(stage: Konva.Stage, options: ExportPlanOptions): void {
  const {
    scale,
    compassAngle,
    colors = COMPASS_LIGHT,
    showCotas = false,
    showLegend = false,
    floors = [],
    terrain,
  } = options;

  const uri = stage.toDataURL({ pixelRatio: scale, mimeType: "image/png" });
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(image, 0, 0);

    // Brújula en la esquina inferior derecha, escalada con la resolución
    if (compassAngle !== null) {
      const margin = 24 * scale;
      const size = COMPASS_SIZE * scale;
      drawCompassIntoCanvas(ctx, {
        centerX: canvas.width - margin - size / 2,
        centerY: canvas.height - margin - size / 2,
        radius: COMPASS_ROSE_RADIUS * scale,
        northAngle: compassAngle,
        colors,
      });
    }

    // Cotas (dimension annotations on rooms)
    if (showCotas) {
      drawCotas(ctx, stage, floors, scale);
    }

    // Leyenda
    if (showLegend && terrain) {
      drawLegend(ctx, terrain, floors, scale);
    }

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `plano-${scale}x.png`;
    link.click();
  };

  image.src = uri;
}

// ── Cotas (dimension annotations) ──────────────────────────────────

function drawCotas(
  ctx: CanvasRenderingContext2D,
  stage: Konva.Stage,
  floors: Floor[],
  scale: number,
): void {
  const stageScale = stage.scaleX();
  const stageX = stage.x();
  const stageY = stage.y();

  ctx.save();
  ctx.font = `${11 * scale}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const floor of floors) {
    for (const room of floor.rooms) {
      // Convert room coords from cm to screen pixels
      const x = (room.x * stageScale + stageX) * scale;
      const y = (room.y * stageScale + stageY) * scale;
      const w = room.width * stageScale * scale;
      const h = room.height * stageScale * scale;

      const widthM = (room.width / 100).toFixed(2);
      const heightM = (room.height / 100).toFixed(2);

      // Width dimension (top)
      ctx.fillStyle = "rgba(37, 99, 235, 0.85)"; // blue-600
      ctx.fillText(`${widthM}m`, x + w / 2, y - 10 * scale);

      // Height dimension (right side)
      ctx.save();
      ctx.translate(x + w + 10 * scale, y + h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${heightM}m`, 0, 0);
      ctx.restore();
    }
  }

  ctx.restore();
}

// ── Leyenda ─────────────────────────────────────────────────────────

function drawLegend(
  ctx: CanvasRenderingContext2D,
  terrain: Terrain,
  floors: Floor[],
  scale: number,
): void {
  const padding = 12 * scale;
  const lineHeight = 18 * scale;
  const fontSize = 12 * scale;

  // Use the canonical FOS/FOT calculator
  const fosFot = calculateFosFot(floors, terrain, terrain.zoneId);
  const terrainArea = fosFot.terrainAreaM2;

  const lines = [
    `Terreno: ${(terrain.width / 100).toFixed(1)}m × ${(terrain.height / 100).toFixed(1)}m = ${terrainArea.toFixed(1)} m²`,
    `Construido: ${fosFot.totalBuiltAreaM2.toFixed(1)} m²`,
    `FOS: ${(fosFot.fos * 100).toFixed(1)}% (máx ${(fosFot.zone.maxFos * 100).toFixed(0)}%)`,
    `FOT: ${(fosFot.fot * 100).toFixed(1)}% (máx ${(fosFot.zone.maxFot * 100).toFixed(0)}%)`,
    `Zona: ${fosFot.zone.id} — ${fosFot.zone.label}`,
  ];

  ctx.save();
  ctx.font = `${fontSize}px system-ui, sans-serif`;

  const maxTextWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const boxWidth = maxTextWidth + padding * 2;
  const boxHeight = lines.length * lineHeight + padding * 2;

  // Position: bottom-left
  const x = padding;
  const y = ctx.canvas.height - boxHeight - padding;

  // Background
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.roundRect(x, y, boxWidth, boxHeight, 4 * scale);
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.fillStyle = "rgba(31, 41, 55, 0.9)"; // gray-800
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  lines.forEach((line, i) => {
    ctx.fillText(line, x + padding, y + padding + i * lineHeight);
  });

  ctx.restore();
}
