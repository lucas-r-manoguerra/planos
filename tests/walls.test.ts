/**
 * Tests de paredes v4 (lib/wall-utils.ts + lib/walls.ts).
 * Coordenadas en cm: 1 unidad = 1 centímetro.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { Room, RoomType, Wall, Fixture } from "@/types/plan";
import {
  materializeFloorWalls,
  placeOnWall,
  reanchorOpenings,
  wallLength,
  wallAlongStart,
  wallAlongEnd,
  containsAlong,
  offsetFromStart,
  edgeAnchor,
  findWallForAnchor,
  wallKey,
  wallBandPoints,
  DEFAULT_WALL_THICKNESS,
} from "@/lib/wall-utils";
import { getRoomWallSegments } from "@/lib/walls";
import { useWallsStore } from "@/stores/walls.store";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useHistoryStore } from "@/stores/history.store";
import { applyHistoryEntry } from "@/hooks/useEditorShortcuts";

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

function floorOf(rooms: Room[]): { id: string; name: string; level: number; rooms: Room[] } {
  return { id: "f1", name: "Planta Baja", level: 0, rooms };
}

function door(partial: Partial<Fixture> = {}): Fixture {
  return {
    id: "d1",
    catalogId: "puerta-standard",
    label: "Puerta",
    category: "door",
    x: 0,
    y: 0,
    width: 80,
    height: 10,
    rotation: 0,
    color: "#fff",
    props: {},
    floorId: "f1",
    ...partial,
  };
}

function topWall(partial: Partial<Wall> = {}): Wall {
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

describe("wallKey / existingWallKey", () => {
  it("normaliza el orden y redondea los extremos", () => {
    expect(wallKey("r1", "top", 250, 10)).toBe("r1|top|10|250");
    expect(wallKey("r1", "left", 10.4, 10)).toBe("r1|left|10|10");
  });
});

describe("materializeFloorWalls", () => {
  it("materializa 4 paredes de una habitación encerrada (líneas centrales)", () => {
    const walls = materializeFloorWalls(floorOf([makeRoom({ id: "r1" })]));
    expect(walls).toHaveLength(4);
    const top = walls.find((w) => w.y1 === w.y2 && w.y1 === 5);
    const bottom = walls.find((w) => w.y1 === w.y2 && w.y1 === 195);
    const left = walls.find((w) => w.x1 === w.x2 && w.x1 === 5);
    const right = walls.find((w) => w.x1 === w.x2 && w.x1 === 295);
    expect(top).toMatchObject({ roomId: "r1", floorId: "f1", x1: 0, x2: 300, thickness: 10 });
    expect(bottom).toMatchObject({ x1: 0, x2: 300, thickness: 10 });
    expect(left).toMatchObject({ y1: 0, y2: 200, thickness: 10 });
    expect(right).toMatchObject({ y1: 0, y2: 200, thickness: 10 });
  });

  it("wallWidth 0 → sin paredes", () => {
    expect(materializeFloorWalls(floorOf([makeRoom({ id: "r1", wallWidth: 0 })]))).toHaveLength(0);
  });

  it("habitación abierta → segmentos con vano central (2 por pared)", () => {
    const walls = materializeFloorWalls(
      floorOf([makeRoom({ id: "r1", enclosed: false })])
    );
    // 4 lados × 2 segmentos (vano 90 en pared de 300)
    expect(walls).toHaveLength(8);
    const top = walls.filter((w) => w.y1 === 5);
    expect(top.map((w) => w.x1).sort((a, b) => a - b)).toEqual([0, 195]);
    expect(top.map((w) => w.x2).sort((a, b) => a - b)).toEqual([105, 300]);
  });

  it("habitaciones adyacentes → pared compartida fusionada (first-room-wins)", () => {
    const a = makeRoom({ id: "a", width: 300, height: 200 });
    const b = makeRoom({ id: "b", x: 300, y: 0, width: 200, height: 200 });
    const walls = materializeFloorWalls(floorOf([a, b]));
    // La pared compartida cae sobre el borde x=300 y pertenece a la
    // primera habitación del par (roomId del dueño, no undefined)
    const shared = walls.filter((w) => w.x1 === 300 && w.x2 === 300);
    expect(shared).toHaveLength(1);
    expect(shared[0]).toMatchObject({
      roomId: "a",
      x1: 300,
      x2: 300,
      y1: 0,
      y2: 200,
      thickness: 10,
      floorId: "f1",
    });
    // 3 propias por habitación (el lado compartido se omite) + 1 fusionada
    expect(walls).toHaveLength(7);
  });

  it("determinista: misma entrada → mismas geometrías", () => {
    const floor = floorOf([makeRoom({ id: "a" }), makeRoom({ id: "b", x: 300, y: 0 })]);
    const first = materializeFloorWalls(floor);
    const second = materializeFloorWalls(floor);
    expect(first.map((w) => [w.x1, w.y1, w.x2, w.y2, w.thickness])).toEqual(
      second.map((w) => [w.x1, w.y1, w.x2, w.y2, w.thickness])
    );
  });

  it("reusa ids estables bajo cambios de wallWidth (clave a lo largo del borde)", () => {
    const room = makeRoom({ id: "r1" });
    const existing: Wall[] = [topWall({ id: "keep", roomId: "r1" })];
    const thin = materializeFloorWalls(floorOf([room]), existing);
    const thick = materializeFloorWalls(
      floorOf([makeRoom({ id: "r1", wallWidth: 20 })]),
      existing
    );
    expect(thin.find((w) => w.y1 === 5)?.id).toBe("keep");
    const thickTop = thick.find((w) => w.y1 === w.y2);
    expect(thickTop?.id).toBe("keep");
    expect(thickTop?.y1).toBe(10); // línea central se corrió con ww/2
    expect(thickTop?.thickness).toBe(20);
  });

  it("cambio de geometría → id nuevo", () => {
    const room = makeRoom({ id: "r1" });
    const existing: Wall[] = [topWall({ id: "stale", x2: 200 })];
    const walls = materializeFloorWalls(floorOf([room]), existing);
    expect(walls.find((w) => w.y1 === 5)?.id).not.toBe("stale");
  });
});

describe("placeOnWall", () => {
  it("pared horizontal: centra la abertura en el offset, rotación 0", () => {
    const placed = placeOnWall(door({ x: 999, y: 999, wallId: "old" }), topWall(), 100);
    expect(placed).toMatchObject({
      x: 60,
      y: 0,
      rotation: 0,
      wallId: "w1",
      wallOffset: 100,
    });
  });

  it("pared vertical: rotación 90, ancla a lo largo del eje y", () => {
    const vertical = topWall({ id: "v1", x1: 5, y1: 0, x2: 5, y2: 200 });
    const placed = placeOnWall(door({ height: 80, width: 10 }), vertical, 100);
    expect(placed).toMatchObject({ x: 0, y: 60, rotation: 90, wallOffset: 100 });
  });

  it("clampa el offset al largo de la pared", () => {
    const placed = placeOnWall(door(), topWall(), 500);
    expect(placed.wallOffset).toBe(300);
    expect(placed.x).toBe(300 - 40);
  });

  it("soporta paredes en dirección negativa (x2 < x1)", () => {
    const reversed = topWall({ id: "w2", x1: 300, x2: 0 });
    const placed = placeOnWall(door(), reversed, 100);
    expect(placed).toMatchObject({ x: 60, y: 0, wallOffset: 100 });
  });
});

describe("medidas de pared", () => {
  it("wallLength / wallAlongStart / wallAlongEnd con dirección negativa", () => {
    const w = topWall({ x1: 250, x2: 10 });
    expect(wallLength(w)).toBe(240);
    expect(wallAlongStart(w)).toBe(10);
    expect(wallAlongEnd(w)).toBe(250);
  });

  it("containsAlong respeta los extremos con tolerancia EPS", () => {
    const w = topWall();
    expect(containsAlong(w, 0)).toBe(true);
    expect(containsAlong(w, 300)).toBe(true);
    // Dentro de la tolerancia EPS=1
    expect(containsAlong(w, -1)).toBe(true);
    expect(containsAlong(w, 301)).toBe(true);
    expect(containsAlong(w, -2)).toBe(false);
    expect(containsAlong(w, 302)).toBe(false);
  });

  it("offsetFromStart calcula y clampa el desplazamiento a lo largo", () => {
    const w = topWall();
    expect(offsetFromStart(w, { x: 100, y: 5 })).toBe(100);
    expect(offsetFromStart(w, { x: -20, y: 5 })).toBe(0);
    expect(offsetFromStart(w, { x: 500, y: 5 })).toBe(300);
  });
});

describe("edgeAnchor", () => {
  it("ancla v3 en los 4 lados (offset desde la esquina)", () => {
    const room = makeRoom({ id: "r1" });
    expect(edgeAnchor(room, "top", 100)).toEqual({ x: 100, y: 0 });
    expect(edgeAnchor(room, "bottom", 100)).toEqual({ x: 100, y: 200 });
    expect(edgeAnchor(room, "left", 100)).toEqual({ x: 0, y: 100 });
    expect(edgeAnchor(room, "right", 100)).toEqual({ x: 300, y: 100 });
  });
});

describe("findWallForAnchor", () => {
  const top = topWall({ id: "top" });
  const bottom = topWall({ id: "bottom", y1: 195, y2: 195 });

  it("filtra por orientación", () => {
    expect(findWallForAnchor([top, bottom], { x: 100, y: 0 }, false)).toBeNull();
  });

  it("prefiere la pared contenida de menor distancia perpendicular", () => {
    expect(findWallForAnchor([top, bottom], { x: 100, y: 0 }, true)).toMatchObject({
      id: "top",
    });
  });

  it("sin pared contenida, usa menor distancia (perpendicular + hueco)", () => {
    const shortA = topWall({ id: "a", x1: 0, x2: 100 });
    const shortB = topWall({ id: "b", x1: 180, x2: 300 });
    expect(findWallForAnchor([shortA, shortB], { x: 150, y: 0 }, true)).toMatchObject({
      id: "b",
    });
  });

  it("pared contenida gana aunque otra esté más cerca en perpendicular", () => {
    const nearButShort = topWall({ id: "near", x1: 0, x2: 50 });
    const containing = topWall({ id: "full", x1: 100, x2: 300 });
    expect(findWallForAnchor([nearButShort, containing], { x: 200, y: 0 }, true)).toMatchObject({
      id: "full",
    });
  });
});

describe("reanchorOpenings", () => {
  it("pared anclada existe → reposiciona sobre ella (wallOffset manda)", () => {
    const walls = [topWall({ id: "w1" })];
    const f = door({ wallId: "w1", wallSide: "top", wallOffset: 100, x: 999, y: 999 });
    const { fixtures, removedIds } = reanchorOpenings([f], walls);
    expect(removedIds).toEqual([]);
    expect(fixtures[0]).toMatchObject({ wallId: "w1", x: 60, y: 0, wallOffset: 100 });
  });

  it("pared anclada no existe → re-ancla a pared coincidente del mismo eje", () => {
    const walls = [topWall({ id: "new1" })];
    // Centro visual en x=140 → cae en la pared 0..300
    const f = door({ wallId: "gone", x: 100, y: 0, rotation: 0 });
    const { fixtures, removedIds } = reanchorOpenings([f], walls);
    expect(removedIds).toEqual([]);
    expect(fixtures[0]).toMatchObject({ wallId: "new1", x: 100, y: 0, wallOffset: 140 });
  });

  it("pared anclada no existe y no hay coincidente → descarta la abertura", () => {
    const f = door({ wallId: "gone", x: 100, y: 100 });
    const { fixtures, removedIds } = reanchorOpenings([f], []);
    expect(removedIds).toEqual(["d1"]);
    expect(fixtures).toEqual([]);
  });

  it("no toca fixtures que no son aberturas ni aberturas sin ancla", () => {
    const furniture = door({ id: "f1", catalogId: "mesa", category: "furniture", wallId: "w1" });
    const unanchored = door({ id: "f2", wallId: undefined });
    const { fixtures, removedIds } = reanchorOpenings([furniture, unanchored], []);
    expect(removedIds).toEqual([]);
    expect(fixtures.map((f) => f.id)).toEqual(["f1", "f2"]);
  });
});

describe("getRoomWallSegments (v3 intacto)", () => {
  it("sigue generando 4 segmentos sólidos en una habitación encerrada", () => {
    const room = makeRoom({ id: "r1" });
    expect(getRoomWallSegments(room, [], true)).toHaveLength(4);
  });
});

describe("wallBandPoints (banda de pared, v4-fix)", () => {
  it("pared horizontal: banda de espesor alrededor de la línea central", () => {
    const pts = wallBandPoints(0, 5, 300, 5, 10);
    // (0,10),(300,10),(300,0),(0,0) — Konva Line x1,y1,x2,y2,...
    expect(pts).toEqual([0, 10, 300, 10, 300, 0, 0, 0]);
  });

  it("pared vertical: banda a la izquierda/derecha de la línea central", () => {
    const pts = wallBandPoints(295, 0, 295, 200, 10);
    expect(pts).toEqual([290, 0, 290, 200, 300, 200, 300, 0]);
  });

  it("pared diagonal: la banda sigue la orientación real del segmento", () => {
    // 45°: normal perpendicular (−1,1)/√2 → offset por eje (thickness/2)/√2
    const pts = wallBandPoints(0, 0, 100, 100, 10);
    const o = (10 / 2) / Math.SQRT2;
    expect(pts[0]).toBeCloseTo(-o, 6);
    expect(pts[1]).toBeCloseTo(o, 6);
    expect(pts[2]).toBeCloseTo(100 - o, 6);
    expect(pts[3]).toBeCloseTo(100 + o, 6);
    expect(pts[4]).toBeCloseTo(100 + o, 6);
    expect(pts[5]).toBeCloseTo(100 - o, 6);
    expect(pts[6]).toBeCloseTo(o, 6);
    expect(pts[7]).toBeCloseTo(-o, 6);
  });

  it("espesor por defecto DEFAULT_WALL_THICKNESS (10)", () => {
    expect(wallBandPoints(0, 5, 300, 5)).toEqual(wallBandPoints(0, 5, 300, 5, 10));
    expect(DEFAULT_WALL_THICKNESS).toBe(10);
  });

  it("pared degenerada (longitud cero): banda de área nula, sin NaN", () => {
    const pts = wallBandPoints(50, 50, 50, 50, 10);
    expect(pts.every((v) => Number.isFinite(v))).toBe(true);
    expect(pts).toHaveLength(4);
  });
});

describe("addWall merge (wd-7, P2)", () => {
  beforeEach(() => {
    useFloorsStore.setState({ floors: [], activeFloorId: "f1" });
    useFixtureStore.setState({ fixtures: [] });
    useWallsStore.setState({ walls: [] });
    useHistoryStore.setState({ past: [], future: [] });
  });

  it("merges a contiguous free-form wall into ONE wall with ONE undo step (wd-7)", () => {
    useWallsStore.setState({
      walls: [topWall({ id: "a", x1: 0, y1: 100, x2: 400, y2: 100 })],
    });

    useWallsStore.getState().addWall({
      floorId: "f1",
      x1: 400,
      y1: 100,
      x2: 700,
      y2: 100,
      thickness: 10,
    });

    const walls = useWallsStore.getState().walls;
    expect(walls).toHaveLength(1);
    const merged = walls[0];
    expect(merged).toMatchObject({ x1: 0, y1: 100, x2: 700, y2: 100, thickness: 10 });
    expect(merged.roomId).toBeUndefined();
    expect(merged.id).not.toBe("a");

    // ONE undo restores the pre-merge wall (spec: "one undo restores both segments")
    const restored = useHistoryStore.getState().undo();
    expect(restored).not.toBeNull();
    if (restored) applyHistoryEntry(restored);
    const afterUndo = useWallsStore.getState().walls;
    expect(afterUndo).toHaveLength(1);
    expect(afterUndo[0]).toMatchObject({ id: "a", x1: 0, x2: 400 });
    expect(useHistoryStore.getState().canUndo()).toBe(false);
  });

  it("re-anchors openings of the absorbed wall to the merged wall (wd-7)", () => {
    useWallsStore.setState({
      walls: [topWall({ id: "a", x1: 0, y1: 100, x2: 400, y2: 100 })],
    });
    // Puerta anclada a la pared "a" en offset 200 (centro visual en x=200)
    useFixtureStore.setState({
      fixtures: [
        door({ id: "d1", x: 160, y: 95, wallId: "a", wallSide: "top", wallOffset: 200 }),
      ],
    });

    useWallsStore.getState().addWall({
      floorId: "f1",
      x1: 400,
      y1: 100,
      x2: 700,
      y2: 100,
      thickness: 10,
    });

    const merged = useWallsStore.getState().walls[0];
    expect(merged).toMatchObject({ x1: 0, x2: 700 });
    expect(merged.id).not.toBe("a");

    const fixture = useFixtureStore.getState().fixtures[0];
    expect(fixture.wallId).toBe(merged.id);
    expect(fixture.wallOffset).toBe(200); // offset equivalente (centro visual intacto)
    expect(fixture.x).toBe(160);
    expect(fixture.y).toBe(95);
  });

  it("appends when no merge applies (gap exceeds EPS) (wd-7)", () => {
    useWallsStore.setState({
      walls: [topWall({ id: "a", x1: 0, y1: 100, x2: 400, y2: 100 })],
    });

    useWallsStore.getState().addWall({
      floorId: "f1",
      x1: 405,
      y1: 100,
      x2: 700,
      y2: 100,
      thickness: 10,
    });

    expect(useWallsStore.getState().walls).toHaveLength(2);
  });

  it("never merges room-derived walls (wd-7)", () => {
    useWallsStore.setState({
      walls: [topWall({ id: "a", x1: 0, y1: 100, x2: 400, y2: 100, roomId: "r1" })],
    });

    useWallsStore.getState().addWall({
      floorId: "f1",
      x1: 400,
      y1: 100,
      x2: 700,
      y2: 100,
      thickness: 10,
    });

    const walls = useWallsStore.getState().walls;
    expect(walls).toHaveLength(2);
    expect(walls.find((w) => w.roomId === "r1")).toMatchObject({ id: "a", x1: 0, x2: 400 });
    expect(walls.find((w) => !w.roomId)).toMatchObject({ x1: 400, x2: 700 });
  });
});

describe("move/resize merge (wd-7, U3)", () => {
  beforeEach(() => {
    useFloorsStore.setState({ floors: [], activeFloorId: "f1" });
    useFixtureStore.setState({ fixtures: [] });
    useWallsStore.setState({ walls: [] });
    useHistoryStore.setState({ past: [], future: [] });
  });

  it("move that becomes collinear and contiguous merges into ONE wall with ONE undo step", () => {
    useWallsStore.setState({
      walls: [
        topWall({ id: "a", x1: 0, y1: 100, x2: 400, y2: 100 }),
        topWall({ id: "w", x1: 500, y1: 200, x2: 700, y2: 200 }),
      ],
    });

    useWallsStore.getState().moveWall("w", 400, 100, 700, 100);

    const walls = useWallsStore.getState().walls;
    expect(walls).toHaveLength(1);
    const merged = walls[0];
    expect(merged).toMatchObject({ x1: 0, y1: 100, x2: 700, y2: 100, thickness: 10 });
    expect(merged.roomId).toBeUndefined();
    expect(merged.id).not.toBe("a");
    expect(merged.id).not.toBe("w");

    // ONE undo restores both source walls (no intermediate merge state)
    const restored = useHistoryStore.getState().undo();
    expect(restored).not.toBeNull();
    if (restored) applyHistoryEntry(restored);
    const afterUndo = useWallsStore.getState().walls;
    expect(afterUndo).toHaveLength(2);
    expect(afterUndo.map((w) => w.id).sort()).toEqual(["a", "w"]);
    expect(afterUndo.find((w) => w.id === "w")).toMatchObject({
      x1: 500,
      y1: 200,
      x2: 700,
      y2: 200,
    });
    expect(useHistoryStore.getState().canUndo()).toBe(false);
  });

  it("resize that becomes collinear and contiguous merges into ONE wall with ONE undo step", () => {
    useWallsStore.setState({
      walls: [
        topWall({ id: "a", x1: 0, y1: 100, x2: 400, y2: 100 }),
        topWall({ id: "w", x1: 500, y1: 100, x2: 700, y2: 100 }),
      ],
    });

    useWallsStore.getState().resizeWall("w", 400, 100, 700, 100);

    const walls = useWallsStore.getState().walls;
    expect(walls).toHaveLength(1);
    expect(walls[0]).toMatchObject({ x1: 0, y1: 100, x2: 700, y2: 100 });
    expect(walls[0].id).not.toBe("a");
    expect(walls[0].id).not.toBe("w");

    const restored = useHistoryStore.getState().undo();
    expect(restored).not.toBeNull();
    if (restored) applyHistoryEntry(restored);
    const afterUndo = useWallsStore.getState().walls;
    expect(afterUndo).toHaveLength(2);
    expect(afterUndo.find((w) => w.id === "w")).toMatchObject({ x1: 500, y1: 100, x2: 700 });
    expect(useHistoryStore.getState().canUndo()).toBe(false);
  });

  it("resolves a sandwiched A…W…B union when the moved wall lands between two walls", () => {
    useWallsStore.setState({
      walls: [
        topWall({ id: "a", x1: 0, y1: 100, x2: 400, y2: 100 }),
        topWall({ id: "w", x1: 800, y1: 300, x2: 900, y2: 300 }),
        topWall({ id: "b", x1: 700, y1: 100, x2: 1000, y2: 100 }),
      ],
    });

    useWallsStore.getState().moveWall("w", 400, 100, 700, 100);

    const walls = useWallsStore.getState().walls;
    expect(walls).toHaveLength(1);
    expect(walls[0]).toMatchObject({ x1: 0, y1: 100, x2: 1000, y2: 100 });
  });

  it("never merges a room-derived neighbor on move (wd-7)", () => {
    useWallsStore.setState({
      walls: [
        topWall({ id: "a", x1: 0, y1: 100, x2: 400, y2: 100, roomId: "r1" }),
        topWall({ id: "w", x1: 500, y1: 200, x2: 700, y2: 200 }),
      ],
    });

    useWallsStore.getState().moveWall("w", 400, 100, 700, 100);

    const walls = useWallsStore.getState().walls;
    expect(walls).toHaveLength(2);
    expect(walls.find((w) => w.roomId === "r1")).toMatchObject({ id: "a", x1: 0, x2: 400 });
    expect(walls.find((w) => !w.roomId)).toMatchObject({ id: "w", x1: 400, x2: 700 });
  });

  it("never merges a room-derived target on move (wd-7)", () => {
    useWallsStore.setState({
      walls: [
        topWall({ id: "a", x1: 0, y1: 100, x2: 400, y2: 100 }),
        topWall({ id: "w", x1: 500, y1: 200, x2: 700, y2: 200, roomId: "r1" }),
      ],
    });

    useWallsStore.getState().moveWall("w", 400, 100, 700, 100);

    const walls = useWallsStore.getState().walls;
    expect(walls).toHaveLength(2);
    expect(walls.find((w) => w.id === "w")).toMatchObject({ x1: 400, x2: 700, roomId: "r1" });
    expect(walls.find((w) => w.id === "a")).toMatchObject({ x1: 0, x2: 400 });
  });

  it("re-anchors openings to the surviving merged wall after a move", () => {
    useWallsStore.setState({
      walls: [
        topWall({ id: "a", x1: 0, y1: 100, x2: 400, y2: 100 }),
        topWall({ id: "w", x1: 500, y1: 200, x2: 700, y2: 200 }),
      ],
    });
    // Door anchored to "w" at offset 100 → visual center (600, 200)
    useFixtureStore.setState({
      fixtures: [
        door({ id: "d1", x: 560, y: 195, wallId: "w", wallSide: "top", wallOffset: 100 }),
      ],
    });

    useWallsStore.getState().moveWall("w", 400, 100, 700, 100);

    const merged = useWallsStore.getState().walls[0];
    expect(merged).toMatchObject({ x1: 0, x2: 700 });
    expect(merged.id).not.toBe("w");

    const fixture = useFixtureStore.getState().fixtures[0];
    expect(fixture.wallId).toBe(merged.id);
    // The opening follows the moved wall: x-center stays at 600 (offset
    // recomputed on the merged wall), y-center rides the wall to y=100
    expect(fixture.x + fixture.width / 2).toBe(600);
    expect(fixture.y + fixture.height / 2).toBe(100);
  });

  it("re-anchors openings to the surviving merged wall after a resize", () => {
    useWallsStore.setState({
      walls: [
        topWall({ id: "a", x1: 0, y1: 100, x2: 400, y2: 100 }),
        topWall({ id: "w", x1: 500, y1: 100, x2: 700, y2: 100 }),
      ],
    });
    // Door anchored to "a" at offset 200 → visual center (200, 100)
    useFixtureStore.setState({
      fixtures: [
        door({ id: "d1", x: 160, y: 95, wallId: "a", wallSide: "top", wallOffset: 200 }),
      ],
    });

    useWallsStore.getState().resizeWall("w", 400, 100, 700, 100);

    const merged = useWallsStore.getState().walls[0];
    expect(merged).toMatchObject({ x1: 0, x2: 700 });
    expect(merged.id).not.toBe("a");

    const fixture = useFixtureStore.getState().fixtures[0];
    expect(fixture.wallId).toBe(merged.id);
    expect(fixture.x + fixture.width / 2).toBe(200);
    expect(fixture.y + fixture.height / 2).toBe(100);
  });
});
