/**
 * Funciones puras para elementos estructurales (columnas + vigas).
 *
 * Unidades: 1 unidad = 1 centímetro (cm).
 * Sin imports de stores — solo tipos de dominio (regla 01).
 */

import { Beam, Column, Point, Terrain, Wall } from "@/types/plan";
import { SNAP_THRESHOLD } from "@/lib/constants";

// Presets de sección de columnas (cm)
export const COLUMN_SECTION_PRESETS: [number, number][] = [
  [20, 20],
  [25, 25],
  [30, 30],
];

// Ancho por defecto de vigas (cm)
export const DEFAULT_BEAM_WIDTH = 20;

// Rango de vanos CIRSOC — default de aplicación, pendiente de verificación
// contra el reglamento (regla 06): NO afirmar como normativa.
export const CIRSOC_SPAN_MIN = 300; // cm
export const CIRSOC_SPAN_MAX = 600; // cm

/** Anotación de vano estructural para el overlay de dimensionado */
export interface SpanAnnotation {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Distancia en cm (entero redondeado) */
  distanceCm: number;
  /** true si la distancia cae dentro del rango CIRSOC configurable */
  inRange: boolean;
}

/**
 * Verifica si un punto (centro de columna) está dentro del terreno.
 */
export function isWithinTerrain(
  x: number,
  y: number,
  terrain: Pick<Terrain, "width" | "height">
): boolean {
  return x >= 0 && x <= terrain.width && y >= 0 && y <= terrain.height;
}

/**
 * Aclipa las coordenadas de una columna al terreno, de modo que
 * la sección completa quede dentro de los límites.
 */
export function snapToTerrainEdge(
  x: number,
  y: number,
  sectionWidth: number,
  sectionHeight: number,
  terrain: Pick<Terrain, "width" | "height">
): Point {
  const halfW = sectionWidth / 2;
  const halfH = sectionHeight / 2;
  return {
    x: Math.max(halfW, Math.min(x, terrain.width - halfW)),
    y: Math.max(halfH, Math.min(y, terrain.height - halfH)),
  };
}

/**
 * Calcula la distancia euclidiana entre los centros de dos columnas (cm).
 */
export function columnCenterDistance(a: Column, b: Column): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Centros de columnas de una planta */
export function columnCenters(floorColumns: Column[]): Point[] {
  return floorColumns.map((c) => ({ x: c.x, y: c.y }));
}

/** Extremos de paredes de una planta */
function wallEndpoints(walls: Wall[]): Point[] {
  const points: Point[] = [];
  for (const w of walls) {
    points.push({ x: w.x1, y: w.y1 });
    points.push({ x: w.x2, y: w.y2 });
  }
  return points;
}

function dist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Snapea un punto al centro de columna o extremo de pared más cercano
 * si está dentro del umbral de snap (25 cm). Si magnetismo está OFF,
 * devuelve el punto crudo.
 */
export function snapBeamEndpoint(
  p: Point,
  columns: Column[],
  walls: Wall[],
  magnetize: boolean,
): Point {
  if (!magnetize) return p;

  const candidates = [
    ...columnCenters(columns),
    ...wallEndpoints(walls),
  ];

  let best = p;
  let bestDist = SNAP_THRESHOLD;
  for (const c of candidates) {
    const d = dist(p, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/** Longitud euclidiana de una viga en cm */
export function beamLength(beam: Beam): number {
  return Math.hypot(beam.x2 - beam.x1, beam.y2 - beam.y1);
}

/** Una viga de longitud cero no es válida */
export function validateBeam(beam: Pick<Beam, "x1" | "y1" | "x2" | "y2">): boolean {
  return beamLength(beam as Beam) > 0;
}

// ── Span annotations (dimensionado automático, spec structural-dimensioning) ──

/** Umbral (cm) para considerar que un extremo de viga coincide con el centro de una columna */
const COINCIDENCE_THRESHOLD = 5;

function isInSpanRange(distanceCm: number): boolean {
  return distanceCm >= CIRSOC_SPAN_MIN && distanceCm <= CIRSOC_SPAN_MAX;
}

/**
 * Computa las anotaciones de vanos estructurales del piso activo.
 *
 * Reglas:
 * 1. Cada viga genera una anotación con su longitud.
 * 2. Columnas conectadas por una viga (extremos coinciden con centros) se
 *    anotan con distancia centro-a-centro.
 * 3. Columnas no conectadas se anotan con su vecino más cercano (cada
 *    columna anotada a lo sumo una vez).
 *
 * La memoización es responsabilidad del caller (regla 09).
 * @returns SpanAnnotation[] — nunca incluye salas ni paredes.
 */
export function computeSpanAnnotations(
  columns: Column[],
  beams: Beam[],
): SpanAnnotation[] {
  const annotations: SpanAnnotation[] = [];

  // 1) Cada viga → anotación de longitud
  for (const beam of beams) {
    const dist = beamLength(beam);
    if (dist === 0) continue;
    annotations.push({
      x1: beam.x1,
      y1: beam.y1,
      x2: beam.x2,
      y2: beam.y2,
      distanceCm: Math.round(dist),
      inRange: isInSpanRange(dist),
    });
  }

  // 2) Columnas conectadas por viga (extremos coinciden con centros)
  /** Conjunto de IDs de columnas ya anotadas vía viga */
  const beamAnnotatedCols = new Set<string>();

  for (const beam of beams) {
    const startCol = columns.find(
      (c) =>
        Math.abs(c.x - beam.x1) <= COINCIDENCE_THRESHOLD &&
        Math.abs(c.y - beam.y1) <= COINCIDENCE_THRESHOLD,
    );
    const endCol = columns.find(
      (c) =>
        Math.abs(c.x - beam.x2) <= COINCIDENCE_THRESHOLD &&
        Math.abs(c.y - beam.y2) <= COINCIDENCE_THRESHOLD,
    );
    if (startCol && endCol && startCol.id !== endCol.id) {
      const dist = columnCenterDistance(startCol, endCol);
      annotations.push({
        x1: startCol.x,
        y1: startCol.y,
        x2: endCol.x,
        y2: endCol.y,
        distanceCm: Math.round(dist),
        inRange: isInSpanRange(dist),
      });
      beamAnnotatedCols.add(startCol.id);
      beamAnnotatedCols.add(endCol.id);
    }
  }

  // 3) Columnas no conectadas → vecino más cercano (cada columna a lo sumo una vez)
  const unannotated = columns.filter((c) => !beamAnnotatedCols.has(c.id));
  const pairedCols = new Set<string>();

  for (const col of unannotated) {
    if (pairedCols.has(col.id)) continue;

    let nearest: Column | null = null;
    let nearestDist = Infinity;
    for (const other of unannotated) {
      if (other.id === col.id || pairedCols.has(other.id)) continue;
      const d = columnCenterDistance(col, other);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = other;
      }
    }

    if (nearest && nearestDist > 0) {
      annotations.push({
        x1: col.x,
        y1: col.y,
        x2: nearest.x,
        y2: nearest.y,
        distanceCm: Math.round(nearestDist),
        inRange: isInSpanRange(nearestDist),
      });
      pairedCols.add(col.id);
      pairedCols.add(nearest.id);
    }
  }

  return annotations;
}
