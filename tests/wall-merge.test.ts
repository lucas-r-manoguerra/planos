/**
 * Tests de fusión colineal de paredes libres (lib/wall-merge.ts).
 * Spec: wall-drawing-7 (P2). Coordenadas en cm.
 */
import { describe, expect, it } from "vitest";
import { Wall } from "@/types/plan";
import { tryMergeCollinearWalls } from "@/lib/wall-merge";

function freeWall(partial: Partial<Wall> = {}): Wall {
  return {
    id: "w1",
    floorId: "f1",
    x1: 0,
    y1: 100,
    x2: 400,
    y2: 100,
    thickness: 10,
    ...partial,
  };
}

describe("tryMergeCollinearWalls (wd-7)", () => {
  it("merges contiguous collinear free-form walls into one union wall (P2.1)", () => {
    const a = freeWall({ id: "a", x1: 0, x2: 400 });
    const b = freeWall({ id: "b", x1: 400, x2: 700 });

    const result = tryMergeCollinearWalls([a], b);

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    const merged = result![0];
    expect(merged).toMatchObject({
      x1: 0,
      y1: 100,
      x2: 700,
      y2: 100,
      thickness: 10,
    });
    expect(merged.roomId).toBeUndefined();
    // D4: merged wall = new entity with a fresh id; both sources dropped
    expect(merged.id).not.toBe("a");
    expect(merged.id).not.toBe("b");
  });

  it("merges overlapping collinear walls into one union wall (P2.2)", () => {
    const a = freeWall({ id: "a", y1: 0, y2: 0, x1: 0, x2: 1000 });
    const b = freeWall({ id: "b", y1: 0, y2: 0, x1: 200, x2: 800 });

    const result = tryMergeCollinearWalls([a], b);

    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({ x1: 0, y1: 0, x2: 1000, y2: 0 });
  });

  it("merges contiguous diagonal walls into one union wall (P2.2)", () => {
    const a = freeWall({ id: "a", x1: 0, y1: 0, x2: 200, y2: 200 });
    const b = freeWall({ id: "b", x1: 200, y1: 200, x2: 500, y2: 500 });

    const result = tryMergeCollinearWalls([a], b);

    expect(result).toHaveLength(1);
    const merged = result![0];
    expect(merged.x1).toBeCloseTo(0, 6);
    expect(merged.y1).toBeCloseTo(0, 6);
    expect(merged.x2).toBeCloseTo(500, 6);
    expect(merged.y2).toBeCloseTo(500, 6);
  });

  it("does NOT merge when the gap exceeds EPS (P2.2)", () => {
    const a = freeWall({ id: "a", x1: 0, x2: 400 });
    const b = freeWall({ id: "b", x1: 405, x2: 700 }); // 5 cm gap > 1 cm EPS

    expect(tryMergeCollinearWalls([a], b)).toBeNull();
  });

  it("merges when the gap is within EPS (shared endpoint counts) (P2.2)", () => {
    const a = freeWall({ id: "a", x1: 0, x2: 400 });
    const b = freeWall({ id: "b", x1: 400.5, x2: 700 }); // 0.5 cm gap ≤ 1 cm EPS

    const result = tryMergeCollinearWalls([a], b);

    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({ x1: 0, x2: 700 });
  });

  it("does NOT merge walls whose thickness differs by more than EPS (P2.2)", () => {
    const a = freeWall({ id: "a", x1: 0, x2: 400 });
    const b = freeWall({ id: "b", x1: 400, x2: 700, thickness: 12 }); // diff 2 > 1

    expect(tryMergeCollinearWalls([a], b)).toBeNull();
  });

  it("does NOT merge walls on different floors (P2.2)", () => {
    const a = freeWall({ id: "a", x1: 0, x2: 400 });
    const b = freeWall({ id: "b", x1: 400, x2: 700, floorId: "f2" });

    expect(tryMergeCollinearWalls([a], b)).toBeNull();
  });

  it("does NOT merge a room-derived wall (P2.2)", () => {
    const roomWall = freeWall({ id: "a", roomId: "r1", x1: 0, x2: 400 });
    const b = freeWall({ id: "b", x1: 400, x2: 700 });

    expect(tryMergeCollinearWalls([roomWall], b)).toBeNull();
  });

  it("does NOT merge when the incoming wall is room-derived (P2.2)", () => {
    const a = freeWall({ id: "a", x1: 0, x2: 400 });
    const b = freeWall({ id: "b", x1: 400, x2: 700, roomId: "r1" });

    expect(tryMergeCollinearWalls([a], b)).toBeNull();
  });

  it("does NOT merge perpendicular walls (P2.2)", () => {
    const a = freeWall({ id: "a", x1: 0, x2: 400 }); // horizontal
    const b = freeWall({ id: "b", x1: 400, x2: 400, y1: 100, y2: 300 }); // vertical

    expect(tryMergeCollinearWalls([a], b)).toBeNull();
  });

  it("does NOT merge parallel walls on different lines (P2.2)", () => {
    const a = freeWall({ id: "a", x1: 0, x2: 400, y1: 100, y2: 100 });
    const b = freeWall({ id: "b", x1: 400, x2: 700, y1: 104, y2: 104 }); // 4 cm away

    expect(tryMergeCollinearWalls([a], b)).toBeNull();
  });

  it("merges parallel walls on nearly the same line (within EPS) (P2.2)", () => {
    const a = freeWall({ id: "a", x1: 0, x2: 400, y1: 100, y2: 100 });
    const b = freeWall({ id: "b", x1: 400, x2: 700, y1: 100.5, y2: 100.5 }); // 0.5 cm

    const result = tryMergeCollinearWalls([a], b);

    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({ x1: 0, x2: 700 });
  });

  it("merges walls drawn in opposite directions (undirected dot) (P2.2)", () => {
    const a = freeWall({ id: "a", x1: 0, x2: 400 }); // left → right
    const b = freeWall({ id: "b", x1: 700, x2: 400 }); // right → left

    const result = tryMergeCollinearWalls([a], b);

    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({ x1: 0, x2: 700 });
  });

  it("merges with the first qualifying wall and never cascades (D4) (P2.2)", () => {
    const a = freeWall({ id: "a", x1: 0, x2: 400 });
    const b = freeWall({ id: "b", x1: 400, x2: 700 });
    const c = freeWall({ id: "c", x1: 700, x2: 900 });

    const result = tryMergeCollinearWalls([a, b], c);

    // c merges with b (first match); a survives; no fixpoint to one 0–900 wall
    expect(result).toHaveLength(2);
    const merged = result!.find((w) => w.id !== "a");
    expect(merged).toMatchObject({ x1: 400, x2: 900 });
  });

  it("preserves walls that do not qualify (P2.2)", () => {
    const a = freeWall({ id: "a", x1: 0, x2: 400 });
    const perpendicular = freeWall({ id: "p", x1: 500, x2: 500, y1: 100, y2: 300 });
    const b = freeWall({ id: "b", x1: 400, x2: 700 });

    const result = tryMergeCollinearWalls([a, perpendicular], b);

    expect(result).toHaveLength(2); // merged + perpendicular
    expect(result!.some((w) => w.id === "p")).toBe(true);
    expect(result!.find((w) => w.id !== "p")).toMatchObject({ x1: 0, x2: 700 });
  });
});
