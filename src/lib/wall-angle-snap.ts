/**
 * Wall angle snapping (P1, wall-drawing-3 / wall-drawing-4).
 * Pure lib: no stores or components (rule 01) — only types and other
 * lib utilities.
 *
 * Unit: centimeters (cm). Angles in degrees, undirected within [0, 180).
 *
 * Contract (design D1/D3, spec wall-drawing-3):
 * - wallAngleDeg -> [0, 180): the 180° boundary (a stroke pointing left)
 *   normalizes to 0°; lines near ~179.4° behave as ~0.6° through the
 *   circular angle distance used by the snap.
 * - snapWallAngle: nearest target with STRICT tolerance (< 4°); the drawn
 *   length is preserved along the target ray; ties resolve to the FIRST
 *   target of the array; zero-length strokes are returned unchanged.
 * - resolveWallEnd: the draw/resize endpoint chain. Directional point snap
 *   (wall-snap S2) wins; if it does not change the point, angle snap; if
 *   that does not change it either, the raw point. magnetize=false skips
 *   both snaps (wall-drawing-6: Shift inverts the toggle).
 */

import { Point, Room, Wall } from "@/types/plan";
import { snapWallPointDirectional } from "@/lib/wall-snap";
import { EPS } from "@/lib/walls";

/** Angles (degrees) that attract a stroke within tolerance */
export const ANGLE_SNAP_TARGETS = [0, 45, 90, 120, 135];

/** Strict tolerance: a distance of exactly TOLERANCE does NOT snap */
export const ANGLE_SNAP_TOLERANCE = 4;

/**
 * The magnetism switch for a given event (wall-drawing-6):
 * Shift held inverts the toggle, so the user can temporarily disable
 * magnetism without touching the toolbar.
 */
export function effectiveMagnetism(enabled: boolean, shiftKey: boolean): boolean {
  return enabled !== shiftKey;
}

/**
 * Undirected angle of the start->p stroke, in degrees within [0, 180).
 * The 180° boundary wraps to 0 (a stroke pointing exactly left reads 0°).
 */
export function wallAngleDeg(p: Point, start: Point): number {
  const dx = p.x - start.x;
  const dy = p.y - start.y;
  if (Math.abs(dx) < EPS && Math.abs(dy) < EPS) return 0; // degenerate stroke
  const degrees = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (degrees + 360) % 180;
}

/** Circular distance between two angles in [0, 180): min(|a-b|, 180-|a-b|) */
function circularAngleDist(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 180 - diff);
}

/**
 * Snap `p` onto the nearest target ray from `start`, preserving the drawn
 * length. Returns `p` unchanged when no target is within the strict
 * tolerance, or when the stroke is degenerate.
 */
export function snapWallAngle(
  p: Point,
  start: Point,
  targets: number[] = ANGLE_SNAP_TARGETS,
  tolerance: number = ANGLE_SNAP_TOLERANCE
): Point {
  const dx = p.x - start.x;
  const dy = p.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < EPS) return p; // degenerate stroke

  const current = wallAngleDeg(p, start);
  let bestTarget = -1;
  let bestDist = tolerance; // strict: dist === tolerance does not snap
  for (const target of targets) {
    const dist = circularAngleDist(current, target);
    if (dist < bestDist) {
      bestDist = dist;
      bestTarget = target;
    }
  }
  if (bestTarget < 0) return p;

  const rad = (bestTarget * Math.PI) / 180;
  return {
    x: start.x + length * Math.cos(rad),
    y: start.y + length * Math.sin(rad),
  };
}

/**
 * Resolve the free endpoint of a wall draw/resize stroke.
 *
 * Priority (wall-drawing-3): directional point snap wins; if it does not
 * change the point, angle snap; otherwise the raw point. When `magnetize`
 * is false both snaps are skipped and the raw point is returned.
 */
export function resolveWallEnd(
  p: Point,
  start: Point,
  rooms: Room[],
  walls: Wall[],
  magnetize: boolean
): Point {
  if (!magnetize) return p;

  // Point snap wins by VALUE: snapWallPointDirectional always allocates a
  // fresh object, so reference comparison would never detect a change.
  const snapped = snapWallPointDirectional(p, start, rooms, walls);
  if (snapped.x !== p.x || snapped.y !== p.y) return snapped;

  return snapWallAngle(p, start);
}
