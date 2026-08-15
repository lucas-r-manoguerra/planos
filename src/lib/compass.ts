/**
 * Brújula: geometría compartida entre el overlay HTML (CompassOverlay) y la
 * exportación PNG (lib/export.ts).
 *
 * drawCompassIntoCanvas dibuja la rosa de los vientos en un canvas 2D,
 * replicando el visual del overlay SVG para que el export no dependa de
 * capturar el DOM.
 *
 * Ángulos en grados: 0° = Norte, sentido horario.
 */

export const COMPASS_SIZE = 120; // px — tamaño del overlay
export const COMPASS_ROSE_RADIUS = 42; // px — radio de la rosa

export interface CompassColors {
  bg: string; // fondo del círculo
  stroke: string; // borde del círculo
  text: string; // etiquetas cardinales (E/S/O) y ángulo
  north: string; // línea Norte y punta de flecha
}

export const COMPASS_LIGHT: CompassColors = {
  bg: "rgba(255, 255, 255, 0.92)",
  stroke: "#ccc",
  text: "#666666",
  north: "#e74c3c",
};

export const COMPASS_DARK: CompassColors = {
  bg: "rgba(37, 38, 43, 0.92)",
  stroke: "#4a4d55",
  text: "#909296",
  north: "#e74c3c",
};

export interface CompassDrawOptions {
  centerX: number;
  centerY: number;
  radius: number;
  /** Ángulo del Norte en grados (0° = arriba) */
  northAngle: number;
  colors?: CompassColors;
  /** Mostrar el ángulo numérico debajo de la rosa (default true) */
  showAngleLabel?: boolean;
}

export function drawCompassIntoCanvas(
  ctx: CanvasRenderingContext2D,
  opts: CompassDrawOptions
): void {
  const {
    centerX,
    centerY,
    radius,
    northAngle,
    colors = COMPASS_LIGHT,
    showAngleLabel = true,
  } = opts;

  // Círculo de fondo
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = colors.bg;
  ctx.fill();
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Punto en dirección (grados) a distancia r
  const toXY = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180;
    return {
      x: centerX + Math.sin(rad) * r,
      y: centerY - Math.cos(rad) * r,
    };
  };

  const cardinals = [
    { label: "N", deg: northAngle, color: colors.north, bold: true },
    { label: "E", deg: northAngle + 90, color: colors.text, bold: false },
    { label: "S", deg: northAngle + 180, color: colors.text, bold: false },
    { label: "O", deg: northAngle + 270, color: colors.text, bold: false },
  ];

  // Líneas de dirección
  for (const c of cardinals) {
    const inner = toXY(c.deg, 8);
    const outer = toXY(c.deg, c.bold ? radius : radius - 6);
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y);
    ctx.lineTo(outer.x, outer.y);
    ctx.strokeStyle = c.color;
    ctx.lineWidth = c.bold ? 2.5 : 1.5;
    ctx.stroke();
  }

  // Punta de flecha norte (triángulo)
  const tip = toXY(northAngle, radius);
  const baseA = toXY(northAngle + 10, radius - 14);
  const baseB = toXY(northAngle - 10, radius - 14);
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(baseA.x, baseA.y);
  ctx.lineTo(baseB.x, baseB.y);
  ctx.closePath();
  ctx.fillStyle = colors.north;
  ctx.fill();

  // Etiquetas cardinales (siguen a northAngle, el texto no rota)
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const labelR = radius + 14;
  for (const c of cardinals) {
    const p = toXY(c.deg, labelR);
    ctx.font = c.bold
      ? "bold 11px system-ui, sans-serif"
      : "11px system-ui, sans-serif";
    ctx.fillStyle = c.color;
    ctx.fillText(c.label, p.x, p.y);
  }

  // Ángulo numérico debajo
  if (showAngleLabel) {
    const normalized = ((Math.round(northAngle) % 360) + 360) % 360;
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillStyle = colors.text;
    ctx.fillText(`${normalized}°`, centerX, centerY + radius + 18);
  }
}
