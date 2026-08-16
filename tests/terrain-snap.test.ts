/**
 * Tests of terrain-edge snapping (terrain-edge-snap U1, wall-drawing-8):
 * angleDist, pickNearestLock, snapWallEndToTerrain (draw/resize end),
 * snapWallToTerrain (move whole-wall lock) and snapWallStart (draw start).
 * Coordinates in cm: 1 unit = 1 centimeter.
 *
 * Contract (design D1/D3/D5/D6, spec wall-drawing-8):
 * - De-punta: perpendicular stroke/end within strict < threshold of an edge
 *   snaps the endpoint ONTO the edge, other coordinate preserved.
 * - Parallel: center line within strict < threshold of the snap position
 *   snaps to `edge ∓ thickness/2` (band INSIDE, outer face at the edge).
 * - Both axes may fire independently (corner); threshold strict <
 *   (24.9 snaps, 25.0 does not); nothing clamps — beyond threshold stays;
 *   diagonal strokes/walls untouched; degenerate/collapsing locks no-ops.
 * - Move classifies by EXACT axis equality; returns the same wall ref
 *   when no lock applies (caller compares !==).
 * - snapWallStart = snapWallPoint first, then the 4 terrain corners as
 *   lowest-priority targets (strict <).
 */
import { describe, expect, it } from "vitest";
import { Room, Terrain, Wall } from "@/types/plan";
import {
  TERRAIN_ANGLE_TOLERANCE,
  angleDist,
  pickNearestLock,
  snapWallEndToTerrain,
  snapWallStart,
  snapWallToTerrain,
} from "@/lib/terrain-snap";

const terrain: Terrain = {
  width: 1000,
  height: 800,
  color: "#f0f0f0",
  front: "top",
  northAngle: 0,
};

function wall(partial: Partial<Wall> = {}): Wall {
  return {
    id: "w1",
    floorId: "f1",
    x1: 0,
    y1: 5,
    x2: 300,
    y2: 5,
    thickness: 10,
    ...partial,
  };
}

function room(partial: Partial<Room> = {}): Room {
  return {
    id: "r1",
    label: "Dormitorio 1",
    type: "Dormitorio" as Room["type"],
    x: 100,
    y: 100,
    width: 300,
    height: 300,
    ...partial,
  };
}

describe("TERRAIN_ANGLE_TOLERANCE / angleDist (D1)", () => {
  it("exposes a 4° strict tolerance matching ANGLE_SNAP_TOLERANCE", () => {
    expect(TERRAIN_ANGLE_TOLERANCE).toBe(4);
  });

  it("returns the plain difference inside [0, 180)", () => {
    expect(angleDist(0, 90)).toBe(90);
    expect(angleDist(44, 45)).toBe(1);
    expect(angleDist(120, 135)).toBe(15);
  });

  it("treats 0° and 180° as the same angle (circular wrap)", () => {
    expect(angleDist(0, 180)).toBe(0);
    expect(angleDist(179.4, 0)).toBeCloseTo(0.6, 9);
    expect(angleDist(179.4, 90)).toBeCloseTo(89.4, 9);
  });
});

describe("pickNearestLock (strict < threshold, D3)", () => {
  it("picks the delta with the smallest absolute value", () => {
    expect(pickNearestLock([-30, -10, 80], 25)).toBe(-10);
  });

  it("is strict: a delta of exactly threshold does not lock", () => {
    expect(pickNearestLock([-25, 10], 25)).toBe(10);
    expect(pickNearestLock([25], 25)).toBeNull();
  });

  it("returns null when every delta is beyond the threshold", () => {
    expect(pickNearestLock([-60, 40, 30], 25)).toBeNull();
    expect(pickNearestLock([], 25)).toBeNull();
  });

  it("resolves ties to the FIRST delta of the array", () => {
    expect(pickNearestLock([-10, 10], 25)).toBe(-10);
  });

  it("prefers a zero delta when present (already on the snap position)", () => {
    expect(pickNearestLock([-30, 0, 10], 25)).toBe(0);
  });
});

describe("snapWallEndToTerrain — draw/resize end (wd-8)", () => {
  it("de-punta: a horizontal stroke 10 cm inside the right edge snaps x to width, y preserved", () => {
    const r = snapWallEndToTerrain({ x: 990, y: 300 }, { x: 100, y: 300 }, terrain);
    expect(r).toEqual({ x: 1000, y: 300 });
  });

  it("parallel: a vertical stroke 15 cm from the right edge centers at width - t/2", () => {
    const r = snapWallEndToTerrain({ x: 985, y: 200 }, { x: 985, y: 100 }, terrain);
    expect(r).toEqual({ x: 995, y: 200 });
  });

  it("parallel honors thickness: t=20 → width - 10", () => {
    const r = snapWallEndToTerrain({ x: 985, y: 200 }, { x: 985, y: 100 }, terrain, 20);
    expect(r).toEqual({ x: 990, y: 200 });
  });

  it("band-inside: a horizontal stroke near the top edge centers at t/2 (y=0 → 5)", () => {
    const r = snapWallEndToTerrain({ x: 500, y: 10 }, { x: 100, y: 10 }, terrain);
    expect(r).toEqual({ x: 500, y: 5 });
  });

  it("corner: both axes fire for a horizontal stroke near the top-right corner", () => {
    const r = snapWallEndToTerrain({ x: 990, y: 10 }, { x: 100, y: 10 }, terrain);
    expect(r).toEqual({ x: 1000, y: 5 });
  });

  it("strict threshold: 25 cm does not snap (same ref), 24.9 does", () => {
    const p = { x: 975, y: 300 };
    expect(snapWallEndToTerrain(p, { x: 100, y: 300 }, terrain)).toBe(p);
    const r = snapWallEndToTerrain({ x: 975.1, y: 300 }, { x: 100, y: 300 }, terrain);
    expect(r).toEqual({ x: 1000, y: 300 });
  });

  it("a 45° diagonal stroke near the edge does not terrain-snap", () => {
    const p = { x: 990, y: 990 };
    expect(snapWallEndToTerrain(p, { x: 100, y: 100 }, terrain)).toBe(p);
  });

  it("a 60° stroke near the edge does not terrain-snap", () => {
    const p = { x: 990, y: 100 + 890 * Math.tan(Math.PI / 3) };
    expect(snapWallEndToTerrain(p, { x: 100, y: 100 }, terrain)).toBe(p);
  });

  it("never clamps: geometry beyond the threshold stays untouched (outside terrain)", () => {
    const right = { x: 1050, y: 300 };
    expect(snapWallEndToTerrain(right, { x: 100, y: 300 }, terrain)).toBe(right);
    const below = { x: 500, y: 850 };
    expect(snapWallEndToTerrain(below, { x: 100, y: 850 }, terrain)).toBe(below);
  });

  it("degenerate stroke (zero length) is a no-op (D6)", () => {
    const p = { x: 50, y: 50 };
    expect(snapWallEndToTerrain(p, p, terrain)).toBe(p);
  });

  it("collapse guard: a vertical stroke starting ON the top edge does not collapse onto it", () => {
    const p = { x: 100, y: 15 };
    expect(snapWallEndToTerrain(p, { x: 100, y: 0 }, terrain)).toBe(p);
  });

  it("already-on-edge is a no-op (zero-delta lock)", () => {
    const p = { x: 500, y: 5 };
    expect(snapWallEndToTerrain(p, { x: 100, y: 5 }, terrain)).toBe(p);
  });
});

describe("snapWallToTerrain — move whole-wall lock (wd-8, D3)", () => {
  it("de-punta: the nearest end of a horizontal wall locks onto the right edge (x2 → width)", () => {
    const w = wall({ x1: 100, x2: 988 });
    const r = snapWallToTerrain(w, terrain);
    expect(r).not.toBe(w);
    expect(r.x1).toBe(112);
    expect(r.x2).toBe(1000);
    expect(r.y1).toBe(w.y1);
    expect(r.y2).toBe(w.y2);
  });

  it("parallel: a vertical wall 20 cm from the right edge centers at width - t/2", () => {
    const w = wall({ x1: 980, y1: 100, x2: 980, y2: 300 });
    const r = snapWallToTerrain(w, terrain);
    expect(r.x1).toBe(995);
    expect(r.x2).toBe(995);
    expect(r.y1).toBe(w.y1);
    expect(r.y2).toBe(w.y2);
  });

  it("corner: both locks fire for a horizontal wall near the top-right corner", () => {
    const w = wall({ x1: 988, y1: 10, x2: 990, y2: 10 });
    const r = snapWallToTerrain(w, terrain);
    expect(r).toEqual({ ...w, x1: 998, x2: 1000, y1: 5, y2: 5 });
  });

  it("diagonal wall is untouched (exact-axis classification, D1)", () => {
    const w = wall({ x1: 100, y1: 100, x2: 200, y2: 300 });
    expect(snapWallToTerrain(w, terrain)).toBe(w);
  });

  it("far wall is untouched — same reference", () => {
    const w = wall({ x1: 100, y1: 100, x2: 400, y2: 100 });
    expect(snapWallToTerrain(w, terrain)).toBe(w);
  });

  it("wall outside the terrain is untouched — no clamp", () => {
    const w = wall({ x1: 1050, y1: 100, x2: 1200, y2: 100 });
    expect(snapWallToTerrain(w, terrain)).toBe(w);
  });

  it("zero-length wall is untouched (degenerate, D6)", () => {
    const w = wall({ x1: 100, y1: 100, x2: 100, y2: 100 });
    expect(snapWallToTerrain(w, terrain)).toBe(w);
  });

  it("already on the band is a no-op — same reference", () => {
    const w = wall({ x1: 100, y1: 5, x2: 400, y2: 5 });
    expect(snapWallToTerrain(w, terrain)).toBe(w);
  });
});

describe("snapWallStart — draw start (D5)", () => {
  it("room corner wins over the terrain corner (point snap priority)", () => {
    const r = room({ x: 20, y: 20 });
    // (15, 15) is 21.2 cm from the terrain corner (0,0) AND 7.1 cm from the room corner
    expect(snapWallStart({ x: 15, y: 15 }, [r], [], terrain)).toEqual({ x: 20, y: 20 });
  });

  it("wall endpoint wins over the terrain corner (point snap priority)", () => {
    const w = wall({ id: "w", x1: 10, y1: 10, x2: 50, y2: 10 });
    expect(snapWallStart({ x: 15, y: 15 }, [], [w], terrain)).toEqual({ x: 10, y: 10 });
  });

  it("snaps to the NEAREST terrain corner when no point candidate changes the point", () => {
    expect(snapWallStart({ x: 15, y: 795 }, [], [], terrain)).toEqual({ x: 0, y: 800 });
    expect(snapWallStart({ x: 995, y: 15 }, [], [], terrain)).toEqual({ x: 1000, y: 0 });
  });

  it("returns the original point when no corner is within the strict threshold", () => {
    const p = { x: 500, y: 400 };
    expect(snapWallStart(p, [], [], terrain)).toBe(p);
  });

  it("returns the original point when terrain is undefined (backward compat)", () => {
    const p = { x: 10, y: 10 };
    expect(snapWallStart(p, [], [])).toBe(p);
  });
});
