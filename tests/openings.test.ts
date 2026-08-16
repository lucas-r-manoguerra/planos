/**
 * Tests de geometría de aberturas (S4).
 *
 * Cubren (spec openings-visualization-1/2):
 * - Paridad unión ↔ catálogo (rule 03): type + catálogo + renderer en un PR;
 *   si un subtipo existe en el tipo pero no en el catálogo (o viceversa),
 *   algo falla aquí (typecheck para la unión, runtime para el catálogo).
 * - Validez del catálogo y props de los subtipos nuevos.
 * - Corrección del arco: el arco de apertura sigue la punta de la hoja
 *   (derecha 180→270, izquierda 0→−90) — versión S2 dibujaba el espejo.
 * - Doble hoja espejada (puerta-doble), panel de ventana a 45° y extrusión
 *   3D por categoría (openingExtrusion / OPENING_3D, fuente única).
 */
import { describe, expect, it } from "vitest";
import { FIXTURE_CATALOG, getCatalogItem } from "@/lib/fixtures-catalog";
import {
  OPENING_3D,
  arcPoints,
  doorLeafGeometry,
  doubleDoorLeafGeometry,
  openingExtrusion,
  windowPaneGeometry,
} from "@/lib/openings";
import { DoorSubtype, WindowSubtype } from "@/types/plan";

// Arreglos tipados: si un id no es un subtipo válido, el typecheck falla.
// El test runtime cubre la dirección inversa (todo subtipo tiene entrada).
const DOOR_SUBTYPES: DoorSubtype[] = [
  "puerta-standard",
  "puerta-americana",
  "puerta-garage",
  "puerta-corrediza",
  "puerta-balcon",
  "puerta-doble",
];

const WINDOW_SUBTYPES: WindowSubtype[] = [
  "ventana-standard",
  "ventana-corrediza",
  "ventana-batiente",
  "ventanal",
  "ventana-fija",
  "ventana-oscilobatiente",
];

describe("catálogo ↔ unión de subtipos (rule 03)", () => {
  it("todo DoorSubtype/WindowSubtype tiene entrada en el catálogo", () => {
    for (const id of DOOR_SUBTYPES) {
      expect(getCatalogItem(id), id).toBeDefined();
    }
    for (const id of WINDOW_SUBTYPES) {
      expect(getCatalogItem(id), id).toBeDefined();
    }
  });

  it("toda entrada door/window del catálogo está en la unión de subtipos", () => {
    const known = [...DOOR_SUBTYPES, ...WINDOW_SUBTYPES];
    const catalogOpeningIds = FIXTURE_CATALOG.filter(
      (item) => item.category === "door" || item.category === "window"
    ).map((item) => item.id);
    for (const id of catalogOpeningIds) {
      expect(known, id).toContain(id);
    }
  });
});

describe("catálogo (S4)", () => {
  it("ids únicos", () => {
    const ids = FIXTURE_CATALOG.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("campos requeridos en todas las entradas", () => {
    for (const item of FIXTURE_CATALOG) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.width).toBeGreaterThan(0);
      expect(item.height).toBeGreaterThan(0);
      expect(item.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("puerta-doble: 160 cm, doble hoja, apertura derecha", () => {
    const d = getCatalogItem("puerta-doble")!;
    expect(d.category).toBe("door");
    expect(d.width).toBe(160);
    expect(d.props?.double).toBe(true);
    expect(d.props?.isOpen).toBe(true);
    expect(d.props?.openingAngle).toBe(90);
    expect(d.props?.openingSide).toBe("right");
  });

  it("ventana-fija: isOpen false (sin hoja → marco fijo)", () => {
    const w = getCatalogItem("ventana-fija")!;
    expect(w.category).toBe("window");
    expect(w.props?.isOpen).toBe(false);
    expect(w.props?.sliding).toBeUndefined();
  });

  it("ventana-oscilobatiente: panel a 45°", () => {
    const w = getCatalogItem("ventana-oscilobatiente")!;
    expect(w.category).toBe("window");
    expect(w.props?.isOpen).toBe(true);
    expect(w.props?.openingAngle).toBe(45);
    expect(w.props?.openingSide).toBe("right");
  });
});

describe("doorLeafGeometry (arco corregido: sigue la punta de la hoja)", () => {
  it("hoja derecha a 90°: bisagra en width, punta hacia adentro del plano", () => {
    const g = doorLeafGeometry(80, 90, "right");
    expect(g.hingeX).toBe(80);
    expect(g.dir).toBe(-1);
    expect(g.leafLen).toBe(80);
    // 90°: cos=0, sin=1 → punta (80, −80)
    expect(g.tipX).toBeCloseTo(80, 6);
    expect(g.tipY).toBeCloseTo(-80, 6);
    expect(g.arcStart).toBe(180);
    expect(g.arcEnd).toBe(270);
  });

  it("hoja izquierda a 90°: bisagra en 0, arco 0 → −90", () => {
    const g = doorLeafGeometry(80, 90, "left");
    expect(g.hingeX).toBe(0);
    expect(g.dir).toBe(1);
    expect(g.tipX).toBeCloseTo(0, 6);
    expect(g.tipY).toBeCloseTo(-80, 6);
    expect(g.arcStart).toBe(0);
    expect(g.arcEnd).toBe(-90);
  });

  it("cerrada (0°): la hoja coincide con la línea de pared", () => {
    const g = doorLeafGeometry(80, 0, "right");
    expect(g.tipX).toBeCloseTo(0, 6); // de la bisagra (80) al borde opuesto (0)
    expect(g.tipY).toBeCloseTo(0, 6);
  });

  it("ángulo parcial (45°): la punta barre 180 → 225", () => {
    const g = doorLeafGeometry(80, 45, "right");
    expect(g.arcStart).toBe(180);
    expect(g.arcEnd).toBe(225);
  });
});

describe("doubleDoorLeafGeometry (puerta-doble: hojas espejadas)", () => {
  it("abiertas a 90°: ambas hojas hacia adentro del plano", () => {
    const [left, right] = doubleDoorLeafGeometry(160, 90);
    expect(left.hingeX).toBe(0);
    expect(left.leafLen).toBe(80);
    expect(right.hingeX).toBe(160);
    expect(right.leafLen).toBe(80);
    expect(left.tipX).toBeCloseTo(0, 6);
    expect(left.tipY).toBeCloseTo(-80, 6);
    expect(right.tipX).toBeCloseTo(160, 6);
    expect(right.tipY).toBeCloseTo(-80, 6);
  });

  it("cerradas (0°): las puntas se encuentran en el centro del vano", () => {
    const [left, right] = doubleDoorLeafGeometry(160, 0);
    expect(left.tipX).toBeCloseTo(80, 6);
    expect(right.tipX).toBeCloseTo(80, 6);
    expect(left.tipY).toBeCloseTo(0, 6);
    expect(right.tipY).toBeCloseTo(0, 6);
  });

  it("arcos espejados: izquierda 0→−90, derecha 180→270", () => {
    const [left, right] = doubleDoorLeafGeometry(160, 90);
    expect(left.arcStart).toBe(0);
    expect(left.arcEnd).toBe(-90);
    expect(right.arcStart).toBe(180);
    expect(right.arcEnd).toBe(270);
  });
});

describe("windowPaneGeometry (panel batiente a 45°)", () => {
  it("derecha: pivote en width, panel 85% del ancho", () => {
    const p = windowPaneGeometry(100, "right");
    expect(p.hingeX).toBe(100);
    expect(p.paneLen).toBeCloseTo(85, 6);
    const c = Math.SQRT1_2;
    expect(p.tipX).toBeCloseTo(100 - 85 * c, 6);
    expect(p.tipY).toBeCloseTo(-85 * c, 6);
    expect(p.arcStart).toBe(180);
    expect(p.arcEnd).toBe(225);
  });

  it("izquierda: arco 0 → −45", () => {
    const p = windowPaneGeometry(100, "left");
    expect(p.hingeX).toBe(0);
    expect(p.arcStart).toBe(0);
    expect(p.arcEnd).toBe(-45);
  });

  it("oscilobatiente reusa el mismo path (paneAngle 45 por defecto)", () => {
    expect(windowPaneGeometry(100, "right", 45)).toEqual(
      windowPaneGeometry(100, "right")
    );
  });
});

describe("arcPoints", () => {
  it("arco de 90° genera 25 puntos (24 segmentos)", () => {
    const pts = arcPoints(0, 0, 10, 0, 90, 24);
    expect(pts.length).toBe(50);
    expect(pts[0]).toBeCloseTo(10, 6);
    expect(pts[1]).toBeCloseTo(0, 6);
    expect(pts[48]).toBeCloseTo(0, 6);
    expect(pts[49]).toBeCloseTo(10, 6);
  });

  it("el arco corregido de la hoja derecha pasa por la vertical (90°)", () => {
    const pts = arcPoints(80, 0, 80, 180, 270, 24);
    // punto final 270° → (80, −80): la punta de la hoja abierta
    expect(pts[pts.length - 2]).toBeCloseTo(80, 6);
    expect(pts[pts.length - 1]).toBeCloseTo(-80, 6);
    // punto medio 225°
    const rad = (225 * Math.PI) / 180;
    expect(pts[24]).toBeCloseTo(80 + 80 * Math.cos(rad), 6);
    expect(pts[25]).toBeCloseTo(80 * Math.sin(rad), 6);
  });

  it("ángulos negativos barren hacia arriba (hoja izquierda)", () => {
    const pts = arcPoints(0, 0, 80, 0, -90, 24);
    expect(pts[pts.length - 2]).toBeCloseTo(0, 6);
    expect(pts[pts.length - 1]).toBeCloseTo(-80, 6);
  });
});

describe("openingExtrusion (constantes 3D, fuente única S4)", () => {
  it("puerta: desde el piso, 200 cm", () => {
    expect(openingExtrusion("door")).toEqual({ height: 200, zStart: 0 });
  });

  it("ventana: alféizar 90 cm, altura 120 cm", () => {
    expect(openingExtrusion("window")).toEqual({ height: 120, zStart: 90 });
  });

  it("OPENING_3D es la fuente de verdad", () => {
    expect(OPENING_3D).toEqual({
      doorHeight: 200,
      windowHeight: 120,
      windowSill: 90,
    });
  });
});
