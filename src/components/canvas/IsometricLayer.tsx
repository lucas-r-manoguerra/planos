/**
 * Capa isométrica (2.5D) — preview del plano con cámara fija (S3).
 *
 * Renderiza la escena proyectada por lib/isometric.ts: losa del terreno, pisos
 * de habitaciones, paredes extruidas (z = SunSettings.floorHeight, default 280
 * cm) y aberturas ancladas a paredes (puertas en piso, ventanas con alféizar).
 *
 * La proyección se memoiza por geometría + settings: pan/zoom viven en el
 * Stage de Konva y NUNCA recalculan la escena (spec isometric-view-3,
 * regla 09). Selectores finos (regla 05): solo la geometría que pinta.
 *
 * Solamente se monta cuando viewMode === "isometric" (PlanCanvas) — en 2D no
 * existe ningún costo. Interacciones 2D (dibujo, snap, colocación) quedan
 * fuera en iso: esta capa no escucha eventos (listening={false}).
 */

"use client";

import { memo, useMemo } from "react";
import { Group, Line } from "react-konva";
import { useShallow } from "zustand/react/shallow";
import { useFloorsStore } from "@/stores/floors.store";
import { useWallsStore } from "@/stores/walls.store";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useSunStore } from "@/stores/sun.store";
import {
  isoOpeningQuad,
  isoRect,
  isoWallFaces,
} from "@/lib/isometric";
import { openingExtrusion } from "@/lib/openings";
import { ROOM_COLORS } from "@/lib/constants";
import { Fixture, Room, Terrain, Wall } from "@/types/plan";
import { useCanvasColors } from "./canvas-colors";

/** Altura de piso por defecto en cm (constants.ts:68) — seguro ante 0 */
const DEFAULT_FLOOR_HEIGHT = 280;

/** Oscurece/clarifica un color #rrggbb (factor < 1 oscurece, > 1 aclara) */
function shade(hex: string, factor: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const clamp255 = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  const r = clamp255((n >> 16) * factor);
  const g = clamp255(((n >> 8) & 0xff) * factor);
  const b = clamp255((n & 0xff) * factor);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

interface IsoRoom {
  key: string;
  points: number[];
  fill: string;
  opacity: number;
}

interface IsoOpening {
  key: string;
  points: number[];
  fill: string;
  stroke: string;
}

interface IsoWall {
  key: string;
  top: number[];
  sideA: number[];
  sideB: number[];
  topFill: string;
  sideFill: string;
  depth: number;
  openings: IsoOpening[];
}

interface IsoScene {
  terrain: number[];
  rooms: IsoRoom[];
  walls: IsoWall[];
}

/** Construye la escena proyectada (puro: sin stores, sin componentes) */
function buildIsoScene(
  terrain: Terrain,
  rooms: Room[],
  walls: Wall[],
  openings: Fixture[],
  floorHeight: number,
  wallColor: string
): IsoScene {
  const sideFill = shade(wallColor, 0.7);
  const topFill = shade(wallColor, 1.25);

  // Aberturas ancladas, agrupadas por pared (solo las que tienen pared)
  const openingsByWall = new Map<string, Fixture[]>();
  for (const opening of openings) {
    if (!opening.wallId) continue;
    const list = openingsByWall.get(opening.wallId);
    if (list) list.push(opening);
    else openingsByWall.set(opening.wallId, [opening]);
  }

  const wallsIso = walls
    .map((wall) => {
      const faces = isoWallFaces(wall, floorHeight);
      if (!faces) return null;
      const wallOpenings = (openingsByWall.get(wall.id) ?? []).map((opening) => {
        // Alturas por categoría (fuente única S4): puerta en piso (200 cm),
        // ventana sobre alféizar (90→120 cm). Subtipos S4 se alinean solos.
        const { height, zStart } = openingExtrusion(opening.category);
        const points =
          isoOpeningQuad(wall, opening.wallOffset ?? 0, opening.width, height, zStart) ?? [];
        return {
          key: opening.id,
          points,
          fill: opening.color,
          stroke: shade(opening.color, 0.55),
        };
      });
      return {
        key: wall.id,
        top: faces.top,
        sideA: faces.sideA,
        sideB: faces.sideB,
        topFill,
        sideFill,
        depth: faces.depth,
        openings: wallOpenings,
      };
    })
    .filter((w): w is IsoWall => w !== null)
    .sort((a, b) => a.depth - b.depth);

  return {
    terrain: isoRect(0, 0, terrain.width, terrain.height, 0),
    rooms: rooms.map((room) => ({
      key: room.id,
      points: isoRect(room.x, room.y, room.width, room.height, 0),
      fill: room.color || ROOM_COLORS[room.type],
      opacity: room.opacity ?? 1,
    })),
    walls: wallsIso,
  };
}

/** Capa isométrica memoizada: la escena solo cambia con geometría/settings */
export const IsometricLayer = memo(function IsometricLayer() {
  const terrain = useTerrainStore((s) => s.terrain);
  const floors = useFloorsStore((s) => s.floors);
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);
  const floorHeight = useSunStore((s) => s.floorHeight) || DEFAULT_FLOOR_HEIGHT;
  const walls = useWallsStore(useShallow((s) => s.getWallsForFloor(activeFloorId)));
  const fixtures = useFixtureStore(
    useShallow((s) => s.getFixturesForFloor(activeFloorId))
  );
  const { wall: wallColor } = useCanvasColors();

  // Memoizado: la referencia de rooms es estable salvo que cambien floors
  // (el `?? []` fuera de un useMemo crearía un array nuevo por render)
  const rooms = useMemo(
    () => floors.find((f) => f.id === activeFloorId)?.rooms ?? [],
    [floors, activeFloorId]
  );

  const openings = useMemo(
    () =>
      fixtures.filter(
        (f) => f.wallId && (f.category === "door" || f.category === "window")
      ),
    [fixtures]
  );

  // Memoizado: pan/zoom (Stage) no cambian estas dependencias → sin recomputo
  const scene = useMemo(
    () => buildIsoScene(terrain, rooms, walls, openings, floorHeight, wallColor),
    [terrain, rooms, walls, openings, floorHeight, wallColor]
  );

  return (
    <>
      <Line
        points={scene.terrain}
        closed
        fill={terrain.color}
        listening={false}
      />
      {scene.rooms.map((room) => (
        <Line
          key={room.key}
          points={room.points}
          closed
          fill={room.fill}
          opacity={room.opacity}
          listening={false}
        />
      ))}
      {scene.walls.map((wall) => (
        <Group key={wall.key} listening={false}>
          <Line points={wall.sideB} closed fill={wall.sideFill} />
          <Line points={wall.sideA} closed fill={wall.sideFill} />
          <Line points={wall.top} closed fill={wall.topFill} />
          {wall.openings.map((opening) =>
            opening.points.length > 0 ? (
              <Line
                key={opening.key}
                points={opening.points}
                closed
                fill={opening.fill}
                stroke={opening.stroke}
                strokeWidth={1}
              />
            ) : null
          )}
        </Group>
      ))}
    </>
  );
});
