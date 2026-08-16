/**
 * Geometría pura de glifos de aberturas (S4) + constantes 3D compartidas.
 *
 * Regla 01: librería pura — no importa stores ni componentes. Los cálculos de
 * hoja/arco de puertas (incl. doble hoja), el panel batiente de ventanas y el
 * arco de circunferencia viven aquí para que FixtureLayer los consuma y los
 * tests (tests/openings.test.ts) los verifiquen.
 *
 * Corrección S4 (spec openings-visualization-1: el arco de apertura se dibuja
 * desde la bisagra siguiendo el giro de la hoja): el arco sigue la trayectoria
 * de la punta de la hoja. Hoja a la derecha: la punta barre de 180° (sobre la
 * pared) a 270° (hacia arriba, dentro del plano); hoja a la izquierda: de 0° a
 * −90°. La versión S2 dibujaba el espejo (hacia abajo), inconsistente con la
 * hoja; queda corregida y testeada aquí.
 *
 * Alturas de extrusión 3D (fuente única, antes en IsometricLayer S3): puerta
 * desde el piso a 200 cm, ventana sobre alféizar de 90 cm a 120 cm. Los
 * subtipos nuevos (puerta-doble, ventana-fija, ventana-oscilobatiente) se
 * alinean automáticamente por categoría (door/window) — sin nueva maquinaria.
 */

import { FixtureCategory } from "@/types/plan";

/** Alturas de extrusión 3D de aberturas (cm) — fuente única para IsometricLayer */
export const OPENING_3D = {
  doorHeight: 200,
  windowHeight: 120,
  windowSill: 90,
} as const;

/** Lado de la bisagra de una abertura */
export type OpeningSide = "left" | "right";

/** Geometría de una hoja de puerta abierta (coordenadas locales del glifo) */
export interface DoorLeafGeometry {
  /** X de la bisagra (0 = izquierda, width = derecha) */
  hingeX: number;
  /** Dirección de giro de la punta de la hoja (+1 = derecha, −1 = izquierda) */
  dir: 1 | -1;
  /** Largo de la hoja (= ancho del vano para hoja simple) */
  leafLen: number;
  /** Punta de la hoja abierta (y negativa = hacia adentro del plano) */
  tipX: number;
  tipY: number;
  /** Arco de apertura: desde la línea de pared (0°/180°) siguiendo la hoja */
  arcStart: number;
  arcEnd: number;
}

/**
 * Hoja simple: misma geometría que el glifo S2 (bisagra + hoja), con el arco
 * corregido para seguir la trayectoria de la punta de la hoja.
 */
export function doorLeafGeometry(
  width: number,
  openingAngle: number,
  openingSide: OpeningSide
): DoorLeafGeometry {
  const hingeX = openingSide === "right" ? width : 0;
  const dir: 1 | -1 = openingSide === "right" ? -1 : 1;
  const angleRad = (openingAngle * Math.PI) / 180;
  const leafLen = width;
  return {
    hingeX,
    dir,
    leafLen,
    tipX: hingeX + dir * leafLen * Math.cos(angleRad),
    tipY: -leafLen * Math.sin(angleRad),
    arcStart: openingSide === "right" ? 180 : 0,
    arcEnd: openingSide === "right" ? 180 + openingAngle : -openingAngle,
  };
}

/**
 * Puerta doble (puerta-doble, 160 cm): dos hojas espejadas de ancho/2, cada una
 * con su bisagra y su arco. Cerrada (ángulo 0) las puntas se encuentran en el
 * centro del vano; abiertas a 90° ambas hojas apuntan hacia adentro del plano.
 */
export function doubleDoorLeafGeometry(
  width: number,
  openingAngle: number
): [DoorLeafGeometry, DoorLeafGeometry] {
  const leafLen = width / 2;
  const angleRad = (openingAngle * Math.PI) / 180;
  const left: DoorLeafGeometry = {
    hingeX: 0,
    dir: 1,
    leafLen,
    tipX: leafLen * Math.cos(angleRad),
    tipY: -leafLen * Math.sin(angleRad),
    arcStart: 0,
    arcEnd: -openingAngle,
  };
  const right: DoorLeafGeometry = {
    hingeX: width,
    dir: -1,
    leafLen,
    tipX: width - leafLen * Math.cos(angleRad),
    tipY: -leafLen * Math.sin(angleRad),
    arcStart: 180,
    arcEnd: 180 + openingAngle,
  };
  return [left, right];
}

/** Geometría del panel batiente de una ventana (pivote en el centro de altura) */
export interface WindowPaneGeometry {
  /** X de la bisagra del panel */
  hingeX: number;
  /** Largo del panel (85% del ancho del vano) */
  paneLen: number;
  /** Punta del panel abierto, relativa a la bisagra (y = centro del vano) */
  tipX: number;
  tipY: number;
  /** Arco de apertura del panel (sigue la punta, ver corrección de arco) */
  arcStart: number;
  arcEnd: number;
}

/**
 * Panel batiente a `paneAngle` grados (por defecto 45 — batiente y
 * oscilobatiente reusan este path; la hoja oscilobatiente se dibuja a 45°).
 */
export function windowPaneGeometry(
  width: number,
  openingSide: OpeningSide,
  paneAngle = 45
): WindowPaneGeometry {
  const hingeX = openingSide === "right" ? width : 0;
  const dir: 1 | -1 = openingSide === "right" ? -1 : 1;
  const paneRad = (paneAngle * Math.PI) / 180;
  const paneLen = width * 0.85;
  return {
    hingeX,
    paneLen,
    tipX: hingeX + dir * paneLen * Math.cos(paneRad),
    tipY: -paneLen * Math.sin(paneRad),
    arcStart: openingSide === "right" ? 180 : 0,
    arcEnd: openingSide === "right" ? 180 + paneAngle : -paneAngle,
  };
}

/** Puntos de un arco de circunferencia (formato Konva Line), ángulos en grados */
export function arcPoints(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  segs = 24
): number[] {
  const pts: number[] = [];
  const step = (endDeg - startDeg) / segs;
  for (let i = 0; i <= segs; i++) {
    const rad = ((startDeg + step * i) * Math.PI) / 180;
    pts.push(cx + r * Math.cos(rad), cy + r * Math.sin(rad));
  }
  return pts;
}

/**
 * Extrusión 3D de una abertura por categoría (cm): puerta desde el piso
 * (zStart 0, height 200); ventana sobre el alféizar (zStart 90, height 120).
 */
export function openingExtrusion(
  category: FixtureCategory
): { height: number; zStart: number } {
  return category === "door"
    ? { height: OPENING_3D.doorHeight, zStart: 0 }
    : { height: OPENING_3D.windowHeight, zStart: OPENING_3D.windowSill };
}
