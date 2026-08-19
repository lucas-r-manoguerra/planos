/**
 * Gualeguay (Entre Ríos) — FOS / FOT calculator.
 *
 * FOS (Factor de Ocupación del Suelo) = built ground-floor area / terrain area
 * FOT (Factor de Ocupación Total)     = total built area (all floors) / terrain area
 *
 * Decreto 203/16 is not available online; national baseline values are used
 * as defaults. Override via `gualeguayZones` when local data becomes
 * available.
 *
 * Coordinate system: 1 unit = 1 cm (regla 03).
 */

import { Floor, Terrain } from "@/types/plan";

// ── Zone definitions ────────────────────────────────────────────────

export interface GualeguayZone {
  /** Zone identifier (e.g., "R1", "R2", "C1") */
  id: string;
  /** Human-readable zone name */
  label: string;
  /** Maximum FOS (0–1) */
  maxFos: number;
  /** Maximum FOT (may exceed 1 for multi-story zones) */
  maxFot: number;
  /** Minimum front setback in cm */
  setbackFront: number;
  /** Minimum rear setback in cm */
  setbackRear: number;
  /** Minimum side setback in cm (each side) */
  setbackSide: number;
}

/**
 * Default Gualeguay zones — national baseline.
 * TODO: Replace with actual Decreto 203/16 values when available.
 */
export const GUALEGUAY_ZONES: GualeguayZone[] = [
  {
    id: "R1",
    label: "Residencial Unifamiliar",
    maxFos: 0.60,
    maxFot: 1.20,
    setbackFront: 500,   // 5m
    setbackRear: 300,    // 3m
    setbackSide: 50,     // 0.5m
  },
  {
    id: "R2",
    label: "Residencial Multifamiliar",
    maxFos: 0.70,
    maxFot: 2.00,
    setbackFront: 500,
    setbackRear: 300,
    setbackSide: 50,
  },
  {
    id: "C1",
    label: "Comercial",
    maxFos: 0.80,
    maxFot: 2.50,
    setbackFront: 500,
    setbackRear: 300,
    setbackSide: 100,
  },
];

/** Default zone for lots without explicit zone assignment */
export const DEFAULT_ZONE_ID = "R1";

// ── Calculation ─────────────────────────────────────────────────────

export interface FosFotResult {
  /** Ground-floor built area in m² */
  groundFloorAreaM2: number;
  /** Total built area across all floors in m² */
  totalBuiltAreaM2: number;
  /** Terrain area in m² */
  terrainAreaM2: number;
  /** FOS value (0–1) */
  fos: number;
  /** FOT value (may exceed 1) */
  fot: number;
  /** Whether FOS exceeds the zone limit */
  fosExceeded: boolean;
  /** Whether FOT exceeds the zone limit */
  fotExceeded: boolean;
  /** The zone used for limits */
  zone: GualeguayZone;
}

/**
 * Calculate FOS/FOT for a set of floors on a terrain.
 *
 * @param floors  All floors of the project
 * @param terrain The terrain entity
 * @param zoneId  Zone identifier (defaults to R1)
 */
export function calculateFosFot(
  floors: Floor[],
  terrain: Terrain,
  zoneId: string = DEFAULT_ZONE_ID,
): FosFotResult {
  const zone = GUALEGUAY_ZONES.find((z) => z.id === zoneId) ?? GUALEGUAY_ZONES[0];
  const terrainAreaM2 = (terrain.width * terrain.height) / 10_000;

  // Ground floor = first floor (level 0 or lowest level)
  const sorted = [...floors].sort((a, b) => a.level - b.level);
  const groundFloor = sorted[0];

  const groundFloorAreaM2 = groundFloor
    ? groundFloor.rooms.reduce(
        (sum, r) => sum + (r.width * r.height) / 10_000,
        0,
      )
    : 0;

  const totalBuiltAreaM2 = floors.reduce(
    (sum, floor) =>
      sum +
      floor.rooms.reduce(
        (roomSum, r) => roomSum + (r.width * r.height) / 10_000,
        0,
      ),
    0,
  );

  const fos = terrainAreaM2 > 0 ? groundFloorAreaM2 / terrainAreaM2 : 0;
  const fot = terrainAreaM2 > 0 ? totalBuiltAreaM2 / terrainAreaM2 : 0;

  return {
    groundFloorAreaM2,
    totalBuiltAreaM2,
    terrainAreaM2,
    fos,
    fot,
    fosExceeded: fos > zone.maxFos,
    fotExceeded: fot > zone.maxFot,
    zone,
  };
}

/**
 * Get setbacks for a zone (in cm).
 */
export function getZoneSetbacks(zoneId: string = DEFAULT_ZONE_ID): {
  front: number;
  rear: number;
  side: number;
} {
  const zone = GUALEGUAY_ZONES.find((z) => z.id === zoneId) ?? GUALEGUAY_ZONES[0];
  return {
    front: zone.setbackFront,
    rear: zone.setbackRear,
    side: zone.setbackSide,
  };
}
