/**
 * Utilidades de paredes (v4): materialización de paredes de habitaciones
 * y re-anclaje de aberturas.
 *
 * Unidad: centímetros (cm). Puro: no importa stores ni componentes.
 * Todo lo que es cálculo de segmentos de una habitación vive en walls.ts;
 * este archivo convierte esos segmentos en entidades Wall (línea central
 * absoluta) y resuelve el anclaje de fixtures a esas entidades.
 */

import { Fixture, Floor, Point, Room, Wall } from "@/types/plan";
import {
  EPS,
  Seg,
  WallSegment,
  WallSide,
  findMergedWalls,
  getRoomWallSegments,
  isCovered,
  segmentsCoincide,
} from "@/lib/walls";

/** Espesor de pared por defecto (cm) — mismo default que Room.wallWidth */
export const DEFAULT_WALL_THICKNESS = 10;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Banda (polígono) de una pared alrededor de su línea central, en formato
 * Konva Line (x1,y1,x2,y2,...). Soportada paredes DIAGONALES: a diferencia
 * de un rect axis-aligned, la banda sigue la orientación real del segmento.
 * Para paredes horizontales/verticales coincide exactamente con el rect de
 * espesor `thickness` (mismo resultado que la versión anterior a v4-fix).
 * Pared degenerada (longitud cero) → cuadrilátero de área nula.
 */
export function wallBandPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number = DEFAULT_WALL_THICKNESS
): number[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len <= EPS) return [x1, y1, x2, y2];
  // Normal perpendicular a la línea central (gira 90°)
  const nx = -dy / len;
  const ny = dx / len;
  const half = thickness / 2;
  return [
    x1 + nx * half, y1 + ny * half,
    x2 + nx * half, y2 + ny * half,
    x2 - nx * half, y2 - ny * half,
    x1 - nx * half, y1 - ny * half,
  ];
}

// ==================== Claves canónicas (reuso de IDs) ====================

/**
 * Clave canónica de una pared de habitación: `roomId|side|alongStart|alongEnd`
 * con coordenadas a lo largo de la LÍNEA del borde de la habitación
 * (absolutas, redondeadas). Estable bajo cambios de wallWidth: el borde no
 * se mueve, solo la línea central de la banda.
 */
export function wallKey(
  roomId: string,
  side: WallSide,
  alongStart: number,
  alongEnd: number
): string {
  return `${roomId}|${side}|${Math.round(Math.min(alongStart, alongEnd))}|${Math.round(Math.max(alongStart, alongEnd))}`;
}

function sideOfWall(wall: Wall, room: Room): WallSide {
  const horizontal = wall.y1 === wall.y2;
  if (horizontal) {
    return wall.y1 < room.y + room.height / 2 ? "top" : "bottom";
  }
  return wall.x1 < room.x + room.width / 2 ? "left" : "right";
}

/** Clave canónica de una entidad Wall existente (mismo formato que wallKey) */
export function existingWallKey(wall: Wall, room: Room): string {
  const side = sideOfWall(wall, room);
  const horizontal = side === "top" || side === "bottom";
  const alongStart = horizontal ? wall.x1 : wall.y1;
  const alongEnd = horizontal ? wall.x2 : wall.y2;
  return wallKey(room.id, side, alongStart, alongEnd);
}

// ==================== Paredes fusionadas ====================

export interface MergedWallCandidate {
  /** Habitación dueña (la primera del par, orden de floors) */
  ownerId: string;
  /** Lado de la habitación dueña sobre el que cae la pared */
  side: WallSide;
  /** Rectángulo exacto de findMergedWalls (v3-identical, absoluto) */
  rect: WallSegment;
  /** Línea central absoluta de la pared */
  line: Seg;
  /** Espesor: mayor wallWidth del par */
  thickness: number;
}

/**
 * Derivar candidatas fusionadas de un par de habitaciones. La línea central
 * cae exactamente sobre el borde de la habitación A (dueña) — v3-exact.
 */
export function mergedCandidatesForPair(
  roomA: Room,
  roomB: Room
): MergedWallCandidate[] {
  const candidates: MergedWallCandidate[] = [];
  for (const rect of findMergedWalls(roomA, roomB)) {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    let side: WallSide;
    if (Math.abs(cx - (roomA.x + roomA.width)) <= EPS) {
      side = "right";
    } else if (Math.abs(cx - roomA.x) <= EPS) {
      side = "left";
    } else if (Math.abs(cy - (roomA.y + roomA.height)) <= EPS) {
      side = "bottom";
    } else {
      side = "top";
    }
    const horizontal = side === "top" || side === "bottom";
    const line: Seg = horizontal
      ? { x1: rect.x, y1: cy, x2: rect.x + rect.width, y2: cy }
      : { x1: cx, y1: rect.y, x2: cx, y2: rect.y + rect.height };
    candidates.push({
      ownerId: roomA.id,
      side,
      rect,
      line,
      thickness: horizontal ? rect.height : rect.width,
    });
  }
  return candidates;
}

// ==================== Materialización ====================

function sideOfSegment(room: Room, seg: WallSegment): WallSide {
  const ww = room.wallWidth ?? DEFAULT_WALL_THICKNESS;
  if (seg.height === ww) {
    return seg.y === 0 ? "top" : "bottom";
  }
  return seg.x === 0 ? "left" : "right";
}

/** Banda local → línea central absoluta (a half = ww/2 del borde) */
function toCenterline(room: Room, side: WallSide, seg: WallSegment): Seg {
  const ww = room.wallWidth ?? DEFAULT_WALL_THICKNESS;
  const half = ww / 2;
  switch (side) {
    case "top":
      return {
        x1: room.x + seg.x,
        y1: room.y + half,
        x2: room.x + seg.x + seg.width,
        y2: room.y + half,
      };
    case "bottom":
      return {
        x1: room.x + seg.x,
        y1: room.y + room.height - half,
        x2: room.x + seg.x + seg.width,
        y2: room.y + room.height - half,
      };
    case "left":
      return {
        x1: room.x + half,
        y1: room.y + seg.y,
        x2: room.x + half,
        y2: room.y + seg.y + seg.height,
      };
    case "right":
      return {
        x1: room.x + room.width - half,
        y1: room.y + seg.y,
        x2: room.x + room.width - half,
        y2: room.y + seg.y + seg.height,
      };
  }
}

/**
 * Materializa las paredes de una planta a partir de sus habitaciones:
 * fusionadas primero (compartidas), luego paredes individuales por
 * habitación en el orden de `floor.rooms`. Devuelve SOLO paredes derivadas
 * de habitaciones (roomId seteado) — las paredes libres las gestiona el
 * store.
 *
 * Reuso de IDs: una pared existente con el mismo floorId/roomId y la misma
 * clave canónica conserva su id; cambios de geometría generan ids nuevos.
 */
export function materializeFloorWalls(
  floor: Floor,
  existingWalls: Wall[] = [],
  generateId: () => string = () => crypto.randomUUID()
): Wall[] {
  const rooms = floor.rooms;
  const roomById = new Map(rooms.map((r) => [r.id, r]));

  // 1) Paredes fusionadas (compartidas entre habitaciones adyacentes)
  const merged: MergedWallCandidate[] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      merged.push(...mergedCandidatesForPair(rooms[i], rooms[j]));
    }
  }

  // 2) Reuso de IDs: clave canónica → pared existente
  const existingByKey = new Map<string, Wall>();
  for (const wall of existingWalls) {
    if (!wall.roomId || wall.floorId !== floor.id) continue;
    const room = roomById.get(wall.roomId);
    if (!room) continue;
    existingByKey.set(existingWallKey(wall, room), wall);
  }

  const emitted: Seg[] = [];
  const walls: Wall[] = [];

  const emit = (
    ownerId: string,
    side: WallSide,
    line: Seg,
    thickness: number
  ) => {
    const horizontal = line.y1 === line.y2;
    const key = wallKey(
      ownerId,
      side,
      horizontal ? line.x1 : line.y1,
      horizontal ? line.x2 : line.y2
    );
    const existing = existingByKey.get(key);
    walls.push({
      id: existing?.id ?? generateId(),
      floorId: floor.id,
      roomId: ownerId,
      x1: line.x1,
      y1: line.y1,
      x2: line.x2,
      y2: line.y2,
      thickness,
    });
    emitted.push(line);
  };

  // 3) Fusionadas primero (la pared compartida pertenece a la primera
  //    habitación del par — orden de floor.rooms).
  for (const m of merged) {
    emit(m.ownerId, m.side, m.line, m.thickness);
  }

  // 4) Paredes individuales por habitación (skip si cubiertas o si una
  //    pared ya emitida coincide con la línea central — first-room-wins).
  const mergedRects: WallSegment[] = merged.map((m) => m.rect);
  for (const room of rooms) {
    const ww = room.wallWidth ?? DEFAULT_WALL_THICKNESS;
    if (ww <= 0) continue;
    const segments = getRoomWallSegments(
      room,
      mergedRects,
      room.enclosed !== false
    );
    for (const seg of segments) {
      if (isCovered(seg, room.x, room.y, mergedRects)) continue;
      const side = sideOfSegment(room, seg);
      const line = toCenterline(room, side, seg);
      if (emitted.some((e) => segmentsCoincide(e, line))) continue;
      emit(room.id, side, line, ww);
    }
  }

  return walls;
}

// ==================== Posicionamiento sobre paredes ====================

export function wallLength(wall: Wall): number {
  return wall.y1 === wall.y2
    ? Math.abs(wall.x2 - wall.x1)
    : Math.abs(wall.y2 - wall.y1);
}

export function wallAlongStart(wall: Wall): number {
  return wall.y1 === wall.y2
    ? Math.min(wall.x1, wall.x2)
    : Math.min(wall.y1, wall.y2);
}

export function wallAlongEnd(wall: Wall): number {
  return wall.y1 === wall.y2
    ? Math.max(wall.x1, wall.x2)
    : Math.max(wall.y1, wall.y2);
}

/** ¿El offset (a lo largo de la pared) cae dentro de la pared? */
export function containsAlong(wall: Wall, along: number, eps: number = EPS): boolean {
  return along >= wallAlongStart(wall) - eps && along <= wallAlongEnd(wall) + eps;
}

/** Offset de un punto a lo largo de la pared (clamp 0..largo) */
export function offsetFromStart(wall: Wall, anchor: Point): number {
  const along = wall.y1 === wall.y2 ? anchor.x : anchor.y;
  return clamp(along - wallAlongStart(wall), 0, wallLength(wall));
}

/**
 * Ubica una abertura sobre una pared: el centro del rectángulo queda sobre
 * la línea central de la pared, en `offset` cm desde su inicio. La rotación
 * alinea el largo de la abertura con la pared (0 horizontal, 90 vertical).
 */
export function placeOnWall(fixture: Fixture, wall: Wall, offset: number): Fixture {
  const along = clamp(offset, 0, wallLength(wall));
  const anchor: Point =
    wall.y1 === wall.y2
      ? { x: wallAlongStart(wall) + along, y: wall.y1 }
      : { x: wall.x1, y: wallAlongStart(wall) + along };
  return {
    ...fixture,
    wallId: wall.id,
    rotation: wall.y1 === wall.y2 ? 0 : 90,
    x: anchor.x - fixture.width / 2,
    y: anchor.y - fixture.height / 2,
    wallOffset: along,
  };
}

/**
 * Punto de anclaje v3 de una abertura sobre el borde de una habitación
 * (semántica legada: offset desde la esquina de la pared).
 */
export function edgeAnchor(room: Room, side: WallSide, offset: number): Point {
  switch (side) {
    case "top":
      return { x: room.x + offset, y: room.y };
    case "bottom":
      return { x: room.x + offset, y: room.y + room.height };
    case "left":
      return { x: room.x, y: room.y + offset };
    case "right":
      return { x: room.x + room.width, y: room.y + offset };
  }
}

/**
 * Mejor pared candidata para un ancla: misma orientación que `horizontal`.
 * Prefiere paredes que contienen el ancla (menor distancia perpendicular);
 * si ninguna contiene, la de menor distancia (perpendicular + hueco a lo
 * largo hasta el extremo más cercano).
 */
export function findWallForAnchor(
  walls: Wall[],
  anchor: Point,
  horizontal: boolean
): Wall | null {
  const candidates = walls.filter((w) => (w.y1 === w.y2) === horizontal);
  if (candidates.length === 0) return null;

  const containing = candidates.filter((w) =>
    containsAlong(w, horizontal ? anchor.x : anchor.y)
  );
  const pool = containing.length > 0 ? containing : candidates;

  let best: Wall | null = null;
  let bestScore = Infinity;
  for (const w of pool) {
    const along = horizontal ? anchor.x : anchor.y;
    const perp = horizontal
      ? Math.abs(anchor.y - w.y1)
      : Math.abs(anchor.x - w.x1);
    const gap = containsAlong(w, along)
      ? 0
      : Math.min(
          Math.abs(along - wallAlongStart(w)),
          Math.abs(along - wallAlongEnd(w))
        );
    const score = perp + gap;
    if (score < bestScore) {
      bestScore = score;
      best = w;
    }
  }
  return best;
}

// ==================== Re-anclaje de aberturas ====================

export interface ReanchorResult {
  /** Fixtures resultantes (aberturas reasignadas + el resto intacto) */
  fixtures: Fixture[];
  /** IDs de aberturas descartadas (sin pared donde re-anclar) */
  removedIds: string[];
}

/** Ancla visual de una abertura a lo largo de su pared (centro) */
function anchorAlongFor(fixture: Fixture): number {
  return fixture.rotation % 180 === 0
    ? fixture.x + fixture.width / 2
    : fixture.y + fixture.height / 2;
}

function reanchorToWall(fixture: Fixture, walls: Wall[]): Fixture | null {
  const horizontal = fixture.rotation % 180 === 0;
  const along = anchorAlongFor(fixture);
  const wall = walls.find(
    (w) => (w.y1 === w.y2) === horizontal && containsAlong(w, along)
  );
  if (!wall) return null;
  return placeOnWall(fixture, wall, along - wallAlongStart(wall));
}

/**
 * Re-ancla aberturas (puertas/ventanas) tras un cambio de paredes:
 * - La pared anclada existe → se reposiciona sobre ella (wallOffset manda;
 *   la abertura sigue a la pared — spec fixtures-management-4).
 * - La pared ya no existe → re-ancla a una pared coincidente de igual
 *   orientación que contenga el centro visual de la abertura; si no hay,
 *   la descarta (quedaría flotando).
 * Puro: devuelve los fixtures resultantes y los ids descartados.
 */
export function reanchorOpenings(
  fixtures: Fixture[],
  walls: Wall[]
): ReanchorResult {
  const wallById = new Map(walls.map((w) => [w.id, w]));
  const result: Fixture[] = [];
  const removedIds: string[] = [];

  for (const f of fixtures) {
    const isOpening = f.category === "door" || f.category === "window";
    if (!isOpening || !f.wallId) {
      result.push(f);
      continue;
    }
    const wall = wallById.get(f.wallId);
    if (wall) {
      result.push(placeOnWall(f, wall, f.wallOffset ?? 0));
      continue;
    }
    const reanchored = reanchorToWall(f, walls);
    if (reanchored) {
      result.push(reanchored);
    } else {
      removedIds.push(f.id);
    }
  }

  return { fixtures: result, removedIds };
}
