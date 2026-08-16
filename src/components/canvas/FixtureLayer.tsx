/**
 * Capa de fixtures (muebles, plantas, puertas, ventanas, escaleras)
 *
 * Renderiza todos los fixtures de la planta activa en el canvas.
 * Permite seleccionar, arrastrar y eliminar fixtures.
 *
 * S4: el dibujo de aberturas y escaleras se delega a glifos puros en
 * `./glyphs/` (DoorGlyph, WindowGlyph, StairGlyph); la interacción común
 * (drag con gesture de history, selección, context menu, hover) vive en
 * FixtureGlyphGroup. Esta capa solo orquesta: stores, selección y hover
 * (spec openings-visualization-1, regla 01: capa delgada, sin geometría).
 */

"use client";

import { memo, useState } from "react";
import { Group, Rect, Text } from "react-konva";
import { useShallow } from "zustand/react/shallow";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useCanvasStore } from "@/stores/canvas.store";
import { Fixture } from "@/types/plan";
import { useCanvasColors } from "./canvas-colors";
import { FixtureGlyphGroup } from "./glyphs/FixtureGlyphGroup";
import { DoorGlyph } from "./glyphs/DoorGlyph";
import { WindowGlyph } from "./glyphs/WindowGlyph";
import { StairGlyph } from "./glyphs/StairGlyph";
import { OPENING_SELECTION } from "./glyphs/glyph-theme";

const FixtureRect = memo(function FixtureRect({ fixture }: { fixture: Fixture }) {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const { fixtureStroke, fixtureLabel } = useCanvasColors();
  const isSelected = selectedId === fixture.id;
  // Hover solo para aberturas (puertas/ventanas) — spec openings-visualization-1
  const [hovered, setHovered] = useState(false);
  const draggable = activeTool === "select";

  switch (fixture.category) {
    case "furniture":
    case "plant":
    case "bathroom":
    case "vehicle":
      return (
        <FixtureGlyphGroup fixture={fixture} draggable={draggable}>
          <Rect
            width={fixture.width}
            height={fixture.height}
            fill={fixture.color}
            stroke={isSelected ? OPENING_SELECTION : fixtureStroke}
            strokeWidth={isSelected ? 2 : 1}
            cornerRadius={2}
          />
          <Text
            text={fixture.label}
            fontSize={9}
            fill={fixtureLabel}
            width={fixture.width}
            align="center"
            y={fixture.height / 2 - 6}
            pointerEvents="none"
          />
        </FixtureGlyphGroup>
      );

    case "door":
      return (
        <FixtureGlyphGroup
          fixture={fixture}
          draggable={draggable}
          onHoverChange={setHovered}
        >
          <DoorGlyph fixture={fixture} isSelected={isSelected} isHovered={hovered} />
        </FixtureGlyphGroup>
      );

    case "window":
      return (
        <FixtureGlyphGroup
          fixture={fixture}
          draggable={draggable}
          onHoverChange={setHovered}
        >
          <WindowGlyph fixture={fixture} isSelected={isSelected} isHovered={hovered} />
        </FixtureGlyphGroup>
      );

    case "stair":
      return (
        <FixtureGlyphGroup fixture={fixture} draggable={draggable}>
          <StairGlyph fixture={fixture} isSelected={isSelected} />
        </FixtureGlyphGroup>
      );

    default:
      return null;
  }
});

export const FixtureLayer = memo(function FixtureLayer() {
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);
  const visibleFixtures = useFixtureStore(
    useShallow((s) => s.getFixturesForFloor(activeFloorId))
  );

  return (
    <Group>
      {visibleFixtures.map((fixture) => (
        <FixtureRect key={fixture.id} fixture={fixture} />
      ))}
    </Group>
  );
});
