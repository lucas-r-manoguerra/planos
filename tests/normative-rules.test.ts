import { describe, it, expect } from "vitest";
import { RoomType } from "@/types/plan";
import {
  MIN_DIMENSIONS,
  LIGHTING_RATIOS,
  DEFAULT_SETBACKS,
  MIN_CLEAR_PASSAGE,
  MIN_STAIR_WIDTH,
  MIN_STAIR_REST,
  MIN_GARAGE,
  COLUMN_ALIGNMENT_TOLERANCE,
  MIN_WALL_THICKNESS,
} from "@/lib/normative-rules";

describe("normative-rules", () => {
  describe("MIN_DIMENSIONS", () => {
    it("has min dimensions for all room types", () => {
      for (const type of Object.values(RoomType)) {
        expect(MIN_DIMENSIONS[type]).toBeDefined();
        expect(MIN_DIMENSIONS[type].minArea).toBeGreaterThanOrEqual(0);
        expect(MIN_DIMENSIONS[type].minSide).toBeGreaterThan(0);
      }
    });

    it("dormitorio requires 10.50 m² and 300 cm side (Resolución 5/2022)", () => {
      expect(MIN_DIMENSIONS[RoomType.DORMITORIO].minArea).toBe(10.50);
      expect(MIN_DIMENSIONS[RoomType.DORMITORIO].minSide).toBe(300);
    });

    it("baño requires 4.0 m² and 160 cm side (Resolución 5/2022)", () => {
      expect(MIN_DIMENSIONS[RoomType.BAÑO].minArea).toBe(4.0);
      expect(MIN_DIMENSIONS[RoomType.BAÑO].minSide).toBe(160);
    });

    it("pasillo has minArea 0 (no area requirement)", () => {
      expect(MIN_DIMENSIONS[RoomType.PASILLO].minArea).toBe(0);
    });
  });

  describe("LIGHTING_RATIOS", () => {
    it("has lighting ratios for relevant room types", () => {
      expect(LIGHTING_RATIOS[RoomType.DORMITORIO].minRatio).toBeCloseTo(1 / 6, 3);
      expect(LIGHTING_RATIOS[RoomType.COCINA].minRatio).toBeCloseTo(1 / 10, 3);
      expect(LIGHTING_RATIOS[RoomType.BAÑO].minVentilated).toBe(0.50);
    });

    it("pasillo has no lighting requirement", () => {
      expect(LIGHTING_RATIOS[RoomType.PASILLO].minRatio).toBe(0);
      expect(LIGHTING_RATIOS[RoomType.PASILLO].minVentilated).toBe(0);
    });

    it("estar-comedor requires 1/8 ratio", () => {
      expect(LIGHTING_RATIOS[RoomType.ESTAR_COMEDOR].minRatio).toBeCloseTo(1 / 8, 3);
    });
  });

  describe("DEFAULT_SETBACKS", () => {
    it("has sensible default setbacks", () => {
      expect(DEFAULT_SETBACKS.front).toBe(300);
      expect(DEFAULT_SETBACKS.left).toBe(150);
      expect(DEFAULT_SETBACKS.right).toBe(150);
      expect(DEFAULT_SETBACKS.rear).toBe(300);
    });
  });

  describe("clearance and structural constants", () => {
    it("min clear passage is 60cm", () => {
      expect(MIN_CLEAR_PASSAGE).toBe(60);
    });

    it("min stair width is 90cm", () => {
      expect(MIN_STAIR_WIDTH).toBe(90);
    });

    it("min stair landing is 80cm", () => {
      expect(MIN_STAIR_REST).toBe(80);
    });

    it("column alignment tolerance is 5cm", () => {
      expect(COLUMN_ALIGNMENT_TOLERANCE).toBe(5);
    });

    it("min garage is 250x500cm", () => {
      expect(MIN_GARAGE.width).toBe(250);
      expect(MIN_GARAGE.height).toBe(500);
    });

    it("has wall thickness rules for all types", () => {
      expect(MIN_WALL_THICKNESS.exterior).toBe(20);
      expect(MIN_WALL_THICKNESS.interior).toBe(8);
      expect(MIN_WALL_THICKNESS.medianera).toBe(20);
    });
  });
});
