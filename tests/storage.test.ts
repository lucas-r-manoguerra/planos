/**
 * Tests de persistencia (lib/storage.ts) — funciones puras: shape,
 * export/import round-trip y migración al importar.
 */
import { describe, expect, it } from "vitest";
import {
  serializeProjectExport,
  parseProjectImport,
  isProjectDataShape,
  type ProjectData,
} from "@/lib/storage";
import { RoomType } from "@/types/plan";

function projectData(partial: Partial<ProjectData> = {}): ProjectData {
  return {
    version: 4,
    name: "Proyecto",
    terrain: { width: 800, height: 600, color: "#eee", front: "top", northAngle: 0 },
    floors: [{ id: "f1", name: "Planta Baja", level: 0, rooms: [] }],
    activeFloorId: "f1",
    sunSettings: {
      enabled: false,
      date: "2026-01-01",
      time: 12,
      location: {
        latitude: -32.05,
        longitude: -59.25,
        timezone: "America/Argentina/Buenos_Aires",
      },
      floorHeight: 280,
    },
    fixtures: [],
    walls: [],
    savedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("isProjectDataShape", () => {
  it("acepta v4 con walls: []", () => {
    expect(isProjectDataShape(projectData())).toBe(true);
  });

  it("acepta v4 sin clave walls (legado v3)", () => {
    const data = projectData();
    delete data.walls;
    expect(isProjectDataShape(data)).toBe(true);
  });

  it("rechaza walls que no son array", () => {
    expect(isProjectDataShape(projectData({ walls: "x" as unknown as [] }))).toBe(false);
  });

  it("rechaza datos sin versión", () => {
    const data = projectData();
    delete (data as Partial<ProjectData>).version;
    expect(isProjectDataShape(data)).toBe(false);
  });
});

describe("serializeProjectExport / parseProjectImport", () => {
  it("round-trip preserva las paredes", () => {
    const walls = [
      {
        id: "w1",
        floorId: "f1",
        x1: 0,
        y1: 5,
        x2: 300,
        y2: 5,
        thickness: 10,
      },
    ];
    const exported = serializeProjectExport(projectData({ walls }));
    const parsed = parseProjectImport(JSON.stringify(exported));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.project.walls).toEqual(walls);
      expect(parsed.project.version).toBe(4);
    }
  });

  it("importar un export v3 migra a v4 (paredes materializadas)", () => {
    const room = {
      id: "r1",
      label: "Sala",
      type: RoomType.ESTAR_COMEDOR,
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      wallWidth: 10,
      enclosed: true,
    };
    const v3: ProjectData = projectData({
      version: 3,
      floors: [{ id: "f1", name: "Planta Baja", level: 0, rooms: [room] }],
      walls: undefined,
    });
    delete v3.walls;
    const exported = serializeProjectExport(v3);
    const parsed = parseProjectImport(JSON.stringify(exported));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.project.version).toBe(4);
      expect(parsed.project.walls).toHaveLength(4);
      expect(parsed.project.walls?.every((w) => w.floorId === "f1")).toBe(true);
    }
  });

  it("rechaza terreno corrupto", () => {
    const exported = serializeProjectExport(projectData());
    const corrupted = JSON.parse(JSON.stringify(exported)) as {
      data: { terrain: { width: unknown } };
    };
    corrupted.data.terrain.width = "ancho";
    expect(parseProjectImport(JSON.stringify(corrupted)).ok).toBe(false);
  });

  it("rechaza JSON inválido", () => {
    expect(parseProjectImport("no-json{").ok).toBe(false);
  });
});
