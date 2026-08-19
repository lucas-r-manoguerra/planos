/**
 * Tests for normative validation system — pure-function validators
 * that check a plan against Argentine building codes.
 *
 * Coordinate system: 1 unit = 1 cm.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  Column,
  Fixture,
  Floor,
  Room,
  RoomType,
  Terrain,
} from "@/types/plan";
import {
  validateMinDimensions,
  validateNaturalLighting,
  validateBathroom,
  validateStairs,
  validateGarage,
  validateSetbacks,
  validateStructuralContinuity,
  validateFurnitureCirculation,
  validateAll,
  ValidationState,
  resetValidationCounter,
} from "@/lib/normative-validation";

// ── Helpers ──────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: crypto.randomUUID(),
    label: "Test Room",
    type: RoomType.DORMITORIO,
    x: 0,
    y: 0,
    width: 400,
    height: 360,
    color: "#e0e7ff",
    snapEnabled: false,
    ...overrides,
  };
}

function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    id: crypto.randomUUID(),
    floorId: "floor-1",
    label: "Fixture",
    catalogId: "ventana-standard",
    category: "window",
    x: 0,
    y: 0,
    width: 120,
    height: 10,
    rotation: 0,
    color: "#ffffff",
    props: {},
    ...overrides,
  };
}

function makeColumn(overrides: Partial<Column> = {}): Column {
  return {
    id: crypto.randomUUID(),
    floorId: "floor-1",
    x: 100,
    y: 100,
    sectionWidth: 25,
    sectionHeight: 25,
    ...overrides,
  };
}

function makeFloor(overrides: Partial<Floor> = {}): Floor {
  return {
    id: crypto.randomUUID(),
    name: "Planta",
    level: 0,
    rooms: [],
    ...overrides,
  };
}

function makeTerrain(overrides: Partial<Terrain> = {}): Terrain {
  return {
    width: 1000,
    height: 1500,
    color: "#e8e0d4",
    front: "bottom",
    northAngle: 0,
    ...overrides,
  };
}

// ── validateMinDimensions ────────────────────────────────────────────

describe("validateMinDimensions", () => {
  beforeEach(() => {
    resetValidationCounter();
  });

  it("room at exact minimum area → no violation", () => {
    // DORMITORIO: minArea=10.50, minSide=300 → 300×350 = 10.5 m²
    const room = makeRoom({ width: 300, height: 350, type: RoomType.DORMITORIO });
    const violations = validateMinDimensions([room]);
    expect(violations).toHaveLength(0);
  });

  it("room below minimum area → warning violation", () => {
    // 200×200 = 4 m² < 10.5 m²; maxSide=200 < 300 → 2 violations
    const room = makeRoom({ width: 200, height: 200, type: RoomType.DORMITORIO });
    const violations = validateMinDimensions([room]);
    expect(violations).toHaveLength(2);
    const areaViolation = violations.find(v => v.message.includes("m²"));
    expect(areaViolation).toBeDefined();
    expect(areaViolation!.severity).toBe("warning");
    expect(areaViolation!.category).toBe("dimensions");
    expect(areaViolation!.feature).toBe("min-dimensions");
    expect(areaViolation!.message).toContain("4.00 m²");
    expect(areaViolation!.message).toContain("10.5 m²");
  });

  it("room below minimum side length → warning", () => {
    // DORMITORIO: minSide=300. Use width=400, height=250 → minSide=250 < 300
    // Area = 400×250 = 10 m² < 10.5 → area violation + side violation = 2 violations
    const room = makeRoom({ width: 400, height: 250, type: RoomType.DORMITORIO });
    const violations = validateMinDimensions([room]);
    expect(violations.length).toBeGreaterThanOrEqual(2);
    const sideViolation = violations.find(v => v.message.includes("Lado mínimo:"));
    expect(sideViolation).toBeDefined();
    expect(sideViolation!.message).toContain("250 cm");
  });

  it("asymmetric room: long side passes but short side fails → warning", () => {
    // DORMITORIO: minSide=300. width=500, height=280
    // Math.max would give 500 ≥ 300 (no violation — old bug)
    // Math.min gives 280 < 300 (correct detection)
    const room = makeRoom({ width: 500, height: 280, type: RoomType.DORMITORIO });
    const violations = validateMinDimensions([room]);
    const sideViolation = violations.find(v => v.message.includes("Lado mínimo:"));
    expect(sideViolation).toBeDefined();
    expect(sideViolation!.message).toContain("280 cm");
  });

  it("room with zero dimensions → warning", () => {
    const room = makeRoom({ width: 0, height: 0, type: RoomType.COCINA });
    const violations = validateMinDimensions([room]);
    expect(violations.length).toBeGreaterThanOrEqual(1);
    // 0 m² < 4.5 m² for COCINA
    expect(violations[0].message).toContain("0.00 m²");
  });

  it.each([
    [RoomType.DORMITORIO, 10.50, 300],
    [RoomType.COCINA, 4.50, 150],
    [RoomType.BAÑO, 4.00, 160],
    [RoomType.ESTAR_COMEDOR, 18.00, 300],
    [RoomType.LAVADERO, 2.25, 150],
    [RoomType.PASILLO, 0, 100],
  ])("%s has correct minimum area %s m² and side %s cm", (type, minArea, minSide) => {
    // Room at exact minimum side with area met → no violation
    // For PASILLO (minArea=0), we only need side ≥ 100
    const sideCm = Math.max(minSide, Math.ceil(Math.sqrt(minArea * 10_000)));
    const room = makeRoom({ width: sideCm, height: sideCm, type });
    const violations = validateMinDimensions([room]);
    expect(violations).toHaveLength(0);
  });

  it("multiple rooms produce independent violations", () => {
    const small1 = makeRoom({ width: 100, height: 100, type: RoomType.DORMITORIO });
    const small2 = makeRoom({ width: 100, height: 100, type: RoomType.COCINA });
    const violations = validateMinDimensions([small1, small2]);
    // Each room: area violation + side violation = 2 per room = 4 total
    expect(violations).toHaveLength(4);
    const room1Violations = violations.filter(v => v.roomId === small1.id);
    const room2Violations = violations.filter(v => v.roomId === small2.id);
    expect(room1Violations).toHaveLength(2);
    expect(room2Violations).toHaveLength(2);
  });
});

// ── validateNaturalLighting ──────────────────────────────────────────

describe("validateNaturalLighting", () => {
  beforeEach(() => {
    resetValidationCounter();
  });

  it("room with adequate windows → no violation", () => {
    // DORMITORIO: minRatio = 1/6 ≈ 0.1667
    // Room: 600×600 = 36 m²; need window area ≥ 36/6 = 6 m²
    const room = makeRoom({ width: 600, height: 600, type: RoomType.DORMITORIO });
    // Window: 300×200 = 60000 cm² = 6 m²
    const window = makeFixture({
      x: 100, y: 290, width: 300, height: 200,
      category: "window", catalogId: "ventanal",
    });
    const violations = validateNaturalLighting([room], [window]);
    expect(violations).toHaveLength(0);
  });

  it("room with insufficient windows → warning", () => {
    // DORMITORIO: minRatio = 1/6; room 600×600 = 36 m²; need ≥ 6 m² window
    const room = makeRoom({ width: 600, height: 600, type: RoomType.DORMITORIO });
    // Small window: 60×10 = 600 cm² = 0.06 m² → ratio ≈ 0.00167 < 0.1667
    const window = makeFixture({
      x: 200, y: 290, width: 60, height: 10,
      category: "window",
    });
    const violations = validateNaturalLighting([room], [window]);
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0].category).toBe("lighting");
    expect(violations[0].feature).toBe("natural-lighting");
  });

  it("room with no windows and minVentilated requirement → warning", () => {
    // COCINA: minVentilated = 0.50 m²; no windows
    const room = makeRoom({ width: 300, height: 300, type: RoomType.COCINA });
    const violations = validateNaturalLighting([room], []);
    expect(violations.length).toBeGreaterThanOrEqual(1);
    const ventilatedViolation = violations.find(v =>
      v.message.includes("ventilable"),
    );
    expect(ventilatedViolation).toBeDefined();
  });

  it("room type without lighting requirement (pasillo) → no violation", () => {
    const room = makeRoom({ width: 200, height: 100, type: RoomType.PASILLO });
    const violations = validateNaturalLighting([room], []);
    expect(violations).toHaveLength(0);
  });

  it("window position within room bounds → counted correctly", () => {
    // BAÑO: minVentilated = 0.50 m²; minRatio = 0
    // Room at (0,0) 200×200 = 4 m²
    const room = makeRoom({ width: 200, height: 200, type: RoomType.BAÑO });
    // Window center at (100, 100) → inside room → counted
    const window = makeFixture({
      x: 50, y: 95, width: 100, height: 10,
      category: "window",
    });
    const violations = validateNaturalLighting([room], [window]);
    // Window area = 100×10 = 1000 cm² = 0.1 m² < 0.50 m² ventilated
    expect(violations.length).toBeGreaterThanOrEqual(1);
  });

  it("window outside room bounds → not counted", () => {
    const room = makeRoom({ width: 200, height: 200, type: RoomType.BAÑO });
    // Window center at (500, 500) → outside room
    const window = makeFixture({
      x: 450, y: 495, width: 100, height: 10,
      category: "window",
    });
    const violations = validateNaturalLighting([room], [window]);
    // No windows inside → ventilated = 0 < 0.50
    expect(violations.length).toBeGreaterThanOrEqual(1);
  });

  it("non-window fixtures are ignored", () => {
    const room = makeRoom({ width: 300, height: 300, type: RoomType.DORMITORIO });
    const furniture = makeFixture({
      x: 50, y: 50, width: 100, height: 60,
      category: "furniture", catalogId: "cama-2plaza",
    });
    const violations = validateNaturalLighting([room], [furniture]);
    // No windows → ratio = 0 < 1/6
    expect(violations.length).toBeGreaterThanOrEqual(1);
  });
});

// ── validateBathroom ─────────────────────────────────────────────────

describe("validateBathroom", () => {
  beforeEach(() => {
    resetValidationCounter();
  });

  it("bathroom with properly spaced fixtures → no violation", () => {
    const bathroom = makeRoom({
      type: RoomType.BAÑO,
      width: 200, height: 200,
    });
    // Two fixtures far apart (center-to-center > 15)
    const lavamanos = makeFixture({
      x: 10, y: 10, width: 40, height: 30,
      category: "bathroom", catalogId: "lavamanos", label: "Lavamanos",
    });
    const ducha = makeFixture({
      x: 120, y: 120, width: 80, height: 80,
      category: "bathroom", catalogId: "ducha", label: "Ducha",
    });
    const violations = validateBathroom([bathroom], [lavamanos, ducha]);
    expect(violations).toHaveLength(0);
  });

  it("bathroom with fixtures too close (< 15cm center-to-center) → warning", () => {
    const bathroom = makeRoom({
      type: RoomType.BAÑO,
      width: 200, height: 200,
    });
    // Two fixtures with centers ~10cm apart
    const lavamanos = makeFixture({
      x: 50, y: 50, width: 40, height: 30,
      category: "bathroom", catalogId: "lavamanos", label: "Lavamanos",
    });
    const inodoro = makeFixture({
      x: 55, y: 55, width: 40, height: 40,
      category: "bathroom", catalogId: "inodoro", label: "Inodoro",
    });
    const violations = validateBathroom([bathroom], [lavamanos, inodoro]);
    const spacingViolation = violations.find(v => v.feature === "bathroom-spacing");
    expect(spacingViolation).toBeDefined();
  });

  it("bathroom with toilet too close to wall (< 60cm clear) → warning", () => {
    const bathroom = makeRoom({
      type: RoomType.BAÑO,
      width: 200, height: 200,
    });
    // Toilet at bottom of room, rotation 0 → front faces +Y (down)
    // Inodoro at y=160, height=30 → front edge at y=190; room bottom at y=200 → 10cm clear < 60
    const inodoro = makeFixture({
      x: 80, y: 160, width: 40, height: 30,
      category: "bathroom", catalogId: "inodoro", label: "Inodoro",
      rotation: 0,
    });
    const violations = validateBathroom([bathroom], [inodoro]);
    const clearViolation = violations.find(v => v.feature === "bathroom-toilet-clearance");
    expect(clearViolation).toBeDefined();
    expect(clearViolation!.message).toContain("60 cm");
  });

  it("non-bathroom room → skipped", () => {
    const bedroom = makeRoom({ type: RoomType.DORMITORIO });
    const lavamanos = makeFixture({
      x: 10, y: 10, width: 40, height: 30,
      category: "bathroom", catalogId: "lavamanos",
    });
    const violations = validateBathroom([bedroom], [lavamanos]);
    expect(violations).toHaveLength(0);
  });

  it("bathroom fixture outside room → not counted", () => {
    const bathroom = makeRoom({
      type: RoomType.BAÑO,
      width: 100, height: 100,
    });
    // Fixture center at (500, 500) → outside bathroom
    const lavamanos = makeFixture({
      x: 450, y: 495, width: 100, height: 10,
      category: "bathroom", catalogId: "lavamanos",
    });
    const violations = validateBathroom([bathroom], [lavamanos]);
    // No bathroom fixtures inside → nothing to check
    expect(violations).toHaveLength(0);
  });
});

// ── validateStairs ───────────────────────────────────────────────────

describe("validateStairs", () => {
  beforeEach(() => {
    resetValidationCounter();
  });

  it("stair with valid formula (2h+w in 60-64) → no violation", () => {
    // h=18, w=28 → 2*18+28 = 64 → compliant; width=90 ≥ 90; landing=90 ≥ 80
    const stair = makeFixture({
      category: "stair",
      catalogId: "tramo-unico",
      label: "Escalera",
      width: 90,
      height: 300,
      props: {
        stepHeight: 18,
        stepWidth: 28,
        floorHeight: 280,
        flights: 1,
        stairWidth: 90,
        separation: 10,
        landingWidth: 90,
      },
    });
    const violations = validateStairs([stair]);
    expect(violations).toHaveLength(0);
  });

  it("stair with invalid formula → warning", () => {
    // h=20, w=15 → 2*20+15 = 55 → NOT in [60,64]
    const stair = makeFixture({
      category: "stair",
      catalogId: "tramo-unico",
      label: "Escalera",
      width: 90,
      height: 300,
      props: {
        stepHeight: 20,
        stepWidth: 15,
        floorHeight: 280,
        flights: 1,
        stairWidth: 90,
        separation: 10,
        landingWidth: 90,
      },
    });
    const violations = validateStairs([stair]);
    const formulaViolation = violations.find(v => v.feature === "stair-formula");
    expect(formulaViolation).toBeDefined();
    expect(formulaViolation!.severity).toBe("warning");
  });

  it("stair with narrow width (< 90cm) → warning", () => {
    const stair = makeFixture({
      category: "stair",
      catalogId: "tramo-unico",
      label: "Escalera",
      width: 70,
      height: 300,
      props: {
        stepHeight: 18,
        stepWidth: 28,
        floorHeight: 280,
        flights: 1,
        stairWidth: 70,
        separation: 10,
        landingWidth: 90,
      },
    });
    const violations = validateStairs([stair]);
    const widthViolation = violations.find(v => v.feature === "stair-width");
    expect(widthViolation).toBeDefined();
    expect(widthViolation!.message).toContain("70 cm");
  });

  it("stair with narrow landing (< 80cm) → warning", () => {
    const stair = makeFixture({
      category: "stair",
      catalogId: "tramo-unico",
      label: "Escalera",
      width: 90,
      height: 300,
      props: {
        stepHeight: 18,
        stepWidth: 28,
        floorHeight: 280,
        flights: 1,
        stairWidth: 90,
        separation: 10,
        landingWidth: 60,
      },
    });
    const violations = validateStairs([stair]);
    const landingViolation = violations.find(v => v.feature === "stair-landing");
    expect(landingViolation).toBeDefined();
    expect(landingViolation!.message).toContain("60 cm");
  });

  it("non-stair fixture → skipped", () => {
    const furniture = makeFixture({
      category: "furniture",
      catalogId: "cama-2plaza",
      label: "Cama",
    });
    const violations = validateStairs([furniture]);
    expect(violations).toHaveLength(0);
  });

  it("stair with multiple issues → multiple violations", () => {
    // Bad formula + narrow width + narrow landing
    const stair = makeFixture({
      category: "stair",
      catalogId: "tramo-unico",
      label: "Escalera",
      width: 60,
      height: 300,
      props: {
        stepHeight: 20,
        stepWidth: 15,
        floorHeight: 280,
        flights: 1,
        stairWidth: 60,
        separation: 10,
        landingWidth: 50,
      },
    });
    const violations = validateStairs([stair]);
    expect(violations.length).toBeGreaterThanOrEqual(3);
  });
});

// ── validateGarage ───────────────────────────────────────────────────

describe("validateGarage", () => {
  beforeEach(() => {
    resetValidationCounter();
  });

  it("room with vehicle at valid size → no violation", () => {
    // MIN_GARAGE: 250×500
    const room = makeRoom({
      type: RoomType.ESTAR_COMEDOR,
      width: 300, height: 600,
    });
    const vehicle = makeFixture({
      x: 25, y: 50, width: 200, height: 450,
      category: "vehicle", catalogId: "auto", label: "Auto",
    });
    const violations = validateGarage([room], [vehicle]);
    expect(violations).toHaveLength(0);
  });

  it("room with vehicle too small → warning", () => {
    // 200×400 → doesn't fit 250×500 in either orientation
    const room = makeRoom({
      type: RoomType.ESTAR_COMEDOR,
      width: 200, height: 400,
    });
    const vehicle = makeFixture({
      x: 10, y: 10, width: 180, height: 350,
      category: "vehicle", catalogId: "auto", label: "Auto",
    });
    const violations = validateGarage([room], [vehicle]);
    expect(violations).toHaveLength(1);
    expect(violations[0].feature).toBe("garage-dimensions");
    expect(violations[0].category).toBe("dimensions");
  });

  it("room fits when rotated (width ≥ 500, height ≥ 250) → no violation", () => {
    const room = makeRoom({
      type: RoomType.ESTAR_COMEDOR,
      width: 600, height: 300,
    });
    const vehicle = makeFixture({
      x: 50, y: 25, width: 450, height: 200,
      category: "vehicle", catalogId: "auto", label: "Auto",
    });
    const violations = validateGarage([room], [vehicle]);
    expect(violations).toHaveLength(0);
  });

  it("room without vehicle fixture → skipped", () => {
    const room = makeRoom({ type: RoomType.ESTAR_COMEDOR, width: 200, height: 200 });
    const furniture = makeFixture({
      category: "furniture", catalogId: "mesa", label: "Mesa",
    });
    const violations = validateGarage([room], [furniture]);
    expect(violations).toHaveLength(0);
  });

  it("vehicle outside any room → skipped", () => {
    const room = makeRoom({ type: RoomType.ESTAR_COMEDOR, width: 200, height: 200 });
    const vehicle = makeFixture({
      x: 500, y: 500, width: 200, height: 450,
      category: "vehicle", catalogId: "auto", label: "Auto",
    });
    const violations = validateGarage([room], [vehicle]);
    expect(violations).toHaveLength(0);
  });
});

// ── validateSetbacks ─────────────────────────────────────────────────

describe("validateSetbacks", () => {
  beforeEach(() => {
    resetValidationCounter();
  });

  it("room inside all setback lines → no violation", () => {
    const terrain = makeTerrain({
      width: 1000, height: 1500,
      front: "bottom",
      setbacks: { front: 300, left: 150, right: 150, rear: 300 },
    });
    // Allowed: X [150, 850], Y [300, 1200]
    const room = makeRoom({ x: 200, y: 400, width: 300, height: 300, label: "Dormitorio" });
    const violations = validateSetbacks([room], terrain);
    expect(violations).toHaveLength(0);
  });

  it("room crossing front setback → warning", () => {
    const terrain = makeTerrain({
      width: 1000, height: 1500,
      front: "bottom",
      setbacks: { front: 300, left: 150, right: 150, rear: 300 },
    });
    // front setback at bottom: allowedMaxY = 1500 - 300 = 1200
    // Room at y=1100, height=200 → maxY=1300 > 1200 → overflows bottom (fondo)
    const room = makeRoom({ x: 200, y: 1100, width: 300, height: 200, label: "Cocina" });
    const violations = validateSetbacks([room], terrain);
    expect(violations).toHaveLength(1);
    expect(violations[0].feature).toBe("setbacks");
    expect(violations[0].message).toContain("fondo");
  });

  it("room crossing side setback → warning", () => {
    const terrain = makeTerrain({
      width: 1000, height: 1500,
      front: "bottom",
      setbacks: { front: 300, left: 150, right: 150, rear: 300 },
    });
    // left setback: allowedMinX = 150
    // Room at x=50, width=200 → minX=50 < 150 → overflows left (izquierdo)
    const room = makeRoom({ x: 50, y: 400, width: 200, height: 300, label: "Baño" });
    const violations = validateSetbacks([room], terrain);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("izquierdo");
  });

  it("terrain without setbacks → skipped (no violations)", () => {
    const terrain = makeTerrain({
      width: 1000, height: 1500,
      front: "bottom",
    });
    // No setbacks property → no violations
    const room = makeRoom({ x: 0, y: 0, width: 1000, height: 1500, label: "Grande" });
    const violations = validateSetbacks([room], terrain);
    expect(violations).toHaveLength(0);
  });

  it("room crossing rear setback → warning", () => {
    const terrain = makeTerrain({
      width: 1000, height: 1500,
      front: "bottom",
      setbacks: { front: 300, left: 150, right: 150, rear: 300 },
    });
    // rear setback at top: allowedMinY = 300
    // Room at y=100, height=200 → minY=100 < 300 → overflows top (frente)
    const room = makeRoom({ x: 200, y: 100, width: 300, height: 200, label: "Terraza" });
    const violations = validateSetbacks([room], terrain);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("frente");
  });

  it("front=top orientation → setbacks mapped correctly", () => {
    const terrain = makeTerrain({
      width: 1000, height: 1500,
      front: "top",
      setbacks: { front: 300, left: 150, right: 150, rear: 300 },
    });
    // top orientation: allowedMinX=right=150, allowedMaxX=1000-left=850
    // allowedMinY=front=300, allowedMaxY=1500-rear=1200
    // Room at y=100 → minY=100 < 300 → overflows (frente)
    const room = makeRoom({ x: 200, y: 100, width: 300, height: 200, label: "Salón" });
    const violations = validateSetbacks([room], terrain);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("frente");
  });
});

// ── validateStructuralContinuity ─────────────────────────────────────

describe("validateStructuralContinuity", () => {
  beforeEach(() => {
    resetValidationCounter();
  });

  it("aligned columns across 2 floors → no violation", () => {
    const floor0 = makeFloor({ id: "f0", name: "PB", level: 0 });
    const floor1 = makeFloor({ id: "f1", name: "P1", level: 1 });
    const col0 = makeColumn({ floorId: "f0", x: 100, y: 100 });
    const col1 = makeColumn({ floorId: "f1", x: 100, y: 100 });
    const violations = validateStructuralContinuity([col0, col1], [floor0, floor1]);
    expect(violations).toHaveLength(0);
  });

  it("misaligned columns (> 5cm offset) → error", () => {
    const floor0 = makeFloor({ id: "f0", name: "PB", level: 0 });
    const floor1 = makeFloor({ id: "f1", name: "P1", level: 1 });
    const col0 = makeColumn({ floorId: "f0", x: 100, y: 100 });
    const col1 = makeColumn({ floorId: "f1", x: 120, y: 100 }); // 20cm offset
    const violations = validateStructuralContinuity([col0, col1], [floor0, floor1]);
    expect(violations).toHaveLength(1);
    expect(violations[0].severity).toBe("error");
    expect(violations[0].feature).toBe("structural-continuity");
    expect(violations[0].category).toBe("structural");
  });

  it("single floor → skipped", () => {
    const floor0 = makeFloor({ id: "f0", name: "PB", level: 0 });
    const col0 = makeColumn({ floorId: "f0", x: 100, y: 100 });
    const violations = validateStructuralContinuity([col0], [floor0]);
    expect(violations).toHaveLength(0);
  });

  it("empty columns → no violation", () => {
    const floor0 = makeFloor({ id: "f0", name: "PB", level: 0 });
    const floor1 = makeFloor({ id: "f1", name: "P1", level: 1 });
    const violations = validateStructuralContinuity([], [floor0, floor1]);
    expect(violations).toHaveLength(0);
  });

  it("column within tolerance → no violation", () => {
    const floor0 = makeFloor({ id: "f0", name: "PB", level: 0 });
    const floor1 = makeFloor({ id: "f1", name: "P1", level: 1 });
    const col0 = makeColumn({ floorId: "f0", x: 100, y: 100 });
    const col1 = makeColumn({ floorId: "f1", x: 103, y: 102 }); // ~3.6cm offset
    const violations = validateStructuralContinuity([col0, col1], [floor0, floor1]);
    expect(violations).toHaveLength(0);
  });

  it("3 floors with one misalignment → one error", () => {
    const f0 = makeFloor({ id: "f0", name: "PB", level: 0 });
    const f1 = makeFloor({ id: "f1", name: "P1", level: 1 });
    const f2 = makeFloor({ id: "f2", name: "P2", level: 2 });
    const c0 = makeColumn({ floorId: "f0", x: 100, y: 100 });
    const c1 = makeColumn({ floorId: "f1", x: 100, y: 100 }); // aligned
    const c2 = makeColumn({ floorId: "f2", x: 150, y: 100 }); // 50cm offset from f1
    const violations = validateStructuralContinuity([c0, c1, c2], [f0, f1, f2]);
    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain("P2");
  });
});

// ── validateFurnitureCirculation ─────────────────────────────────────

describe("validateFurnitureCirculation", () => {
  beforeEach(() => {
    resetValidationCounter();
  });

  it("furniture with adequate spacing (> 60cm) → no violation", () => {
    const room = makeRoom({ width: 500, height: 500 });
    const table = makeFixture({
      x: 50, y: 50, width: 100, height: 60,
      category: "furniture", catalogId: "mesa", label: "Mesa",
    });
    // Gap = 180cm between edges
    const sofa = makeFixture({
      x: 330, y: 50, width: 120, height: 60,
      category: "furniture", catalogId: "sofa", label: "Sofá",
    });
    const violations = validateFurnitureCirculation([room], [table, sofa]);
    expect(violations).toHaveLength(0);
  });

  it("furniture too close together (< 60cm edge-to-edge) → warning", () => {
    const room = makeRoom({ width: 500, height: 500 });
    const table = makeFixture({
      x: 100, y: 100, width: 100, height: 60,
      category: "furniture", catalogId: "mesa", label: "Mesa",
    });
    // 30cm gap (edge-to-edge)
    const chair = makeFixture({
      x: 230, y: 100, width: 60, height: 40,
      category: "furniture", catalogId: "silla", label: "Silla",
    });
    const violations = validateFurnitureCirculation([room], [table, chair]);
    const fixtureViolation = violations.find(v => v.feature === "furniture-circulation");
    expect(fixtureViolation).toBeDefined();
  });

  it("furniture touching wall (distance=0) with other fixtures → wall circulation warning", () => {
    const room = makeRoom({ width: 300, height: 300 });
    // Table at left wall (x=0)
    const table = makeFixture({
      x: 0, y: 50, width: 80, height: 50,
      category: "furniture", catalogId: "mesa", label: "Mesa",
    });
    // Second fixture in room
    const chair = makeFixture({
      x: 200, y: 100, width: 60, height: 40,
      category: "furniture", catalogId: "silla", label: "Silla",
    });
    const violations = validateFurnitureCirculation([room], [table, chair]);
    const wallViolation = violations.find(v => v.feature === "furniture-circulation" && v.fixtureId);
    expect(wallViolation).toBeDefined();
  });

  it("empty room → no violation", () => {
    const room = makeRoom({ width: 300, height: 300 });
    const violations = validateFurnitureCirculation([room], []);
    expect(violations).toHaveLength(0);
  });

  it("single fixture in room → no wall violation (roomFixtures.length = 1)", () => {
    const room = makeRoom({ width: 300, height: 300 });
    const table = makeFixture({
      x: 0, y: 0, width: 80, height: 50,
      category: "furniture", catalogId: "mesa", label: "Mesa",
    });
    const violations = validateFurnitureCirculation([room], [table]);
    // Single fixture → no pairwise check, no wall check
    expect(violations).toHaveLength(0);
  });

  it("non-blocking fixtures (plants, doors, windows) are ignored", () => {
    const room = makeRoom({ width: 300, height: 300 });
    const plant = makeFixture({
      x: 10, y: 10, width: 30, height: 30,
      category: "plant", catalogId: "maceta-grande", label: "Planta",
    });
    const door = makeFixture({
      x: 200, y: 10, width: 80, height: 10,
      category: "door", catalogId: "puerta-standard", label: "Puerta",
    });
    const violations = validateFurnitureCirculation([room], [plant, door]);
    expect(violations).toHaveLength(0);
  });

  it("bathroom fixtures are considered blocking", () => {
    const room = makeRoom({ width: 300, height: 300, type: RoomType.BAÑO });
    const lavamanos = makeFixture({
      x: 50, y: 50, width: 40, height: 30,
      category: "bathroom", catalogId: "lavamanos", label: "Lavamanos",
    });
    const inodoro = makeFixture({
      x: 100, y: 50, width: 40, height: 40,
      category: "bathroom", catalogId: "inodoro", label: "Inodoro",
    });
    // Edge distance: gap = 100 - (50+40) = 10cm < 60cm
    const violations = validateFurnitureCirculation([room], [lavamanos, inodoro]);
    expect(violations.length).toBeGreaterThanOrEqual(1);
  });
});

// ── validateAll ──────────────────────────────────────────────────────

describe("validateAll", () => {
  beforeEach(() => {
    resetValidationCounter();
  });

  it("valid floor plan → empty violations array", () => {
    // Terrain 1000×1500, front=bottom, setbacks: front=300, left=150, right=150, rear=300
    // Allowed: X [150, 850], Y [300, 1200]
    const dormitorio = makeRoom({
      type: RoomType.DORMITORIO,
      width: 400, height: 300, // 12 m² ≥ 9, maxSide=400 ≥ 270
      x: 200, y: 400, label: "Dormitorio 1",
    });
    const cocina = makeRoom({
      type: RoomType.COCINA,
      width: 300, height: 200, // 6 m² ≥ 5, maxSide=300 ≥ 150
      x: 550, y: 400, label: "Cocina",
    });
    // Window for dormitorio: area=200×100=20000cm²=2m²; ratio=2/12≈0.167 ≥ 1/6≈0.167
    const dormWindow = makeFixture({
      x: 300, y: 550, width: 200, height: 100,
      category: "window", catalogId: "ventana-standard",
    });
    // Window for cocina: area=100×100=10000cm²=1m²; ratio=1/6≈0.167 ≥ 1/10=0.1, ventilated=1≥0.50
    const cocWindow = makeFixture({
      x: 650, y: 490, width: 100, height: 100,
      category: "window", catalogId: "ventana-standard",
    });
    const state: ValidationState = {
      rooms: [dormitorio, cocina],
      fixtures: [dormWindow, cocWindow],
      terrain: makeTerrain({
        width: 1000, height: 1500,
        setbacks: { front: 300, left: 150, right: 150, rear: 300 },
      }),
      columns: [],
      floors: [makeFloor({ id: "f0", rooms: [] })],
    };

    const violations = validateAll(state);
    expect(violations).toHaveLength(0);
  });

  it("floor plan with multiple issues → all violations returned", () => {
    const smallRoom = makeRoom({
      id: "r-small",
      type: RoomType.DORMITORIO,
      width: 100, height: 100, // 1 m² < 9 m²
      label: "Chiquito",
    });
    const state: ValidationState = {
      rooms: [smallRoom],
      fixtures: [],
      terrain: makeTerrain(),
      columns: [],
      floors: [makeFloor({ id: "f0" })],
    };

    const violations = validateAll(state);
    // Should include at least min-dimensions violation
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0].feature).toBe("min-dimensions");
    // All violation IDs should be unique
    const ids = violations.map(v => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validateAll resets counter for deterministic IDs", () => {
    const room = makeRoom({
      type: RoomType.DORMITORIO,
      width: 100, height: 100,
    });
    const state: ValidationState = {
      rooms: [room],
      fixtures: [],
      terrain: makeTerrain(),
      columns: [],
      floors: [makeFloor({ id: "f0" })],
    };

    const first = validateAll(state);
    const second = validateAll(state);
    // Counter resets at the start of each validateAll call
    expect(first.map(v => v.id)).toEqual(second.map(v => v.id));
  });
});
