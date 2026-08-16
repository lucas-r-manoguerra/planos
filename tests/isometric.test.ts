/**
 * Tests de la proyección isométrica (S3).
 *
 * Verifican la convención dimetric 2:1 documentada en lib/isometric.ts:
 *   sx = (x − y) * ISO_UNIT, sy = (x + y) / 2 * ISO_UNIT − z * ISO_UNIT
 * y el contrato de ViewMode (spec isometric-view-1: toggle display-only,
 * round-trip sin pérdida, default "2d").
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  ISO_UNIT,
  isoOpeningQuad,
  isoRect,
  isoWallFaces,
  projectToIsometric,
  unprojectIsometric,
} from "@/lib/isometric";
import { useCanvasStore } from "@/stores/canvas.store";
import { Wall } from "@/types/plan";

/** Pared horizontal de 300 cm, espesor 10, sobre y = 5 */
function horizontalWall(partial: Partial<Wall> = {}): Wall {
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

describe("projectToIsometric (spec isometric-view-2: pura y determinista)", () => {
  it("proyecta el origen al origen", () => {
    expect(projectToIsometric(0, 0, 0)).toEqual({ sx: 0, sy: 0 });
  });

  it("puntos conocidos en z=0 (dimetric 2:1)", () => {
    expect(projectToIsometric(100, 0, 0)).toEqual({ sx: 100, sy: 50 });
    expect(projectToIsometric(0, 100, 0)).toEqual({ sx: -100, sy: 50 });
    expect(projectToIsometric(100, 100, 0)).toEqual({ sx: 0, sy: 100 });
    expect(projectToIsometric(200, 100, 0)).toEqual({ sx: 100, sy: 150 });
  });

  it("z eleva en pantalla (sy -= z)", () => {
    expect(projectToIsometric(0, 0, 280)).toEqual({ sx: 0, sy: -280 });
    expect(projectToIsometric(100, 0, 280)).toEqual({ sx: 100, sy: -230 });
  });

  it("es determinista: mismas entradas → mismas salidas", () => {
    const a = projectToIsometric(123.456, 789.012, 280);
    const b = projectToIsometric(123.456, 789.012, 280);
    expect(a).toEqual(b);
    expect(a).toEqual({
      sx: (123.456 - 789.012) * ISO_UNIT,
      sy: ((123.456 + 789.012) / 2) * ISO_UNIT - 280 * ISO_UNIT,
    });
  });

  it("respeta ISO_UNIT como escala", () => {
    expect(ISO_UNIT).toBe(1);
    expect(projectToIsometric(10, 0, 0)).toEqual({
      sx: 10 * ISO_UNIT,
      sy: 5 * ISO_UNIT,
    });
  });
});

describe("unprojectIsometric (round-trip)", () => {
  it("unproject(project(p)) === p en el plano z dado", () => {
    const cases: Array<[number, number, number]> = [
      [0, 0, 0],
      [100, 50, 0],
      [123.4, 567.8, 280],
      [-250, 33, 120],
    ];
    for (const [x, y, z] of cases) {
      const p = projectToIsometric(x, y, z);
      const back = unprojectIsometric(p.sx, p.sy, z);
      expect(back.x).toBeCloseTo(x, 6);
      expect(back.y).toBeCloseTo(y, 6);
    }
  });

  it("project(unproject(s)) === s", () => {
    const cases: Array<[number, number, number]> = [
      [0, 0, 0],
      [100, 50, 0],
      [-665.556, 176.234, 280],
    ];
    for (const [sx, sy, z] of cases) {
      const p = unprojectIsometric(sx, sy, z);
      const fwd = projectToIsometric(p.x, p.y, z);
      expect(fwd.sx).toBeCloseTo(sx, 6);
      expect(fwd.sy).toBeCloseTo(sy, 6);
    }
  });
});

describe("isoRect", () => {
  it("proyecta los 4 vértices en orden (x,y),(x+w,y),(x+w,y+h),(x,y+h)", () => {
    expect(isoRect(0, 0, 100, 100, 0)).toEqual([
      0, 0, 100, 50, 0, 100, -100, 50,
    ]);
  });

  it("z eleva todos los vértices", () => {
    expect(isoRect(0, 0, 100, 100, 280)).toEqual([
      0, -280, 100, -230, 0, -180, -100, -230,
    ]);
  });
});

describe("isoWallFaces (pared extruida)", () => {
  const H = 280;

  it("pared horizontal: caras laterales y tapa (espesor 10, altura 280)", () => {
    const faces = isoWallFaces(horizontalWall(), H);
    expect(faces).not.toBeNull();
    expect(faces!.top).toEqual([-10, -275, 290, -125, 300, -130, 0, -280]);
    expect(faces!.sideA).toEqual([-10, 5, 290, 155, 290, -125, -10, -275]);
    expect(faces!.sideB).toEqual([0, 0, 300, 150, 300, -130, 0, -280]);
    expect(faces!.depth).toBe(77.5);
  });

  it("pared vertical: misma extrusión rotada", () => {
    const faces = isoWallFaces(
      horizontalWall({ x1: 5, y1: 0, x2: 5, y2: 200 }),
      H
    );
    expect(faces!.sideA).toEqual([0, 0, -200, 100, -200, -180, 0, -280]);
    expect(faces!.top).toEqual([0, -280, -200, -180, -190, -175, 10, -275]);
    expect(faces!.depth).toBe(52.5);
  });

  it("altura 0 → caras en el plano del piso (sin elevación)", () => {
    const faces = isoWallFaces(horizontalWall(), 0);
    expect(faces!.top).toEqual([-10, 5, 290, 155, 300, 150, 0, 0]);
  });

  it("pared degenerada (longitud 0) → null", () => {
    expect(isoWallFaces(horizontalWall({ x1: 10, x2: 10 }), H)).toBeNull();
  });

  it("es determinista", () => {
    const w = horizontalWall({ x1: 12.5, y1: 3.25, x2: 212.5, y2: 3.25, thickness: 15 });
    expect(isoWallFaces(w, H)).toEqual(isoWallFaces(w, H));
  });
});

describe("isoOpeningQuad (aberturas ancladas a paredes)", () => {
  it("puerta sobre pared horizontal: cuadrilátero en la cara +normal", () => {
    const quad = isoOpeningQuad(horizontalWall(), 100, 80, 200, 0);
    expect(quad).toEqual([90, 55, 170, 95, 170, -105, 90, -145]);
  });

  it("clampa offset fuera de rango y ancho al extremo de la pared", () => {
    expect(isoOpeningQuad(horizontalWall(), -50, 80, 200, 0)).toEqual(
      isoOpeningQuad(horizontalWall(), 0, 80, 200, 0)
    );
    // start clampa a 290; end = min(290 + 80, 300) = 300 → ancho efectivo 10
    expect(isoOpeningQuad(horizontalWall(), 290, 80, 200, 0)).toEqual(
      isoOpeningQuad(horizontalWall(), 290, 10, 200, 0)
    );
  });

  it("pared degenerada → null", () => {
    expect(
      isoOpeningQuad(horizontalWall({ x1: 5, x2: 5 }), 10, 80, 200, 0)
    ).toBeNull();
  });
});

describe("canvas.store ViewMode (spec isometric-view-1)", () => {
  beforeEach(() => {
    useCanvasStore.setState({ viewMode: "2d" });
  });

  it("el modo por defecto es 2d", () => {
    expect(useCanvasStore.getState().viewMode).toBe("2d");
  });

  it("toggle a isometric y vuelta: display-only, sin pérdida de geometría", () => {
    const before = useCanvasStore.getState();
    const snapshot = {
      zoom: before.zoom,
      panX: before.panX,
      panY: before.panY,
      activeTool: before.activeTool,
    };

    useCanvasStore.getState().setViewMode("isometric");
    expect(useCanvasStore.getState().viewMode).toBe("isometric");

    useCanvasStore.getState().setViewMode("2d");
    const after = useCanvasStore.getState();
    expect(after.viewMode).toBe("2d");
    expect({
      zoom: after.zoom,
      panX: after.panX,
      panY: after.panY,
      activeTool: after.activeTool,
    }).toEqual(snapshot);
  });
});
