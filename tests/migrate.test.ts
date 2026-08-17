/**
 * Tests de migración v2 → v3 → v4 (lib/migrate.ts).
 * v3 anclaba aberturas a habitaciones; v4 las re-ancla a entidades Wall.
 */
import { describe, expect, it } from "vitest";
import { Fixture, Floor, Room, RoomType } from "@/types/plan";
import { migrateProjectData, migrateToV4 } from "@/lib/migrate";

function makeRoom(partial: Partial<Room> & { id: string }): Room {
  return {
    type: RoomType.DORMITORIO,
    label: "Habitación",
    x: 0,
    y: 0,
    width: 300,
    height: 200,
    color: "#fff",
    snapEnabled: true,
    wallWidth: 10,
    enclosed: true,
    ...partial,
  };
}

function floorOf(id: string, rooms: Room[]): Floor {
  return { id, name: "Planta", level: 0, rooms };
}

function opening(partial: Partial<Fixture> = {}): Fixture {
  return {
    id: "d1",
    catalogId: "puerta-standard",
    label: "Puerta",
    category: "door",
    x: 60,
    y: 0,
    width: 80,
    height: 10,
    rotation: 0,
    color: "#fff",
    props: {},
    floorId: "f1",
    wallId: "r1",
    wallSide: "top",
    wallOffset: 100,
    ...partial,
  };
}

describe("migrateProjectData", () => {
  it("v2 → v4: asigna floorId a fixtures legados y materializa paredes", () => {
    const floorA = floorOf("f1", []);
    const floorB = floorOf("f2", []);
    const result = migrateProjectData({
      version: 2,
      floors: [floorA, floorB],
      fixtures: [opening({ id: "a", wallId: undefined, wallSide: undefined, wallOffset: undefined })],
    });
    expect(result.version).toBe(5);
    expect(result.fixtures?.[0]?.floorId).toBe("f1");
    expect(result.walls).toEqual([]);
    expect(result.structural).toEqual([]);
  });

  it("v5 idempotente: devuelve el mismo objeto", () => {
    const data = {
      version: 5,
      floors: [floorOf("f1", [])],
      walls: [],
      structural: [],
    };
    expect(migrateProjectData(data)).toBe(data);
  });

  it("v3 → v4: materializa paredes de las habitaciones", () => {
    const room = makeRoom({ id: "r1" });
    const result = migrateProjectData({
      version: 3,
      floors: [floorOf("f1", [room])],
    });
    expect(result.version).toBe(5);
    expect(result.structural).toEqual([]);
    expect(result.walls).toHaveLength(4);
    expect(result.walls?.every((w) => w.floorId === "f1")).toBe(true);
  });

  it("paredes de varias plantas se acumulan con su floorId", () => {
    const result = migrateProjectData({
      version: 3,
      floors: [
        floorOf("f1", [makeRoom({ id: "r1" })]),
        floorOf("f2", [makeRoom({ id: "r2" })]),
      ],
    });
    expect(result.walls).toHaveLength(8);
    expect(result.walls?.filter((w) => w.floorId === "f1")).toHaveLength(4);
    expect(result.walls?.filter((w) => w.floorId === "f2")).toHaveLength(4);
  });
});

describe("migrateToV4 — re-anclaje de aberturas", () => {
  it("abertura anclada a habitación → se re-ancla a la pared materializada", () => {
    const room = makeRoom({ id: "r1" });
    const result = migrateToV4({
      version: 3,
      floors: [floorOf("f1", [room])],
      fixtures: [opening({ id: "d1", wallId: "r1", wallSide: "top", wallOffset: 100 })],
    });
    const migrated = result.fixtures![0];
    expect(migrated).toMatchObject({
      x: 60,
      y: 0,
      rotation: 0,
      wallOffset: 100,
    });
    // El wallId ahora apunta a una entidad Wall real (no a la habitación)
    expect(result.walls?.some((w) => w.id === migrated.wallId)).toBe(true);
  });

  it("ancla a habitación inexistente → abertura sin ancla (flotando)", () => {
    const room = makeRoom({ id: "r1" });
    const result = migrateToV4({
      version: 3,
      floors: [floorOf("f1", [room])],
      fixtures: [opening({ id: "d1", wallId: "fantasma", wallSide: "top", wallOffset: 100 })],
    });
    expect(result.fixtures![0]).toEqual({
      ...opening({ id: "d1", wallId: "fantasma", wallSide: "top", wallOffset: 100 }),
      wallId: undefined,
      wallSide: undefined,
      wallOffset: undefined,
    });
  });

  it("habitación sin paredes (wallWidth 0) → abertura sin ancla", () => {
    const room = makeRoom({ id: "r1", wallWidth: 0 });
    const result = migrateToV4({
      version: 3,
      floors: [floorOf("f1", [room])],
      fixtures: [opening({ id: "d1" })],
    });
    expect(result.fixtures![0].wallId).toBeUndefined();
    expect(result.walls).toEqual([]);
  });

  it("abertura vertical (left) se re-ancla a la pared vertical materializada", () => {
    const room = makeRoom({ id: "r1" });
    const result = migrateToV4({
      version: 3,
      floors: [floorOf("f1", [room])],
      fixtures: [opening({ id: "d1", wallId: "r1", wallSide: "left", wallOffset: 100 })],
    });
    const migrated = result.fixtures![0];
    expect(migrated).toMatchObject({ rotation: 90, wallOffset: 100 });
    // x = 5 (línea central) - 80/2 = -35; y = 0 + 100 - 10/2 = 95
    expect(migrated).toMatchObject({ x: -35, y: 95 });
  });

  it("muebles y fixtures sin ancla quedan intactos", () => {
    const room = makeRoom({ id: "r1" });
    const furniture = opening({ id: "f1", category: "furniture", catalogId: "mesa", wallId: "r1" });
    const plain = opening({ id: "f2", wallId: undefined });
    const result = migrateToV4({
      version: 3,
      floors: [floorOf("f1", [room])],
      fixtures: [furniture, plain],
    });
    expect(result.fixtures![0]).toEqual(furniture);
    expect(result.fixtures![1]).toEqual(plain);
  });

  it("ancla fuera de la pared → offset clampado al extremo más cercano", () => {
    const room = makeRoom({ id: "r1" });
    const result = migrateToV4({
      version: 3,
      floors: [floorOf("f1", [room])],
      fixtures: [opening({ id: "d1", wallId: "r1", wallSide: "top", wallOffset: 500 })],
    });
    expect(result.fixtures![0].wallOffset).toBe(300);
    expect(result.fixtures![0].x).toBe(300 - 40);
  });
});
