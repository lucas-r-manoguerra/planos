/**
 * Tests: structural-utils — pure geometry functions.
 */

import { describe, expect, it } from "vitest";
import {
  isWithinTerrain,
  snapToTerrainEdge,
  columnCenterDistance,
  COLUMN_SECTION_PRESETS,
  DEFAULT_BEAM_WIDTH,
  beamLength,
  validateBeam,
  snapBeamEndpoint,
  computeSpanAnnotations,
  CIRSOC_SPAN_MIN,
  CIRSOC_SPAN_MAX,
} from "@/lib/structural-utils";
import type { Beam, Column, Terrain } from "@/types/plan";

const terrain: Pick<Terrain, "width" | "height"> = {
  width: 1000,
  height: 800,
};

describe("COLUMN_SECTION_PRESETS", () => {
  it("has exactly 3 presets", () => {
    expect(COLUMN_SECTION_PRESETS).toHaveLength(3);
  });

  it("all presets are 2-element tuples of positive integers", () => {
    for (const [w, h] of COLUMN_SECTION_PRESETS) {
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
      expect(Number.isInteger(w)).toBe(true);
      expect(Number.isInteger(h)).toBe(true);
    }
  });

  it("contains 20×20, 25×25, 30×30", () => {
    expect(COLUMN_SECTION_PRESETS).toEqual([
      [20, 20],
      [25, 25],
      [30, 30],
    ]);
  });
});

describe("isWithinTerrain", () => {
  it("returns true for point inside terrain", () => {
    expect(isWithinTerrain(500, 400, terrain)).toBe(true);
  });

  it("returns true for point at origin", () => {
    expect(isWithinTerrain(0, 0, terrain)).toBe(true);
  });

  it("returns true for point at bottom-right edge", () => {
    expect(isWithinTerrain(1000, 800, terrain)).toBe(true);
  });

  it("returns false for point outside right edge", () => {
    expect(isWithinTerrain(1001, 400, terrain)).toBe(false);
  });

  it("returns false for point outside bottom edge", () => {
    expect(isWithinTerrain(500, 801, terrain)).toBe(false);
  });

  it("returns false for negative coordinates", () => {
    expect(isWithinTerrain(-1, 400, terrain)).toBe(false);
    expect(isWithinTerrain(500, -1, terrain)).toBe(false);
  });
});

describe("snapToTerrainEdge", () => {
  it("clamps to left edge for column center near left", () => {
    const result = snapToTerrainEdge(3, 400, 20, 20, terrain);
    expect(result.x).toBe(10);
    expect(result.y).toBe(400);
  });

  it("clamps to top edge for column center near top", () => {
    const result = snapToTerrainEdge(500, 3, 20, 20, terrain);
    expect(result.x).toBe(500);
    expect(result.y).toBe(10);
  });

  it("clamps to right edge for column center near right", () => {
    const result = snapToTerrainEdge(998, 400, 20, 20, terrain);
    expect(result.x).toBe(990);
    expect(result.y).toBe(400);
  });

  it("clamps to bottom edge for column center near bottom", () => {
    const result = snapToTerrainEdge(500, 798, 20, 20, terrain);
    expect(result.x).toBe(500);
    expect(result.y).toBe(790);
  });

  it("does not clamp when well within terrain", () => {
    const result = snapToTerrainEdge(500, 400, 20, 20, terrain);
    expect(result.x).toBe(500);
    expect(result.y).toBe(400);
  });
});

describe("columnCenterDistance", () => {
  const makeCol = (x: number, y: number): Column => ({
    id: "test",
    floorId: "f1",
    x,
    y,
    sectionWidth: 20,
    sectionHeight: 20,
  });

  it("returns 0 for same point", () => {
    expect(columnCenterDistance(makeCol(100, 200), makeCol(100, 200))).toBe(0);
  });

  it("computes Euclidean distance correctly", () => {
    // 3-4-5 triangle
    expect(columnCenterDistance(makeCol(0, 0), makeCol(300, 400))).toBe(500);
  });

  it("is symmetric", () => {
    const a = makeCol(100, 200);
    const b = makeCol(300, 400);
    expect(columnCenterDistance(a, b)).toBe(columnCenterDistance(b, a));
  });
});

describe("DEFAULT_BEAM_WIDTH", () => {
  it("is 20 cm", () => {
    expect(DEFAULT_BEAM_WIDTH).toBe(20);
  });
});

describe("beamLength", () => {
  it("returns 0 for zero-length beam", () => {
    expect(beamLength({ id: "b1", floorId: "f1", x1: 100, y1: 100, x2: 100, y2: 100, width: 20 })).toBe(0);
  });

  it("computes Euclidean distance", () => {
    expect(beamLength({ id: "b1", floorId: "f1", x1: 0, y1: 0, x2: 300, y2: 400, width: 20 })).toBe(500);
  });

  it("is symmetric", () => {
    const a = { id: "b1", floorId: "f1", x1: 100, y1: 200, x2: 500, y2: 600, width: 20 };
    const b = { id: "b2", floorId: "f1", x1: 500, y1: 600, x2: 100, y2: 200, width: 20 };
    expect(beamLength(a)).toBe(beamLength(b));
  });
});

describe("validateBeam", () => {
  it("rejects zero-length beam", () => {
    expect(validateBeam({ x1: 100, y1: 100, x2: 100, y2: 100 })).toBe(false);
  });

  it("accepts valid beam", () => {
    expect(validateBeam({ x1: 0, y1: 0, x2: 300, y2: 400 })).toBe(true);
  });
});

describe("snapBeamEndpoint", () => {
  const cols: Column[] = [
    { id: "c1", floorId: "f1", x: 500, y: 500, sectionWidth: 20, sectionHeight: 20 },
  ];

  it("snaps to column center when within threshold", () => {
    const result = snapBeamEndpoint({ x: 510, y: 510 }, cols, [], true);
    expect(result.x).toBe(500);
    expect(result.y).toBe(500);
  });

  it("returns raw point when magnetize is off", () => {
    const result = snapBeamEndpoint({ x: 510, y: 510 }, cols, [], false);
    expect(result.x).toBe(510);
    expect(result.y).toBe(510);
  });

  it("returns raw point when outside threshold", () => {
    const result = snapBeamEndpoint({ x: 600, y: 600 }, cols, [], true);
    expect(result.x).toBe(600);
    expect(result.y).toBe(600);
  });
});

describe("CIRSOC span constants", () => {
  it("CIRSOC_SPAN_MIN is 300 cm", () => {
    expect(CIRSOC_SPAN_MIN).toBe(300);
  });

  it("CIRSOC_SPAN_MAX is 600 cm", () => {
    expect(CIRSOC_SPAN_MAX).toBe(600);
  });

  it("MIN < MAX", () => {
    expect(CIRSOC_SPAN_MIN).toBeLessThan(CIRSOC_SPAN_MAX);
  });
});

describe("computeSpanAnnotations", () => {
  const makeCol = (id: string, x: number, y: number): Column => ({
    id,
    floorId: "f1",
    x,
    y,
    sectionWidth: 20,
    sectionHeight: 20,
  });

  const makeBeam = (
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): Beam => ({
    id,
    floorId: "f1",
    x1,
    y1,
    x2,
    y2,
    width: 20,
  });

  it("returns empty for empty inputs", () => {
    expect(computeSpanAnnotations([], [])).toEqual([]);
  });

  it("annotates each beam by its length", () => {
    const beams = [makeBeam("b1", 0, 0, 400, 0)];
    const result = computeSpanAnnotations([], beams);
    expect(result).toHaveLength(1);
    expect(result[0].distanceCm).toBe(400);
    expect(result[0].x1).toBe(0);
    expect(result[0].x2).toBe(400);
  });

  it("filters zero-length beams", () => {
    const beams = [makeBeam("b1", 100, 100, 100, 100)];
    expect(computeSpanAnnotations([], beams)).toEqual([]);
  });

  it("annotates column-to-column distance when connected by beam endpoints", () => {
    const cols = [makeCol("c1", 100, 100), makeCol("c2", 400, 100)];
    const beams = [makeBeam("b1", 100, 100, 400, 100)];
    const result = computeSpanAnnotations(cols, beams);
    // 1 beam annotation + 1 column pair annotation
    expect(result).toHaveLength(2);
    const colAnnotation = result.find((a) => a.x1 === 100 && a.x2 === 400 && a.y1 === 100);
    expect(colAnnotation).toBeDefined();
    expect(colAnnotation!.distanceCm).toBe(300);
    expect(colAnnotation!.inRange).toBe(true);
  });

  it("marks out-of-range spans correctly", () => {
    // 800 cm beam — exceeds CIRSOC_SPAN_MAX (600)
    const beams = [makeBeam("b1", 0, 0, 800, 0)];
    const result = computeSpanAnnotations([], beams);
    expect(result[0].inRange).toBe(false);
    expect(result[0].distanceCm).toBe(800);
  });

  it("marks in-range spans correctly", () => {
    // 500 cm beam — within [300, 600]
    const beams = [makeBeam("b1", 0, 0, 500, 0)];
    const result = computeSpanAnnotations([], beams);
    expect(result[0].inRange).toBe(true);
  });

  it("pairs unconnected columns with nearest neighbor", () => {
    const cols = [
      makeCol("c1", 0, 0),
      makeCol("c2", 300, 0),
      makeCol("c3", 0, 400),
    ];
    // No beams → all unconnected
    const result = computeSpanAnnotations(cols, []);
    // c1 pairs with c2 (dist=300), c3 has no partner → 1 annotation
    expect(result).toHaveLength(1);
    expect(result[0].distanceCm).toBe(300);
  });

  it("each column annotated at most once for unconnected pairing", () => {
    // 3 columns, no beams — only one pair, one left unpaired
    const cols = [
      makeCol("c1", 0, 0),
      makeCol("c2", 100, 0),
      makeCol("c3", 200, 0),
    ];
    const result = computeSpanAnnotations(cols, []);
    // Two annotations: c1-c2 (100) and c2-c3 won't happen because c2 already paired
    // Actually: c1 nearest = c2 (100), c2 nearest = c1 (100) but c1 pairs first
    // c1→c2 paired, c3 left alone → 1 annotation
    expect(result).toHaveLength(1);
  });

  it("ignores columns already annotated via beam connection", () => {
    const cols = [
      makeCol("c1", 100, 100),
      makeCol("c2", 400, 100),
      makeCol("c3", 100, 500),
    ];
    const beams = [makeBeam("b1", 100, 100, 400, 100)];
    const result = computeSpanAnnotations(cols, beams);
    // Beam b1 length: 300cm; columns c1-c2 connected → also 300cm; c3 unpaired
    expect(result).toHaveLength(2);
    const distances = result.map((a) => a.distanceCm).sort();
    expect(distances).toEqual([300, 300]);
  });

  it("handles diagonal beams correctly", () => {
    const beams = [makeBeam("b1", 0, 0, 300, 400)];
    const result = computeSpanAnnotations([], beams);
    expect(result[0].distanceCm).toBe(500);
  });

  it("returns SpanAnnotation shape with all required fields", () => {
    const result = computeSpanAnnotations([], [makeBeam("b1", 0, 0, 350, 0)]);
    expect(result[0]).toHaveProperty("x1");
    expect(result[0]).toHaveProperty("y1");
    expect(result[0]).toHaveProperty("x2");
    expect(result[0]).toHaveProperty("y2");
    expect(result[0]).toHaveProperty("distanceCm");
    expect(result[0]).toHaveProperty("inRange");
  });
});
