/**
 * Tests of wall angle snapping (P1, wall-drawing-3 / wall-drawing-4):
 * wallAngleDeg, snapWallAngle, resolveWallEnd and effectiveMagnetism.
 * Coordinates in cm: 1 unit = 1 centimeter.
 *
 * Contract (design D1/D3, spec wall-drawing-3):
 * - wallAngleDeg -> [0, 180) undirected; the 180° boundary (lines near
 *   ~179.4°) behaves as 0° via the circular angle distance used by snap.
 * - snapWallAngle: nearest target with STRICT tolerance (< 4°), drawn length
 *   preserved along the target ray; tie -> first target in the array.
 * - resolveWallEnd: directional point snap wins by VALUE; if it does not
 *   change the point, angle snap; if that does not change it either, raw.
 *   magnetize=false -> fully raw (no point snap, no angle snap).
 */
import { describe, expect, it } from "vitest";
import { Wall } from "@/types/plan";
import {
  wallAngleDeg,
  snapWallAngle,
  resolveWallEnd,
  effectiveMagnetism,
  ANGLE_SNAP_TARGETS,
  wallReadout,
  formatAngleReadout,
  formatLengthReadout,
  isSnapped,
} from "@/lib/wall-angle-snap";

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

/** Point on a ray of `deg` degrees from the origin at `len` cm */
function at(len: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: len * Math.cos(rad), y: len * Math.sin(rad) };
}

/** Angle of the origin->p ray in degrees, [0, 360) */
function angleOf(p: { x: number; y: number }): number {
  return ((Math.atan2(p.y, p.x) * 180) / Math.PI + 360) % 360;
}

describe("wallAngleDeg", () => {
  it("returns the stroke angle in degrees within [0, 180)", () => {
    expect(wallAngleDeg({ x: 0, y: 0 }, { x: 100, y: 100 })).toBeCloseTo(45, 9);
  });

  it("is undirected: a line and its opposite share the same angle", () => {
    const leftUp = wallAngleDeg({ x: 0, y: 0 }, { x: -100, y: 100 }); // 135°
    const rightDown = wallAngleDeg({ x: 0, y: 0 }, { x: 100, y: -100 }); // -45° == 135°
    expect(leftUp).toBeCloseTo(135, 9);
    expect(rightDown).toBeCloseTo(135, 9);
    expect(leftUp).toBeCloseTo(rightDown, 9);
  });

  it("wraps the 180° boundary: a line pointing left normalizes to 0°", () => {
    expect(wallAngleDeg({ x: 0, y: 0 }, { x: -100, y: 0 })).toBe(0);
  });

  it("keeps a ~179.4° line inside [0, 180) (equivalent to ~-0.6°)", () => {
    const angle = wallAngleDeg({ x: 0, y: 0 }, { x: -100, y: 1 });
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThan(180);
    expect(angle).toBeCloseTo(179.427, 2);
  });

  it("guards zero length: returns 0 without NaN", () => {
    expect(wallAngleDeg({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
    expect(Number.isFinite(wallAngleDeg({ x: 0, y: 0 }, { x: 0.5, y: 0 }))).toBe(true);
  });
});

describe("snapWallAngle", () => {
  const start = { x: 0, y: 0 };

  it("magnetizes a 44° stroke to the 45° ray, preserving the length", () => {
    const p = at(100, 44);
    const r = snapWallAngle(p, start, ANGLE_SNAP_TARGETS, 4);
    expect(angleOf(r)).toBeCloseTo(45, 9);
    expect(Math.hypot(r.x, r.y)).toBeCloseTo(100, 9);
  });

  it("treats a ~179.4° line as 0° (circular distance), length preserved", () => {
    const p = { x: 100, y: -1 };
    const r = snapWallAngle(p, start, ANGLE_SNAP_TARGETS, 4);
    expect(angleOf(r)).toBeCloseTo(0, 9);
    expect(Math.hypot(r.x, r.y)).toBeCloseTo(Math.hypot(100, -1), 9);
  });

  it("strict tolerance: 49° (dist 4°) does NOT snap; 48.5° (dist 3.5°) does", () => {
    expect(snapWallAngle(at(100, 49), start, ANGLE_SNAP_TARGETS, 4)).toEqual(at(100, 49));
    const snapped = snapWallAngle(at(100, 48.5), start, ANGLE_SNAP_TARGETS, 4);
    expect(angleOf(snapped)).toBeCloseTo(45, 9);
  });

  it("tie between targets resolves to the FIRST target of the array", () => {
    // 45° is equidistant from 0° and 90°; with tol 46 both qualify -> first (0°)
    const p = at(100, 45);
    const r = snapWallAngle(p, start, [0, 90], 46);
    expect(angleOf(r)).toBeCloseTo(0, 9);
    expect(Math.hypot(r.x, r.y)).toBeCloseTo(100, 9);
  });

  it("guards zero length: returns the input point unchanged", () => {
    const p = { x: 5, y: 5 };
    expect(snapWallAngle(p, p, ANGLE_SNAP_TARGETS, 4)).toEqual(p);
  });
});

describe("resolveWallEnd", () => {
  it("point snap wins over angle snap (wall-drawing-3)", () => {
    const ex = 100 * Math.cos((44 * Math.PI) / 180);
    const ey = 100 * Math.sin((44 * Math.PI) / 180);
    const endpointWall = wall({ id: "w", x1: 10, y1: ey, x2: ex, y2: ey }); // horizontal
    const p = { x: ex + 1, y: ey - 0.5 }; // < 25 cm from the endpoint
    const r = resolveWallEnd(p, { x: 0, y: 0 }, [], [endpointWall], true);
    expect(r.x).toBeCloseTo(ex, 9);
    expect(r.y).toBeCloseTo(ey, 9);
  });

  it("magnetize OFF = raw pointer, no point or angle snap (wall-drawing-6)", () => {
    const ex = 100 * Math.cos((44 * Math.PI) / 180);
    const ey = 100 * Math.sin((44 * Math.PI) / 180);
    const endpointWall = wall({ id: "w", x1: 10, y1: ey, x2: ex, y2: ey });
    const p = { x: ex + 1, y: ey - 0.5 };
    const r = resolveWallEnd(p, { x: 0, y: 0 }, [], [endpointWall], false);
    expect(r.x).toBe(p.x);
    expect(r.y).toBe(p.y);
    expect(r).not.toEqual({ x: ex, y: ey });
  });

  it("anti-collapse (S2): a perpendicular wall endpoint cannot bend the stroke (wd-3)", () => {
    const vertical = wall({ id: "v", x1: 295, y1: 0, x2: 295, y2: 200 });
    const p = { x: 292, y: 100 }; // 3 cm from the vertical endpoint (295, 100)
    const r = resolveWallEnd(p, { x: 100, y: 100 }, [], [vertical], true);
    expect(r.x).toBe(292);
    expect(r.y).toBe(100);
  });

  it("a 44° diagonal stroke with no point candidates magnetizes to 45° (wd-3)", () => {
    const r = resolveWallEnd(at(100, 44), { x: 0, y: 0 }, [], [], true);
    expect(angleOf(r)).toBeCloseTo(45, 9);
    expect(Math.hypot(r.x, r.y)).toBeCloseTo(100, 9);
  });

  it("resize: an endpoint at ~46° from the stationary pivot magnetizes to 45° (wd-4)", () => {
    // Pivot = the stationary endpoint of the wall; the dragged endpoint
    // resolves exactly like a draw stroke.
    const pivot = { x: 300, y: 200 };
    const p = { x: 300 + 100 * Math.cos((46 * Math.PI) / 180), y: 200 + 100 * Math.sin((46 * Math.PI) / 180) };
    const r = resolveWallEnd(p, pivot, [], [], true);
    const angle = (Math.atan2(r.y - pivot.y, r.x - pivot.x) * 180) / Math.PI;
    expect(angle).toBeCloseTo(45, 9);
    expect(Math.hypot(r.x - pivot.x, r.y - pivot.y)).toBeCloseTo(100, 9);
  });
});

describe("effectiveMagnetism (wall-drawing-6: Shift inverts the toggle)", () => {
  it("flag XOR Shift: flag ON + no Shift = on; any mismatch = off", () => {
    expect(effectiveMagnetism(true, false)).toBe(true);
    expect(effectiveMagnetism(true, true)).toBe(false);
    expect(effectiveMagnetism(false, true)).toBe(true);
    expect(effectiveMagnetism(false, false)).toBe(false);
  });
});

describe("wallReadout (editor-rendering-4: preview readout values)", () => {
  it("horizontal 400 cm stroke reads angle 0 and length 400 cm", () => {
    const r = wallReadout(0, 0, 400, 0);
    expect(r.angleDeg).toBeCloseTo(0, 9);
    expect(r.lengthCm).toBeCloseTo(400, 9);
  });

  it("45° stroke reads angle 45 and the drawn length", () => {
    const p = at(100, 45);
    const r = wallReadout(0, 0, p.x, p.y);
    expect(r.angleDeg).toBeCloseTo(45, 9);
    expect(r.lengthCm).toBeCloseTo(100, 9);
  });

  it("a reversed segment reads the same undirected angle and length", () => {
    const p = at(100, 45);
    const forward = wallReadout(0, 0, p.x, p.y);
    const reversed = wallReadout(p.x, p.y, 0, 0);
    expect(reversed.angleDeg).toBeCloseTo(forward.angleDeg, 9);
    expect(reversed.lengthCm).toBeCloseTo(forward.lengthCm, 9);
  });

  it("derives from the SNAPPED end: a 44° pointer that magnetizes reads 45°", () => {
    const raw = at(100, 44);
    const end = resolveWallEnd(raw, { x: 0, y: 0 }, [], [], true);
    const r = wallReadout(0, 0, end.x, end.y);
    expect(r.angleDeg).toBeCloseTo(45, 9);
    expect(r.lengthCm).toBeCloseTo(100, 9);
  });

  it("zero-length segment reads angle 0 and length 0 (no NaN)", () => {
    const r = wallReadout(50, 50, 50, 50);
    expect(r.angleDeg).toBe(0);
    expect(r.lengthCm).toBe(0);
  });
});

describe("formatAngleReadout / formatLengthReadout (editor-rendering-4)", () => {
  it("rounds the angle to whole degrees with the degree sign", () => {
    expect(formatAngleReadout(44.7)).toBe("45°");
    expect(formatAngleReadout(0)).toBe("0°");
    expect(formatAngleReadout(179.4)).toBe("179°");
  });

  it("rounds the length to whole centimeters with the unit", () => {
    expect(formatLengthReadout(345.6)).toBe("346 cm");
    expect(formatLengthReadout(0)).toBe("0 cm");
    expect(formatLengthReadout(1000)).toBe("1000 cm");
  });
});

describe("isSnapped (preview.snapped flag semantics, editor-rendering-4)", () => {
  it("false when the resolved end equals the raw pointer (no snap applied)", () => {
    const raw = { x: 123, y: 45 };
    expect(isSnapped(raw, { x: 123, y: 45 })).toBe(false);
  });

  it("true when the resolution chain moved the end in x or y", () => {
    expect(isSnapped({ x: 100, y: 10 }, { x: 101, y: 10 })).toBe(true);
    expect(isSnapped({ x: 100, y: 10 }, { x: 100, y: 9.5 })).toBe(true);
  });

  it("propagation: an angle-snapped 44° stroke reports snapped; OFF stays raw", () => {
    const raw = at(100, 44);
    const magnetized = resolveWallEnd(raw, { x: 0, y: 0 }, [], [], true);
    expect(isSnapped(raw, magnetized)).toBe(true);
    const off = resolveWallEnd(raw, { x: 0, y: 0 }, [], [], false);
    expect(isSnapped(raw, off)).toBe(false);
    expect(off).toEqual(raw);
  });

  it("propagation: a point snap inside 25 cm reports snapped", () => {
    const ex = 100 * Math.cos((44 * Math.PI) / 180);
    const ey = 100 * Math.sin((44 * Math.PI) / 180);
    const endpointWall = wall({ id: "w", x1: 10, y1: ey, x2: ex, y2: ey });
    const raw = { x: ex + 1, y: ey - 0.5 };
    const resolved = resolveWallEnd(raw, { x: 0, y: 0 }, [], [endpointWall], true);
    expect(isSnapped(raw, resolved)).toBe(true);
  });
});
