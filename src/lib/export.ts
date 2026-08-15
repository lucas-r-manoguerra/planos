/**
 * Exportación del plano a PNG.
 *
 * Captura el Stage de Konva completo (no "el primer canvas" del DOM) a una
 * resolución múltiplo (pixelRatio) y dibuja la brújula encima cuando la
 * simulación solar está activa, usando la misma geometría que el overlay
 * (lib/compass.ts) para que el resultado sea idéntico al editor.
 */

import Konva from "konva";

import {
  drawCompassIntoCanvas,
  CompassColors,
  COMPASS_LIGHT,
  COMPASS_SIZE,
  COMPASS_ROSE_RADIUS,
} from "@/lib/compass";

export type ExportScale = 1 | 2 | 4;

export interface ExportPlanOptions {
  /** Resolución: 1x = pantalla, 2x y 4x para alta resolución */
  scale: ExportScale;
  /** Ángulo del Norte en grados; null = sin brújula (sol desactivado) */
  compassAngle: number | null;
  /** Colores de la brújula según el tema activo */
  colors?: CompassColors;
}

/** Genera y descarga el PNG con la resolución pedida. */
export function exportPlanPNG(stage: Konva.Stage, options: ExportPlanOptions): void {
  const { scale, compassAngle, colors = COMPASS_LIGHT } = options;

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

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `plano-${scale}x.png`;
    link.click();
  };

  image.src = uri;
}
