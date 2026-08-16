/**
 * Tests de snapping de paredes (S2): snapWallPoint y findNearestWallEntity.
 * Coordenadas en cm: 1 unidad = 1 centímetro.
 */
import { describe, expect, it } from "vitest";
import { Room, RoomType, Wall } from "@/types/plan";
import { snapWallPoint, snapWallPointDirectional, findNearestWallEntity } from "@/lib/wall-snap";

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

describe("snapWallPointDirectional (extremo del trazo)", () => {
  it("trazo horizontal magnetiza al extremo de una pared vertical (L, decisión 4)", () => {
    // Pared vertical con extremo (295,0) a 4.2cm del extremo del trazo (292,3):
    // la unión L/T ahora magnetiza — ya no hay filtro de orientación.
    const v = wall({ id: "v", x1: 295, y1: 0, x2: 295, y2: 200 });
    const snapped = snapWallPointDirectional(
      { x: 292, y: 3 },
      { x: 100, y: 100 },
      [],
      [v]
    );
    expect(snapped).toEqual({ x: 295, y: 0 });
  });

  it("trazo vertical magnetiza al extremo de una pared horizontal (L)", () => {
    // Pared horizontal con extremo (400,300); trazo vertical (200,100)→(398,302):
    // el extremo del trazo cae a 2.8cm del extremo de la pared → unión L.
    const h = wall({ id: "h", x1: 0, y1: 300, x2: 400, y2: 300 });
    const snapped = snapWallPointDirectional(
      { x: 398, y: 302 },
      { x: 200, y: 100 },
      [],
      [h]
    );
    expect(snapped).toEqual({ x: 400, y: 300 });
  });

  it("T contra el MEDIO de una pared no magnetiza (solo extremo-a-extremo)", () => {
    // Pared vertical (500,0)-(500,400): el extremo del trazo horizontal cae
    // sobre la línea central a 2cm, pero a ~200cm de AMBOS extremos — la unión
    // en T contra el cuerpo de la pared NO magnetiza (non-goal wd-3).
    const v = wall({ id: "v", x1: 500, y1: 0, x2: 500, y2: 400 });
    const p = { x: 498, y: 200 };
    const snapped = snapWallPointDirectional(p, { x: 100, y: 200 }, [], [v]);
    expect(snapped).toEqual(p);
  });

  it("el inicio snapeado a una esquina se conserva (snap normal no cambia)", () => {
    // El inicio usa snapWallPoint (corner priority) — no se ve afectado
    const room = makeRoom({ id: "r1", x: 100, y: 100, width: 200, height: 150 });
    const snapped = snapWallPoint({ x: 98, y: 102 }, [room], []);
    expect(snapped).toEqual({ x: 100, y: 100 });
  });

  it("trazo horizontal termina en una esquina de habitación", () => {
    const room = makeRoom({ id: "r1", x: 300, y: 0, width: 100, height: 100 });
    const snapped = snapWallPointDirectional(
      { x: 398, y: 2 },
      { x: 100, y: 100 },
      [room],
      []
    );
    expect(snapped).toEqual({ x: 400, y: 0 });
  });

  it("trazo horizontal une un extremo de pared horizontal", () => {
    const h = wall({ id: "h", x1: 0, y1: 50, x2: 300, y2: 50 });
    const snapped = snapWallPointDirectional(
      { x: 304, y: 53 },
      { x: 100, y: 100 },
      [],
      [h]
    );
    expect(snapped).toEqual({ x: 300, y: 50 });
  });

  it("trazo desde una esquina no vuelve a esa esquina (anti-colapso)", () => {
    // Caso real del bug: inicio en la esquina (300,0); extremo a la derecha
    // (320,3). Un snap completo iría a (300,0) (20.2cm) o al extremo de la
    // pared del techo (300,5) — ambos colapsarían la pared a vertical.
    const room = makeRoom({ id: "r1", x: 0, y: 0, width: 300, height: 200 });
    const h = wall({ id: "h", x1: 0, y1: 5, x2: 300, y2: 5 });
    const snapped = snapWallPointDirectional(
      { x: 320, y: 3 },
      { x: 300, y: 0 },
      [room],
      [h]
    );
    expect(snapped).toEqual({ x: 320, y: 3 });
  });

  it("trazo vertical desde una esquina sigue recto hasta la esquina opuesta", () => {
    const room = makeRoom({ id: "r1", x: 0, y: 0, width: 300, height: 200 });
    const snapped = snapWallPointDirectional(
      { x: 300, y: 200 },
      { x: 300, y: 0 },
      [room],
      []
    );
    expect(snapped).toEqual({ x: 300, y: 200 });
  });

  it("trazo vertical no colapsa contra un extremo de pared horizontal", () => {
    // Pared horizontal (0,50)-(300,50); trazo vertical (150,100)→(150,-40):
    // sin filtro de orientación ambos extremos (0,50) y (300,50) son
    // candidatos, pero están a ~175cm del extremo del trazo — fuera del
    // umbral (25cm) → sin snap (raw).
    const h = wall({ id: "h", x1: 0, y1: 50, x2: 300, y2: 50 });
    const snapped = snapWallPointDirectional(
      { x: 150, y: -40 },
      { x: 150, y: 100 },
      [],
      [h]
    );
    expect(snapped).toEqual({ x: 150, y: -40 });
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
