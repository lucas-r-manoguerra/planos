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
import { useStructuralStore } from "@/stores/structural.store";
import {
  isoOpeningQuad,
  isoRect,
  isoWallFaces,
} from "@/lib/isometric";
import { openingExtrusion } from "@/lib/openings";
import { ROOM_COLORS } from "@/lib/constants";
import { Beam, Column, Fixture, Room, Terrain, Wall } from "@/types/plan";
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
  columns: IsoColumn[];
  beams: IsoBeam[];
}

interface IsoColumn {
  key: string;
  top: number[];
  sideA: number[];
  sideB: number[];
  topFill: string;
  sideFill: string;
  depth: number;
}

interface IsoBeam {
  key: string;
  top: number[];
  sideA: number[];
  sideB: number[];
  topFill: string;
  sideFill: string;
  depth: number;
}

/** Construye la escena proyectada (puro: sin stores, sin componentes) */
function buildIsoScene(
  terrain: Terrain,
  rooms: Room[],
  walls: Wall[],
  openings: Fixture[],
  floorHeight: number,
  wallColor: string,
  columns: Column[],
  beams: Beam[],
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
    .filter((w): w is IsoWall => w !== null);

  // Columnas como prismas verticales (z = 0 → floorHeight)
  const colSideFill = shade("#60a5fa", 0.7);
  const colTopFill = shade("#60a5fa", 1.25);
  const columnsIso: IsoColumn[] = columns
    .map((col) => {
      const hw = col.sectionWidth / 2;
      const hh = col.sectionHeight / 2;
      const bottom = isoRect(col.x - hw, col.y - hh, col.sectionWidth, col.sectionHeight, 0);
      const top = isoRect(col.x - hw, col.y - hh, col.sectionWidth, col.sectionHeight, floorHeight);
      // Prism: top face + 2 visible side faces
      // Depth: center of column for sorting
      const cx = col.x;
      const cy = col.y;
      // Side faces from bottom corners to top corners
      // Front-left face
      const sideA = [
        bottom[0], bottom[1], // bottom-left
        bottom[2], bottom[3], // bottom-right
        top[2], top[3],       // top-right
        top[0], top[1],       // top-left
      ];
      // Side-bottom face (visible when looking from below)
      const sideB = [
        bottom[2], bottom[3], // bottom-right
        bottom[4], bottom[5], // bottom-far-right
        top[4], top[5],       // top-far-right
        top[2], top[3],       // top-right
      ];
      return {
        key: `iso-col-${col.id}`,
        top,
        sideA,
        sideB,
        topFill: colTopFill,
        sideFill: colSideFill,
        depth: cx + cy,
      };
    });

  // Vigas como bandas extruidas (z = 0 → floorHeight)
  const beamSideFill = shade("#94a3b8", 0.7);
  const beamTopFill = shade("#94a3b8", 1.25);
  const beamsIso: IsoBeam[] = beams
    .map((beam) => {
      // Proyectar rectángulo del band de la viga en z=0 y z=floorHeight
      const bPoints = isoRect(
        Math.min(beam.x1, beam.x2) - beam.width / 2,
        Math.min(beam.y1, beam.y2) - beam.width / 2,
        Math.abs(beam.x2 - beam.x1) + beam.width,
        Math.abs(beam.y2 - beam.y1) + beam.width,
        0,
      );
      const tPoints = isoRect(
        Math.min(beam.x1, beam.x2) - beam.width / 2,
        Math.min(beam.y1, beam.y2) - beam.width / 2,
        Math.abs(beam.x2 - beam.x1) + beam.width,
        Math.abs(beam.y2 - beam.y1) + beam.width,
        floorHeight,
      );
      const sideA = [bPoints[0], bPoints[1], bPoints[2], bPoints[3], tPoints[2], tPoints[3], tPoints[0], tPoints[1]];
      const sideB = [bPoints[2], bPoints[3], bPoints[4], bPoints[5], tPoints[4], tPoints[5], tPoints[2], tPoints[3]];
      return {
        key: `iso-beam-${beam.id}`,
        top: tPoints,
        sideA,
        sideB,
        topFill: beamTopFill,
        sideFill: beamSideFill,
        depth: (beam.x1 + beam.y1 + beam.x2 + beam.y2) / 2,
      };
    });

  return {
    terrain: isoRect(0, 0, terrain.width, terrain.height, 0),
    rooms: rooms.map((room) => ({
      key: room.id,
      points: isoRect(room.x, room.y, room.width, room.height, 0),
      fill: room.color || ROOM_COLORS[room.type],
      opacity: room.opacity ?? 1,
    })),
    walls: wallsIso.sort((a, b) => a.depth - b.depth),
    columns: columnsIso.sort((a, b) => a.depth - b.depth),
    beams: beamsIso.sort((a, b) => a.depth - b.depth),
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
  const columns = useStructuralStore(
    useShallow((s) => s.columns.filter((c) => c.floorId === activeFloorId))
  );
  const beams = useStructuralStore(
    useShallow((s) => s.beams.filter((b) => b.floorId === activeFloorId))
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
    () => buildIsoScene(terrain, rooms, walls, openings, floorHeight, wallColor, columns, beams),
    [terrain, rooms, walls, openings, floorHeight, wallColor, columns, beams]
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
      {/* Columnas isométricas (prismas verticales) */}
      {scene.columns.map((col) => (
        <Group key={col.key} listening={false}>
          <Line points={col.sideB} closed fill={col.sideFill} />
          <Line points={col.sideA} closed fill={col.sideFill} />
          <Line points={col.top} closed fill={col.topFill} />
        </Group>
      ))}
      {/* Vigas isométricas (bandas extruidas) */}
      {scene.beams.map((beam) => (
        <Group key={beam.key} listening={false}>
          <Line points={beam.sideB} closed fill={beam.sideFill} />
          <Line points={beam.sideA} closed fill={beam.sideFill} />
          <Line points={beam.top} closed fill={beam.topFill} />
        </Group>
      ))}
    </>
  );
});
