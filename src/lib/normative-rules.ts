/**
 * Constantes normativas para validación de planos
 *
 * Fuentes:
 *   - Resolución 5/2022 — Programa Casa Propia – Construir Futuro
 *     (dimensiones mínimas por tipo de habitación)
 *   - CIRSOC 201: Reglamento Argentino de Edificaciones
 *     (iluminación natural, soleamiento, escaleras)
 *   - IRAM 4001: Fórmula de escalones
 *   - IRAM 1155: Accesibilidad
 *
 * Regulación local:
 *   El Decreto 203/16 de Gualeguay (Entre Ríos) no está disponible
 *   online. Se utilizan los valores nacionales como baseline.
 *   Cuando se obtenga la normativa local, ajustar estas constantes.
 *
 * Todas las medidas en centímetros (cm) salvo indicación explícita.
 */

import { RoomType } from "@/types/plan";

// ── Dimensiones mínimas por tipo de habitación (Res. 5/2022) ──────

export interface MinDimensionRule {
  minArea: number;    // m²
  minSide: number;    // cm — lado mínimo de la habitación
  minPassage?: number; // cm — ancho mínimo si es pasillo
}

export const MIN_DIMENSIONS: Record<RoomType, MinDimensionRule> = {
  [RoomType.DORMITORIO]:   { minArea: 10.50, minSide: 300 },
  [RoomType.COCINA]:       { minArea: 4.50,  minSide: 150 },
  [RoomType.BAÑO]:         { minArea: 4.00,  minSide: 160 },
  [RoomType.ESTAR_COMEDOR]:{ minArea: 18.00, minSide: 300 },
  [RoomType.LAVADERO]:     { minArea: 2.25,  minSide: 150 },
  [RoomType.PASILLO]:      { minArea: 0,     minSide: 100, minPassage: 100 },
};

// ── Iluminación natural (CIRSOC 201 Tabla 3.1.3) ─────────────────

export interface LightingRule {
  /** Ratio mínimo ventana/piso (0 = sin requisito de ratio) */
  minRatio: number;
  /** Superficie mínima de abertura ventilable en m² (0 = sin requisito) */
  minVentilated: number;
}

export const LIGHTING_RATIOS: Record<string, LightingRule> = {
  [RoomType.DORMITORIO]:    { minRatio: 1 / 6,  minVentilated: 0 },
  [RoomType.COCINA]:        { minRatio: 1 / 10, minVentilated: 0.50 },
  [RoomType.BAÑO]:          { minRatio: 0,       minVentilated: 0.50 },
  [RoomType.ESTAR_COMEDOR]: { minRatio: 1 / 8,  minVentilated: 0 },
  [RoomType.LAVADERO]:      { minRatio: 1 / 10, minVentilated: 0.50 },
  [RoomType.PASILLO]:       { minRatio: 0,       minVentilated: 0 },
};

// ── Retiros del terreno (configurables por zona) ─────────────────

export const DEFAULT_SETBACKS = {
  front: 300,  // 3.0 m — frente
  left: 150,   // 1.5 m — lateral izquierdo
  right: 150,  // 1.5 m — lateral derecho
  rear: 300,   // 3.0 m — fondo
} as const;

// ── Circulación y espacios libres ─────────────────────────────────

/** Pasaje mínimo libre entre muebles y entre muebles y paredes (cm) */
export const MIN_CLEAR_PASSAGE = 60;

// ── Escaleras (IRAM 4001 / CIRSOC 201 Art. 7.3) ─────────────────

/** Ancho mínimo del descanso (cm) */
export const MIN_STAIR_REST = 80;

/** Altura libre mínima entre tramos (cm) */
export const MIN_HEADROOM = 210;

/** Pendiente máxima del tramo (grados) */
export const MAX_STAIR_SLOPE = 40;

/** Ancho mínimo del tramo (cm) */
export const MIN_STAIR_WIDTH = 90;

// ── Cocheras (nacional) ──────────────────────────────────────────

export const MIN_GARAGE = {
  width: 250,   // cm
  height: 500,  // cm — largo mínimo para maniobra
};

// ── Soleamiento (CIRSOC 201) ─────────────────────────────────────

/** Horas mínimas de sol directo en invierno (solsticio 21 de junio) */
export const MIN_SUN_HOURS = 2;

/** Horario de evaluación solar (hora decimal) */
export const SUN_EVAL_START = 8;   // 08:00
export const SUN_EVAL_END = 16;    // 16:00
export const SUN_EVAL_STEP = 0.5;  // cada 30 minutos

// ── Estructural ──────────────────────────────────────────────────

/** Tolerancia de alineación de columnas entre pisos (cm) */
export const COLUMN_ALIGNMENT_TOLERANCE = 5;

// ── Terreno (Gualeguay — valores baseline, Decreto 203/16 pendiente) ──

/** Superficie mínima de terreno por zona (m²) — baseline nacional */
export const MIN_TERRAIN_AREA: Record<string, number> = {
  R1: 250,   // Zona R1 — residencial unifamiliar
  R2: 150,   // Zona R2 — residencial multifamiliar
  C1: 200,   // Zona C1 — comercial
};

/** Frente mínimo de terreno por zona (cm) — baseline nacional */
export const MIN_TERRAIN_FRONTAGE: Record<string, number> = {
  R1: 600,   // 6.0 m
  R2: 500,   // 5.0 m
  C1: 600,   // 6.0 m
};

// ── Paredes ──────────────────────────────────────────────────────

export const MIN_WALL_THICKNESS: Record<string, number> = {
  exterior: 20,
  interior: 8,
  medianera: 20,
};
