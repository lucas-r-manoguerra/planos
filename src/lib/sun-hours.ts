import { Room, SunSettings, Terrain, Point } from "@/types/plan";
import { getSunPosition } from "./solar";
import { computeShadowVector, computeShadowPolygon } from "./shadow";
import { MIN_SUN_HOURS, SUN_EVAL_START, SUN_EVAL_END, SUN_EVAL_STEP } from "./normative-rules";

export interface SunHoursResult {
  roomId: string;
  hours: number;
  compliant: boolean;
}

/**
 * Ray casting point-in-polygon test.
 */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Format a Date as YYYY-MM-DD for getSunPosition.
 */
function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Estimate sun hours for a single room.
 *
 * Samples sun position every SUN_EVAL_STEP hours from SUN_EVAL_START to SUN_EVAL_END.
 * At each step, checks whether the room center is inside any neighbor's shadow polygon.
 * Returns the number of hours the center receives direct sunlight.
 *
 * @param room         Target room
 * @param otherRooms   All other rooms in the floor (shadow sources)
 * @param sunSettings  Location and date settings
 * @param terrain      Terrain reference (unused in simplified model, kept for API stability)
 * @param date         Evaluation date (default: June 21 — southern hemisphere winter solstice)
 */
export function computeSunHoursForRoom(
  room: Room,
  otherRooms: Room[],
  sunSettings: SunSettings,
  _terrain: Terrain,
  date: Date = new Date(2025, 5, 21),
): number {
  const center: Point = {
    x: room.x + room.width / 2,
    y: room.y + room.height / 2,
  };

  const dateStr = formatDateISO(date);
  const { latitude, longitude, timezone } = sunSettings.location;
  const floorHeight = sunSettings.floorHeight;

  let sunlitSteps = 0;

  for (let hour = SUN_EVAL_START; hour <= SUN_EVAL_END; hour += SUN_EVAL_STEP) {
    const { azimuth, elevation } = getSunPosition(
      latitude,
      longitude,
      dateStr,
      hour,
      timezone,
    );

    if (elevation <= 0) continue;

    const shadowVector = computeShadowVector(azimuth, elevation, floorHeight);

    let inShadow = false;
    for (const other of otherRooms) {
      if (other.id === room.id) continue;

      const shadowPoly = computeShadowPolygon(
        other.x,
        other.y,
        other.width,
        other.height,
        shadowVector,
      );

      if (pointInPolygon(center, shadowPoly)) {
        inShadow = true;
        break;
      }
    }

    if (!inShadow) {
      sunlitSteps++;
    }
  }

  return sunlitSteps * SUN_EVAL_STEP;
}

/**
 * Compute sun hours for all rooms. Returns results indexed by room ID.
 */
export function computeSunHoursForAllRooms(
  rooms: Room[],
  sunSettings: SunSettings,
  terrain: Terrain,
  date: Date = new Date(2025, 5, 21),
): SunHoursResult[] {
  return rooms.map((room) => {
    const otherRooms = rooms.filter((r) => r.id !== room.id);
    const hours = computeSunHoursForRoom(room, otherRooms, sunSettings, terrain, date);
    return {
      roomId: room.id,
      hours: Math.round(hours * 10) / 10,
      compliant: hours >= MIN_SUN_HOURS,
    };
  });
}
