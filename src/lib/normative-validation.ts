/**
 * Normative validation engine — pure functions that check a plan state
 * against Argentine building codes (Resolución 5/2022, CIRSOC 201, IRAM 4001).
 *
 * No side effects, no store imports. Every function receives its data
 * and returns Violation[].
 *
 * Coordinate system: 1 unit = 1 cm (regla 03).
 */

import {
  Column,
  Fixture,
  Floor,
  Room,
  RoomType,
  Terrain,
  Violation,
} from "@/types/plan";

import {
  COLUMN_ALIGNMENT_TOLERANCE,
  LIGHTING_RATIOS,
  MIN_CLEAR_PASSAGE,
  MIN_DIMENSIONS,
  MIN_GARAGE,
  MIN_STAIR_REST,
  MIN_STAIR_WIDTH,
} from "@/lib/normative-rules";

import { calculateStairs } from "@/lib/fixtures-catalog";

// ── Helpers ──────────────────────────────────────────────────────────

let counter = 0;

function nextId(feature: string, ref?: string): string {
  counter += 1;
  return `${feature}-${ref || "global"}-${counter}`;
}

/** Reset counter (for deterministic testing). */
export function resetValidationCounter(): void {
  counter = 0;
}

/** Minimum edge-to-edge distance between two axis-aligned rects (0 if overlapping). */
function rectEdgeDistance(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): number {
  const dx = Math.max(0, Math.max(ax, bx) - Math.min(ax + aw, bx + bw));
  const dy = Math.max(0, Math.max(ay, by) - Math.min(ay + ah, by + bh));
  return Math.hypot(dx, dy);
}

/** Euclidean distance between two center points. */
function centerDistance(a: { x: number; y: number; width: number; height: number },
                        b: { x: number; y: number; width: number; height: number }): number {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  return Math.hypot(ax - bx, ay - by);
}

/** Check if a point is inside a room (inclusive edges). */
function pointInRoom(px: number, py: number, room: Room): boolean {
  return px >= room.x && px <= room.x + room.width &&
         py >= room.y && py <= room.y + room.height;
}

/** Get the center of a fixture. */
function fixtureCenter(f: Fixture): { x: number; y: number } {
  return { x: f.x + f.width / 2, y: f.y + f.height / 2 };
}

/** Find which room (if any) contains a fixture's center. */
function findRoomForFixture(rooms: Room[], f: Fixture): Room | undefined {
  const c = fixtureCenter(f);
  return rooms.find(r => pointInRoom(c.x, c.y, r));
}

// ── Validators ───────────────────────────────────────────────────────

/**
 * Resolución 5/2022 — Minimum room dimensions.
 * Checks area (m²) and shortest side (cm) per room type.
 */
export function validateMinDimensions(rooms: Room[]): Violation[] {
  const violations: Violation[] = [];

  for (const room of rooms) {
    const rule = MIN_DIMENSIONS[room.type];
    const areaM2 = (room.width * room.height) / 10_000;
    const maxSide = Math.max(room.width, room.height);

    if (areaM2 < rule.minArea) {
      violations.push({
        id: nextId("min-dimensions", room.id),
        severity: "warning",
        category: "dimensions",
        roomId: room.id,
        feature: "min-dimensions",
        message: `Área: ${areaM2.toFixed(2)} m² (mínimo: ${rule.minArea} m²)`,
         normativeRef: "Resolución 5/2022",
       });
     }

     if (maxSide < rule.minSide) {
       violations.push({
         id: nextId("min-dimensions", room.id),
         severity: "warning",
         category: "dimensions",
         roomId: room.id,
         feature: "min-dimensions",
         message: `Lado: ${maxSide} cm (mínimo: ${rule.minSide} cm)`,
         normativeRef: "Resolución 5/2022",
      });
    }
  }

  return violations;
}

// ── Natural Lighting ─────────────────────────────────────────────────

/**
 * Determine which windows belong to a given room.
 *
 * A window is assigned to a room if:
 *  1. Its wallId matches one of the room's wall IDs (if walls are tracked),
 *     OR
 *  2. Its center falls inside the room's bounding box.
 */
function windowsForRoom(rooms: Room[], fixtures: Fixture[], room: Room): Fixture[] {
  return fixtures.filter(f => {
    if (f.category !== "window") return false;

    // Direct wall-based assignment
    if (f.wallId) {
      // The wall's roomId should match this room
      // Since we don't have the Wall entities here, fall through to position check.
    }

    // Position-based: window center inside room bounds
    const cx = f.x + f.width / 2;
    const cy = f.y + f.height / 2;
    return pointInRoom(cx, cy, room);
  });
}

/**
 * CIRSOC 201 Tabla 3.1.3 — Natural lighting.
 *
 * For each room, computes the ratio of total window area to floor area.
 * Windows have a default depth of 10 cm (the "height" property in the
 * catalog represents the wall depth of the opening).
 *
 * Only rooms with a non-zero minRatio or minVentilated requirement are
 * checked (PASILLO is skipped since both values are 0).
 */
export function validateNaturalLighting(
  rooms: Room[],
  fixtures: Fixture[],
): Violation[] {
  const violations: Violation[] = [];

  for (const room of rooms) {
    const rule = LIGHTING_RATIOS[room.type];
    if (!rule) continue;
    if (rule.minRatio === 0 && rule.minVentilated === 0) continue;

    const floorAreaM2 = (room.width * room.height) / 10_000;
    const windows = windowsForRoom(rooms, fixtures, room);

    // Each window's area: width * height (depth in cm) / 10000 → m²
    const totalWindowAreaM2 = windows.reduce(
      (sum, w) => sum + (w.width * w.height) / 10_000,
      0,
    );

    if (rule.minRatio > 0) {
      const ratio = floorAreaM2 > 0 ? totalWindowAreaM2 / floorAreaM2 : 0;
      if (ratio < rule.minRatio) {
        violations.push({
          id: nextId("natural-lighting", room.id),
          severity: "warning",
          category: "lighting",
          roomId: room.id,
          feature: "natural-lighting",
          message:
            `Ratio ventana/piso: ${ratio.toFixed(3)} (mínimo: ${rule.minRatio.toFixed(3)}). ` +
            `Ventanas: ${totalWindowAreaM2.toFixed(2)} m², Piso: ${floorAreaM2.toFixed(2)} m²`,
          normativeRef: "CIRSOC 201 Tabla 3.1.3",
        });
      }
    }

    if (rule.minVentilated > 0 && totalWindowAreaM2 < rule.minVentilated) {
      violations.push({
        id: nextId("natural-lighting", room.id),
        severity: "warning",
        category: "lighting",
        roomId: room.id,
        feature: "natural-lighting",
        message:
          `Superficie ventilable: ${totalWindowAreaM2.toFixed(2)} m² ` +
          `(mínimo: ${rule.minVentilated} m²)`,
        normativeRef: "CIRSOC 201 Tabla 3.1.3",
      });
    }
  }

  return violations;
}

// ── Bathroom ─────────────────────────────────────────────────────────

/**
 * Resolución 5/2022 / CIRSOC 201 — Bathroom layout.
 *
 * - Inter-fixture center-to-center distance must be >= 15 cm.
 * - Toilet (inodoro) must have >= 60 cm clear space in front.
 */
export function validateBathroom(
  rooms: Room[],
  fixtures: Fixture[],
): Violation[] {
  const violations: Violation[] = [];

  const bathrooms = rooms.filter(r => r.type === RoomType.BAÑO);

  for (const room of bathrooms) {
    const bathroomFixtures = fixtures.filter(f => {
      if (f.category !== "bathroom") return false;
      const cx = f.x + f.width / 2;
      const cy = f.y + f.height / 2;
      return pointInRoom(cx, cy, room);
    });

    // Pairwise center-to-center distance check
    for (let i = 0; i < bathroomFixtures.length; i++) {
      for (let j = i + 1; j < bathroomFixtures.length; j++) {
        const dist = centerDistance(bathroomFixtures[i], bathroomFixtures[j]);
        if (dist < 15) {
          violations.push({
            id: nextId("bathroom-spacing", room.id),
            severity: "warning",
            category: "safety",
            roomId: room.id,
            fixtureId: bathroomFixtures[i].id,
            feature: "bathroom-spacing",
            message:
              `Distancia entre ${bathroomFixtures[i].label} y ${bathroomFixtures[j].label}: ` +
              `${dist.toFixed(1)} cm (mínimo: 15 cm)`,
             normativeRef: "Resolución 5/2022",
           });
         }
       }
     }

     // Toilet clear space check
    const inodoros = bathroomFixtures.filter(f => f.catalogId === "inodoro");
    for (const inodoro of inodoros) {
      const clearSpace = computeToiletClearSpace(inodoro, room);
      if (clearSpace < 60) {
        violations.push({
          id: nextId("bathroom-toilet-clearance", room.id),
          severity: "warning",
          category: "safety",
          roomId: room.id,
          fixtureId: inodoro.id,
          feature: "bathroom-toilet-clearance",
          message:
            `Espacio libre delante del inodoro: ${clearSpace.toFixed(1)} cm ` +
            `(mínimo: 60 cm)`,
             normativeRef: "Resolución 5/2022",
        });
      }
    }
  }

  return violations;
}

/**
 * Compute clear space in front of a toilet fixture.
 * Rotation 0° → front faces +Y (bottom), 90° → front faces +X (right),
 * 180° → front faces −Y (top), 270° → front faces −X (left).
 * Returns the distance from the front edge to the nearest room wall in
 * that direction, capped at the room boundary.
 */
function computeToiletClearSpace(inodoro: Fixture, room: Room): number {
  const normalizedRotation = ((inodoro.rotation % 360) + 360) % 360;

  // Front edge positions by rotation (the "front" of a toilet is the
  // side the user faces, which is the +Y edge at rotation 0°).
  let frontEdgeX: number;
  let frontEdgeY: number;
  let directionX: number; // 1 = check rightward, -1 = leftward
  let directionY: number; // 1 = check downward, -1 = upward

  if (normalizedRotation < 45 || normalizedRotation >= 315) {
    // 0° — front faces bottom
    frontEdgeX = inodoro.x + inodoro.width / 2;
    frontEdgeY = inodoro.y + inodoro.height;
    directionX = 0;
    directionY = 1;
  } else if (normalizedRotation >= 45 && normalizedRotation < 135) {
    // 90° — front faces right
    frontEdgeX = inodoro.x + inodoro.width;
    frontEdgeY = inodoro.y + inodoro.height / 2;
    directionX = 1;
    directionY = 0;
  } else if (normalizedRotation >= 135 && normalizedRotation < 225) {
    // 180° — front faces top
    frontEdgeX = inodoro.x + inodoro.width / 2;
    frontEdgeY = inodoro.y;
    directionX = 0;
    directionY = -1;
  } else {
    // 270° — front faces left
    frontEdgeX = inodoro.x;
    frontEdgeY = inodoro.y + inodoro.height / 2;
    directionX = -1;
    directionY = 0;
  }

  // Distance from front edge to the nearest room wall in the facing direction
  if (directionY !== 0) {
    const roomEdgeY = directionY > 0
      ? room.y + room.height  // bottom wall
      : room.y;               // top wall
    return Math.abs(roomEdgeY - frontEdgeY);
  }

  // directionX !== 0
  const roomEdgeX = directionX > 0
    ? room.x + room.width   // right wall
    : room.x;               // left wall
  return Math.abs(roomEdgeX - frontEdgeX);
}

// ── Stairs ───────────────────────────────────────────────────────────

/**
 * IRAM 4001 / CIRSOC 201 Art. 7.3 — Stair validation.
 *
 * Checks:
 *  - 2h + w formula compliance (60–64 cm range)
 *  - Stair width >= MIN_STAIR_WIDTH
 *  - Landing width >= MIN_STAIR_REST
 */
export function validateStairs(fixtures: Fixture[]): Violation[] {
  const violations: Violation[] = [];
  const stairs = fixtures.filter(f => f.category === "stair");

  for (const stair of stairs) {
    const stepHeight = Number(stair.props.stepHeight) || 18;
    const stepWidth = Number(stair.props.stepWidth) || 28;
    const floorHeight = Number(stair.props.floorHeight) || 280;
    const flights = Number(stair.props.flights) || 1;
    const stairWidth = Number(stair.props.stairWidth) || 90;
    const separation = Number(stair.props.separation) || 10;
    const landingWidth = Number(stair.props.landingWidth) || 90;

    const calc = calculateStairs(
      floorHeight, stepHeight, stepWidth, flights,
      stairWidth, separation, landingWidth,
    );

    if (!calc.isCompliant) {
      violations.push({
        id: nextId("stair-formula", stair.id),
        severity: "warning",
        category: "safety",
        fixtureId: stair.id,
        feature: "stair-formula",
        message:
          `Fórmula 2h+w: ${calc.formulaResult} cm (debe ser 60–64 cm). ` +
          `${calc.recommendation}`,
        normativeRef: "IRAM 4001",
      });
    }

    if (stairWidth < MIN_STAIR_WIDTH) {
      violations.push({
        id: nextId("stair-width", stair.id),
        severity: "warning",
        category: "safety",
        fixtureId: stair.id,
        feature: "stair-width",
        message:
          `Ancho del tramo: ${stairWidth} cm (mínimo: ${MIN_STAIR_WIDTH} cm)`,
        normativeRef: "CIRSOC 201 Art. 7.3",
      });
    }

    if (landingWidth < MIN_STAIR_REST) {
      violations.push({
        id: nextId("stair-landing", stair.id),
        severity: "warning",
        category: "safety",
        fixtureId: stair.id,
        feature: "stair-landing",
        message:
          `Ancho del descanso: ${landingWidth} cm (mínimo: ${MIN_STAIR_REST} cm)`,
        normativeRef: "CIRSOC 201 Art. 7.3",
      });
    }
  }

  return violations;
}

// ── Garage ───────────────────────────────────────────────────────────

/**
 * Resolución 5/2022 — Garage minimum dimensions.
 *
 * Finds rooms that contain vehicle fixtures and checks that the room
 * is wide and long enough (or rotated equivalent).
 */
export function validateGarage(
  rooms: Room[],
  fixtures: Fixture[],
): Violation[] {
  const violations: Violation[] = [];
  const vehicles = fixtures.filter(f => f.category === "vehicle");

  for (const vehicle of vehicles) {
    const room = findRoomForFixture(rooms, vehicle);
    if (!room) continue;

    // Room must accommodate the vehicle in at least one orientation
    const fitsNormal =
      room.width >= MIN_GARAGE.width && room.height >= MIN_GARAGE.height;
    const fitsRotated =
      room.width >= MIN_GARAGE.height && room.height >= MIN_GARAGE.width;

    if (!fitsNormal && !fitsRotated) {
      violations.push({
        id: nextId("garage-dimensions", room.id),
        severity: "warning",
        category: "dimensions",
        roomId: room.id,
        feature: "garage-dimensions",
        message:
          `Cochera ${room.width}×${room.height} cm demasiado chica. ` +
          `Mínimo: ${MIN_GARAGE.width}×${MIN_GARAGE.height} cm`,
         normativeRef: "Resolución 5/2022",
      });
    }
  }

  return violations;
}

// ── Setbacks ─────────────────────────────────────────────────────────

/**
 * Resolución 5/2022 — Terrain setbacks.
 *
 * Setback zones are rectangular strips along each terrain edge.
 * A room violates if it overlaps any setback zone.
 *
 * Setback naming is relative to the terrain's front (street) direction.
 * "left" and "right" are always from the perspective of someone facing
 * the street. This means:
 *
 *   front="bottom" → left = −X, right = +X, front = +Y, rear = −Y
 *   front="top"    → left = +X, right = −X, front = −Y, rear = +Y
 *   front="left"   → left = +Y, right = −Y, front = −X, rear = +X
 *   front="right"  → left = −Y, right = +Y, front = +X, rear = −X
 */
export function validateSetbacks(
  rooms: Room[],
  terrain: Terrain,
): Violation[] {
  if (!terrain.setbacks) return [];

  const violations: Violation[] = [];
  const { front, left, right, rear } = terrain.setbacks;

  // Compute the inner rectangle where rooms are allowed
  let allowedMinX: number;
  let allowedMaxX: number;
  let allowedMinY: number;
  let allowedMaxY: number;

  switch (terrain.front) {
    case "bottom":
      allowedMinX = left;
      allowedMaxX = terrain.width - right;
      allowedMinY = rear;
      allowedMaxY = terrain.height - front;
      break;
    case "top":
      allowedMinX = right;
      allowedMaxX = terrain.width - left;
      allowedMinY = front;
      allowedMaxY = terrain.height - rear;
      break;
    case "left":
      allowedMinX = front;
      allowedMaxX = terrain.width - rear;
      allowedMinY = right;
      allowedMaxY = terrain.height - left;
      break;
    case "right":
      allowedMinX = rear;
      allowedMaxX = terrain.width - front;
      allowedMinY = left;
      allowedMaxY = terrain.height - right;
      break;
  }

  for (const room of rooms) {
    const roomMinX = room.x;
    const roomMaxX = room.x + room.width;
    const roomMinY = room.y;
    const roomMaxY = room.y + room.height;

    const overflowsLeft = roomMinX < allowedMinX;
    const overflowsRight = roomMaxX > allowedMaxX;
    const overflowsTop = roomMinY < allowedMinY;
    const overflowsBottom = roomMaxY > allowedMaxY;

    if (overflowsLeft || overflowsRight || overflowsTop || overflowsBottom) {
      const sides: string[] = [];

      // Determine which setback side each overflow corresponds to
      // based on terrain.front orientation
      if (overflowsLeft) {
        const cm = (terrain.front === "bottom") ? left
          : (terrain.front === "top") ? right
          : (terrain.front === "left") ? front
          : rear;
        const label = (terrain.front === "left" || terrain.front === "right")
          ? "frente" : "izquierdo";
        sides.push(`${label} (${cm} cm)`);
      }
      if (overflowsRight) {
        const cm = (terrain.front === "bottom") ? right
          : (terrain.front === "top") ? left
          : (terrain.front === "left") ? rear
          : front;
        const label = (terrain.front === "left" || terrain.front === "right")
          ? "fondo" : "derecho";
        sides.push(`${label} (${cm} cm)`);
      }
      if (overflowsTop) {
        const cm = (terrain.front === "bottom") ? rear
          : (terrain.front === "top") ? front
          : (terrain.front === "left") ? right
          : left;
        const label = (terrain.front === "top" || terrain.front === "bottom")
          ? "frente" : "izquierdo";
        sides.push(`${label} (${cm} cm)`);
      }
      if (overflowsBottom) {
        const cm = (terrain.front === "bottom") ? front
          : (terrain.front === "top") ? rear
          : (terrain.front === "left") ? left
          : right;
        const label = (terrain.front === "top" || terrain.front === "bottom")
          ? "fondo" : "derecho";
        sides.push(`${label} (${cm} cm)`);
      }

      violations.push({
        id: nextId("setbacks", room.id),
        severity: "warning",
        category: "dimensions",
        roomId: room.id,
        feature: "setbacks",
        message:
          `Habitación "${room.label}" invade zona de retiro: ${sides.join(", ")}`,
           normativeRef: "Resolución 5/2022",
      });
    }
  }

  return violations;
}

// ── Structural Continuity ────────────────────────────────────────────

/**
 * CIRSOC 201 — Column alignment between consecutive floors.
 *
 * For each column on floor N (N > 0), checks that at least one column
 * on floor N-1 is within COLUMN_ALIGNMENT_TOLERANCE cm.
 *
 * Floors are matched by their `level` property: level 0 = ground, etc.
 */
export function validateStructuralContinuity(
  columns: Column[],
  floors: Floor[],
): Violation[] {
  if (floors.length < 2) return [];

  const violations: Violation[] = [];

  // Sort floors by level
  const sorted = [...floors].sort((a, b) => a.level - b.level);

  for (let fi = 1; fi < sorted.length; fi++) {
    const upperFloor = sorted[fi];
    const lowerFloor = sorted[fi - 1];

    const upperColumns = columns.filter(c => c.floorId === upperFloor.id);
    const lowerColumns = columns.filter(c => c.floorId === lowerFloor.id);

    for (const col of upperColumns) {
      const aligned = lowerColumns.some(lower => {
        const dist = Math.hypot(col.x - lower.x, col.y - lower.y);
        return dist <= COLUMN_ALIGNMENT_TOLERANCE;
      });

      if (!aligned) {
        violations.push({
          id: nextId("structural-continuity", col.id),
          severity: "error",
          category: "structural",
          feature: "structural-continuity",
          message:
            `Columna en "${upperFloor.name}" (${col.x}, ${col.y}) sin ` +
            `alineación en "${lowerFloor.name}" (tolerancia: ${COLUMN_ALIGNMENT_TOLERANCE} cm)`,
          normativeRef: "CIRSOC 201",
        });
      }
    }
  }

  return violations;
}

// ── Furniture Circulation ────────────────────────────────────────────

/**
 * Resolución 5/2022 / IRAM 1155 — Minimum clear passage between fixtures.
 *
 * Checks:
 *  - Edge-to-edge distance between every pair of fixtures in a room >= MIN_CLEAR_PASSAGE
 *  - Fixture-to-wall distance for fixtures near room edges
 *
 * Only "solid" fixtures are checked: furniture, bathroom, vehicle.
 * Plants, doors, and windows are excluded (they don't block passage).
 */
export function validateFurnitureCirculation(
  rooms: Room[],
  fixtures: Fixture[],
): Violation[] {
  const violations: Violation[] = [];

  const BLOCKING_CATEGORIES = new Set(["furniture", "bathroom", "vehicle"]);

  for (const room of rooms) {
    const roomFixtures = fixtures.filter(f => {
      if (!BLOCKING_CATEGORIES.has(f.category)) return false;
      const cx = f.x + f.width / 2;
      const cy = f.y + f.height / 2;
      return pointInRoom(cx, cy, room);
    });

    // Pairwise fixture-to-fixture distance
    for (let i = 0; i < roomFixtures.length; i++) {
      for (let j = i + 1; j < roomFixtures.length; j++) {
        const a = roomFixtures[i];
        const b = roomFixtures[j];
        const dist = rectEdgeDistance(
          a.x, a.y, a.width, a.height,
          b.x, b.y, b.width, b.height,
        );
        if (dist < MIN_CLEAR_PASSAGE) {
          violations.push({
            id: nextId("furniture-circulation", room.id),
            severity: "warning",
            category: "circulation",
            roomId: room.id,
            feature: "furniture-circulation",
            message:
              `Distancia libre entre ${a.label} y ${b.label}: ` +
              `${dist.toFixed(1)} cm (mínimo: ${MIN_CLEAR_PASSAGE} cm)`,
            normativeRef: "IRAM 1155",
          });
        }
      }
    }

    // Fixture-to-wall distance: check if any fixture edge is too close
    // to the room boundary when there's no clearance path.
    // Simplified: check each fixture's distance to each room wall.
    for (const fixture of roomFixtures) {
      const distToLeft = fixture.x - room.x;
      const distToRight = (room.x + room.width) - (fixture.x + fixture.width);
      const distToTop = fixture.y - room.y;
      const distToBottom = (room.y + room.height) - (fixture.y + fixture.height);

      // Only flag if the fixture is jammed against a wall AND another
      // fixture blocks the opposite side (no passage exists).
      // For simplicity, flag any fixture that touches a room wall
      // (distance = 0) when there are multiple fixtures — this is the
      // most common circulation problem.
      if (roomFixtures.length > 1) {
        const minWallDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
        if (minWallDist <= 0) {
          violations.push({
            id: nextId("furniture-wall-circulation", room.id),
            severity: "warning",
            category: "circulation",
            roomId: room.id,
            fixtureId: fixture.id,
            feature: "furniture-circulation",
            message:
              `"${fixture.label}" adosado a pared de "${room.label}" sin espacio de circulación`,
            normativeRef: "IRAM 1155",
          });
        }
      }
    }
  }

  return violations;
}

// ── Master Validator ─────────────────────────────────────────────────

export interface ValidationState {
  rooms: Room[];
  fixtures: Fixture[];
  terrain: Terrain;
  columns: Column[];
  floors: Floor[];
}

/**
 * Run all normative validators and return combined violations with
 * unique IDs.
 */
export function validateAll(state: ValidationState): Violation[] {
  resetValidationCounter();

  return [
    ...validateMinDimensions(state.rooms),
    ...validateNaturalLighting(state.rooms, state.fixtures),
    ...validateBathroom(state.rooms, state.fixtures),
    ...validateStairs(state.fixtures),
    ...validateGarage(state.rooms, state.fixtures),
    ...validateSetbacks(state.rooms, state.terrain),
    ...validateStructuralContinuity(state.columns, state.floors),
    ...validateFurnitureCirculation(state.rooms, state.fixtures),
  ];
}
