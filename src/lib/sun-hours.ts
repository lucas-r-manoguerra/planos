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
  terrain: Terrain,
  date: Date = new Date(new Date().getFullYear(), 5, 21),
): number {
  const center: Point = {
    x: room.x + room.width / 2,
    y: room.y + room.height / 2,
  };

  const dateStr = formatDateISO(date);
  const { latitude, longitude, timezone } = sunSettings.location;
  const floorHeight = sunSettings.floorHeight;
  const northAngle = terrain.northAngle ?? 0;
  const rad = (northAngle * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

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

    const raw = computeShadowVector(azimuth, elevation, floorHeight);
    // Rotate geographic vector to canvas coordinates using terrain northAngle
    const shadowVector: Point = {
      x: raw.x * cosA + raw.y * sinA,
      y: -raw.x * sinA + raw.y * cosA,
    };

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
 *
 * Shadow polygons are pre-computed once per timestamp and reused for
 * every room — O(timestamps × rooms × rooms) without redundant
 * sun-position or shadow-vector calculations.
 */
export function computeSunHoursForAllRooms(
  rooms: Room[],
  sunSettings: SunSettings,
  terrain: Terrain,
  date: Date = new Date(new Date().getFullYear(), 5, 21),
): SunHoursResult[] {
  const { latitude, longitude, timezone } = sunSettings.location;
  const floorHeight = sunSettings.floorHeight;
  const northAngle = terrain.northAngle ?? 0;
  const rad = (northAngle * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const dateStr = formatDateISO(date);

  // Pre-compute per-room shadow polygons per timestamp.
  // Structure: hour -> roomId -> shadow polygon (Point[])
  const shadowByHour = new Map<number, Map<string, Point[]>>();

  for (let hour = SUN_EVAL_START; hour <= SUN_EVAL_END; hour += SUN_EVAL_STEP) {
    const { azimuth, elevation } = getSunPosition(
      latitude, longitude, dateStr, hour, timezone,
    );
    if (elevation <= 0) continue;

    const raw = computeShadowVector(azimuth, elevation, floorHeight);
    const sv: Point = {
      x: raw.x * cosA + raw.y * sinA,
      y: -raw.x * sinA + raw.y * cosA,
    };

    const polygons = new Map<string, Point[]>();
    for (const room of rooms) {
      polygons.set(
        room.id,
        computeShadowPolygon(room.x, room.y, room.width, room.height, sv),
      );
    }
    shadowByHour.set(hour, polygons);
  }

  return rooms.map((room) => {
    const center: Point = {
      x: room.x + room.width / 2,
      y: room.y + room.height / 2,
    };

    let sunlitSteps = 0;
    for (let hour = SUN_EVAL_START; hour <= SUN_EVAL_END; hour += SUN_EVAL_STEP) {
      const { elevation } = getSunPosition(
        latitude, longitude, dateStr, hour, timezone,
      );
      if (elevation <= 0) continue;

      const roomPolygons = shadowByHour.get(hour);
      if (!roomPolygons) continue;

      let inShadow = false;
      for (const other of rooms) {
        if (other.id === room.id) continue;
        const poly = roomPolygons.get(other.id);
        if (poly && pointInPolygon(center, poly)) {
          inShadow = true;
          break;
        }
      }

      if (!inShadow) sunlitSteps++;
    }

    const hours = sunlitSteps * SUN_EVAL_STEP;
    return {
      roomId: room.id,
      hours: Math.round(hours * 10) / 10,
      compliant: hours >= MIN_SUN_HOURS,
    };
  });
}
