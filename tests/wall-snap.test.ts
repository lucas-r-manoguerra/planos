/**
 * Tests de snapping de paredes (S2): snapWallPoint y findNearestWallEntity.
 * Coordenadas en cm: 1 unidad = 1 centímetro.
 */
import { describe, expect, it } from "vitest";
import { Room, RoomType, Wall } from "@/types/plan";
import { snapWallPoint, findNearestWallEntity } from "@/lib/wall-snap";

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

describe("snapWallPoint", () => {
  it("snapea a la esquina de habitación más cercana dentro del umbral", () => {
    const room = makeRoom({ id: "r1", x: 100, y: 100, width: 200, height: 150 });
    const snapped = snapWallPoint({ x: 98, y: 102 }, [room], []);
    expect(snapped).toEqual({ x: 100, y: 100 });
  });

  it("snapea al extremo de pared más cercano", () => {
    const w = wall({ id: "w1", x1: 0, y1: 0, x2: 100, y2: 0 });
    const snapped = snapWallPoint({ x: 102, y: 3 }, [], [w]);
    expect(snapped).toEqual({ x: 100, y: 0 });
  });

  it("esquina de habitación gana aunque un extremo de pared esté más cerca", () => {
    const room = makeRoom({ id: "r1", x: 100, y: 100, width: 200, height: 150 });
    // Extremo de pared a 0.71cm del punto; esquina de habitación a 1.41cm
    const w = wall({ id: "w1", x1: 101.5, y1: 98.5, x2: 300, y2: 98.5 });
    const snapped = snapWallPoint({ x: 101, y: 99 }, [room], [w]);
    expect(snapped).toEqual({ x: 100, y: 100 });
  });

  it("comparación estricta: dist === threshold no hace snap", () => {
    const room = makeRoom({ id: "r1", x: 0, y: 0, width: 100, height: 100 });
    // Distancia exacta a la esquina (100,0) = 25 = SNAP_THRESHOLD
    const snapped = snapWallPoint({ x: 125, y: 0 }, [room], []);
    expect(snapped).toEqual({ x: 125, y: 0 });
  });

  it("distancia apenas menor al umbral sí hace snap", () => {
    const room = makeRoom({ id: "r1", x: 0, y: 0, width: 100, height: 100 });
    const snapped = snapWallPoint({ x: 124.9, y: 0 }, [room], []);
    expect(snapped).toEqual({ x: 100, y: 0 });
  });

  it("fuera del umbral devuelve el punto original sin cambios", () => {
    const room = makeRoom({ id: "r1", x: 100, y: 100, width: 100, height: 100 });
    const p = { x: 300, y: 300 };
    expect(snapWallPoint(p, [room], [])).toEqual(p);
  });
});

describe("findNearestWallEntity", () => {
  it("proyecta el punto sobre la línea central de la pared (offset a lo largo)", () => {
    const hit = findNearestWallEntity({ x: 120, y: 0 }, [wall()]);
    expect(hit).not.toBeNull();
    expect(hit!.wall.id).toBe("w1");
    expect(hit!.x).toBeCloseTo(120, 5);
    expect(hit!.y).toBeCloseTo(5, 5);
    expect(hit!.offset).toBeCloseTo(120, 5);
  });

  it("más allá del extremo: proyección clampada al extremo (offset = largo)", () => {
    const hit = findNearestWallEntity({ x: 305, y: 5 }, [wall()]);
    expect(hit).not.toBeNull();
    expect(hit!.x).toBeCloseTo(300, 5);
    expect(hit!.y).toBeCloseTo(5, 5);
    expect(hit!.offset).toBeCloseTo(300, 5);
  });

  it("antes del inicio: proyección clampada al inicio (offset = 0)", () => {
    const hit = findNearestWallEntity({ x: -5, y: 5 }, [wall()]);
    expect(hit).not.toBeNull();
    expect(hit!.x).toBeCloseTo(0, 5);
    expect(hit!.offset).toBe(0);
  });

  it("de dos paredes paralelas gana la más cercana", () => {
    const near = wall({ id: "near", y1: 5, y2: 5 });
    const far = wall({ id: "far", y1: 50, y2: 50 });
    const hit = findNearestWallEntity({ x: 100, y: 12 }, [far, near]);
    expect(hit!.wall.id).toBe("near");
  });

  it("soporta paredes en dirección negativa (x2 < x1)", () => {
    const reversed = wall({ id: "rev", x1: 300, x2: 0 });
    const hit = findNearestWallEntity({ x: 100, y: 0 }, [reversed]);
    expect(hit).not.toBeNull();
    expect(hit!.offset).toBeCloseTo(100, 5);
  });

  it("pared degenerada (longitud cero) se ignora", () => {
    const degenerate = wall({ id: "zero", x1: 50, y1: 50, x2: 50, y2: 50 });
    expect(findNearestWallEntity({ x: 50, y: 50 }, [degenerate])).toBeNull();
  });

  it("fuera del umbral devuelve null", () => {
    expect(findNearestWallEntity({ x: 100, y: 100 }, [wall()])).toBeNull();
  });

  it("comparación estricta: dist === threshold no ancla", () => {
    // Pared en y=5: distancia perpendicular exacta de 15 = umbral por defecto
    expect(findNearestWallEntity({ x: 100, y: 20 }, [wall()])).toBeNull();
  });

  it("distancia apenas menor al umbral sí ancla", () => {
    const hit = findNearestWallEntity({ x: 100, y: 19.9 }, [wall()]);
    expect(hit).not.toBeNull();
    expect(hit!.wall.id).toBe("w1");
  });
});
