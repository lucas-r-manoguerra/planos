/**
 * Tests: structural store — column CRUD operations.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { useStructuralStore } from "@/stores/structural.store";

describe("useStructuralStore", () => {
  beforeEach(() => {
    useStructuralStore.setState({ columns: [], beams: [] });
  });

  describe("addColumn", () => {
    it("adds a column with generated id and default rotation", () => {
      useStructuralStore.getState().addColumn({
        x: 100,
        y: 200,
        sectionWidth: 20,
        sectionHeight: 25,
      });

      const { columns } = useStructuralStore.getState();
      expect(columns).toHaveLength(1);
      expect(columns[0].x).toBe(100);
      expect(columns[0].y).toBe(200);
      expect(columns[0].sectionWidth).toBe(20);
      expect(columns[0].sectionHeight).toBe(25);
      expect(typeof columns[0].id).toBe("string");
      expect(columns[0].id.length).toBeGreaterThan(0);
    });
  });

  describe("moveColumn", () => {
    it("updates x and y of the column", () => {
      useStructuralStore.getState().addColumn({
        x: 100,
        y: 200,
        sectionWidth: 20,
        sectionHeight: 20,
      });

      const id = useStructuralStore.getState().columns[0].id;
      useStructuralStore.getState().moveColumn(id, 300, 400);

      const col = useStructuralStore.getState().columns.find((c) => c.id === id);
      expect(col?.x).toBe(300);
      expect(col?.y).toBe(400);
    });
  });

  describe("updateColumn", () => {
    it("patches section dimensions", () => {
      useStructuralStore.getState().addColumn({
        x: 100,
        y: 200,
        sectionWidth: 20,
        sectionHeight: 20,
      });

      const id = useStructuralStore.getState().columns[0].id;
      useStructuralStore.getState().updateColumn(id, { sectionWidth: 30 });

      const col = useStructuralStore.getState().columns.find((c) => c.id === id);
      expect(col?.sectionWidth).toBe(30);
      expect(col?.sectionHeight).toBe(20);
    });
  });

  describe("removeColumn", () => {
    it("removes a column by id", () => {
      useStructuralStore.getState().addColumn({ x: 100, y: 100, sectionWidth: 20, sectionHeight: 20 });
      useStructuralStore.getState().addColumn({ x: 200, y: 200, sectionWidth: 20, sectionHeight: 20 });
      expect(useStructuralStore.getState().columns).toHaveLength(2);

      const id = useStructuralStore.getState().columns[0].id;
      useStructuralStore.getState().removeColumn(id);

      expect(useStructuralStore.getState().columns).toHaveLength(1);
      expect(useStructuralStore.getState().columns[0].id).not.toBe(id);
    });

    it("silently ignores unknown id", () => {
      useStructuralStore.getState().addColumn({ x: 100, y: 100, sectionWidth: 20, sectionHeight: 20 });
      useStructuralStore.getState().removeColumn("nonexistent");
      expect(useStructuralStore.getState().columns).toHaveLength(1);
    });
  });

  describe("replaceStructural", () => {
    it("replaces entire columns array", () => {
      useStructuralStore.getState().addColumn({ x: 100, y: 100, sectionWidth: 20, sectionHeight: 20 });
      expect(useStructuralStore.getState().columns).toHaveLength(1);

      const replacement = [
        { id: "new-1", floorId: "f1", x: 300, y: 300, sectionWidth: 25, sectionHeight: 25 },
      ];
      useStructuralStore.getState().replaceStructural(replacement);

      expect(useStructuralStore.getState().columns).toHaveLength(1);
      expect(useStructuralStore.getState().columns[0].id).toBe("new-1");
    });

    it("replaces columns and beams from StructuralElement union", () => {
      useStructuralStore.getState().addColumn({ x: 100, y: 100, sectionWidth: 20, sectionHeight: 20 });
      const beamId = "beam-replace";
      useStructuralStore.setState({
        beams: [{ id: beamId, floorId: "f1", x1: 0, y1: 0, x2: 500, y2: 0, width: 20 }],
      });

      const replacement = [
        { id: "col-new", floorId: "f1", x: 200, y: 200, sectionWidth: 30, sectionHeight: 30 },
        { id: "beam-new", floorId: "f1", x1: 0, y1: 0, x2: 100, y2: 100, width: 15 },
      ];
      useStructuralStore.getState().replaceStructural(replacement);

      expect(useStructuralStore.getState().columns).toHaveLength(1);
      expect(useStructuralStore.getState().beams).toHaveLength(1);
      expect(useStructuralStore.getState().beams[0].id).toBe("beam-new");
      expect(useStructuralStore.getState().beams[0].width).toBe(15);
    });
  });

  describe("addBeam", () => {
    it("adds a beam with generated id", () => {
      useStructuralStore.getState().addBeam({
        x1: 0,
        y1: 0,
        x2: 500,
        y2: 0,
        width: 20,
      });

      const { beams } = useStructuralStore.getState();
      expect(beams).toHaveLength(1);
      expect(beams[0].x1).toBe(0);
      expect(beams[0].y1).toBe(0);
      expect(beams[0].x2).toBe(500);
      expect(beams[0].y2).toBe(0);
      expect(beams[0].width).toBe(20);
      expect(typeof beams[0].id).toBe("string");
      expect(beams[0].id.length).toBeGreaterThan(0);
    });
  });

  describe("updateBeam", () => {
    it("updates width of a beam", () => {
      useStructuralStore.getState().addBeam({ x1: 0, y1: 0, x2: 500, y2: 0, width: 20 });
      const id = useStructuralStore.getState().beams[0].id;

      useStructuralStore.getState().updateBeam(id, { width: 30 });

      const beam = useStructuralStore.getState().beams.find((b) => b.id === id);
      expect(beam?.width).toBe(30);
    });
  });

  describe("removeBeam", () => {
    it("removes a beam by id", () => {
      useStructuralStore.getState().addBeam({ x1: 0, y1: 0, x2: 500, y2: 0, width: 20 });
      useStructuralStore.getState().addBeam({ x1: 0, y1: 0, x2: 0, y2: 500, width: 15 });
      expect(useStructuralStore.getState().beams).toHaveLength(2);

      const id = useStructuralStore.getState().beams[0].id;
      useStructuralStore.getState().removeBeam(id);

      expect(useStructuralStore.getState().beams).toHaveLength(1);
      expect(useStructuralStore.getState().beams[0].id).not.toBe(id);
    });

    it("silently ignores unknown id", () => {
      useStructuralStore.getState().addBeam({ x1: 0, y1: 0, x2: 500, y2: 0, width: 20 });
      useStructuralStore.getState().removeBeam("nonexistent");
      expect(useStructuralStore.getState().beams).toHaveLength(1);
    });
  });

  describe("getStructuralForFloor", () => {
    it("returns columns and beams for the specified floor", () => {
      useStructuralStore.setState({
        columns: [
          { id: "c1", floorId: "f1", x: 0, y: 0, sectionWidth: 20, sectionHeight: 20 },
          { id: "c2", floorId: "f2", x: 100, y: 100, sectionWidth: 20, sectionHeight: 20 },
        ],
        beams: [
          { id: "b1", floorId: "f1", x1: 0, y1: 0, x2: 500, y2: 0, width: 20 },
          { id: "b2", floorId: "f2", x1: 0, y1: 0, x2: 0, y2: 500, width: 15 },
        ],
      });

      const result = useStructuralStore.getState().getStructuralForFloor("f1");
      expect(result).toHaveLength(2);
      expect(result.every((el) => el.floorId === "f1")).toBe(true);
    });
  });

  describe("getColumnsForFloor", () => {
    it("filters columns by floorId", () => {
      useStructuralStore.setState({
        columns: [
          { id: "c1", floorId: "f1", x: 0, y: 0, sectionWidth: 20, sectionHeight: 20 },
          { id: "c2", floorId: "f2", x: 100, y: 100, sectionWidth: 20, sectionHeight: 20 },
          { id: "c3", floorId: "f1", x: 200, y: 200, sectionWidth: 20, sectionHeight: 20 },
        ],
      });

      const result = useStructuralStore.getState().getColumnsForFloor("f1");
      expect(result).toHaveLength(2);
      expect(result.every((c) => c.floorId === "f1")).toBe(true);
    });

    it("returns empty array when no columns match", () => {
      useStructuralStore.setState({
        columns: [
          { id: "c1", floorId: "f1", x: 0, y: 0, sectionWidth: 20, sectionHeight: 20 },
        ],
      });

      expect(useStructuralStore.getState().getColumnsForFloor("nonexistent")).toEqual([]);
    });
  });
});
