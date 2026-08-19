/**
 * Tests: migrate-structural — migration chain v2→v5.
 */

import { describe, expect, it } from "vitest";
import { migrateProjectData, migrateToV5 } from "@/lib/migrate";

describe("migrateToV5", () => {
  it("adds structural: [] when missing", () => {
    const data = {
      version: 4,
      floors: [{ id: "f1", name: "P1", level: 0, rooms: [] }],
      walls: [],
    };

    const result = migrateToV5(data);
    expect(result.version).toBe(5);
    expect(result.structural).toEqual([]);
  });

  it("preserves existing structural array", () => {
    const col = { id: "c1", floorId: "f1", x: 50, y: 50, sectionWidth: 20, sectionHeight: 20 };
    const data = {
      version: 4,
      floors: [{ id: "f1", name: "P1", level: 0, rooms: [] }],
      walls: [],
      structural: [col],
    };

    const result = migrateToV5(data);
    expect(result.structural).toEqual([col]);
  });
});

describe("migrateProjectData (full chain)", () => {
  it("migrates v2 data to v5 with structural slice", () => {
    const data = {
      version: 2,
      name: "Test",
      terrain: { width: 1000, height: 1000, color: "#fff", front: "bottom" as const, northAngle: 0 },
      floors: [{ id: "f1", name: "P1", level: 0, rooms: [] }],
    };

    const result = migrateProjectData(data);
    expect(result.version).toBe(6);
    expect(result.structural).toEqual([]);
    expect(result.walls).toBeDefined();
  });

  it("is idempotent — running twice doesn't duplicate structural", () => {
    const data = {
      version: 2,
      name: "Test",
      terrain: { width: 1000, height: 1000, color: "#fff", front: "bottom" as const, northAngle: 0 },
      floors: [{ id: "f1", name: "P1", level: 0, rooms: [] }],
    };

    const first = migrateProjectData(data);
    const second = migrateProjectData(first);
    expect(second.structural).toEqual([]);
    expect(second.version).toBe(6);
  });

  it("preserves existing structural across full migration", () => {
    const col = { id: "c1", floorId: "f1", x: 50, y: 50, sectionWidth: 20, sectionHeight: 20 };
    const data = {
      version: 2,
      name: "Test",
      terrain: { width: 1000, height: 1000, color: "#fff", front: "bottom" as const, northAngle: 0 },
      floors: [{ id: "f1", name: "P1", level: 0, rooms: [] }],
      structural: [col],
    };

    const result = migrateProjectData(data);
    expect(result.structural).toEqual([col]);
  });
});
