/**
 * Glifo 2D de ventana (S4).
 *
 * Estados (openings-visualization-1): panel batiente abierto (línea + arco que
 * sigue la punta del panel, corregido en lib/openings.ts), corrediza (riel +
 * flecha, idéntico a S2) y marco fijo (ventana-fija: panel + líneas de vidrio).
 * Selección/hover cambian el trazo (glyph-theme).
 */

"use client";

import { memo } from "react";
import { Rect, Line, Text } from "react-konva";
import { Fixture } from "@/types/plan";
import { OpeningSide, arcPoints, windowPaneGeometry } from "@/lib/openings";
import {
  OPENING_ACCENT,
  OPENING_HOVER,
  OPENING_SELECTION,
} from "./glyph-theme";

export interface WindowGlyphProps {
  fixture: Fixture;
  isSelected: boolean;
  isHovered: boolean;
}

export const WindowGlyph = memo(function WindowGlyph({
  fixture,
  isSelected,
  isHovered,
}: WindowGlyphProps) {
  const isWindowOpen = fixture.props.isOpen !== false;
  const isSliding = !!fixture.props.sliding;
  const openingSide = (fixture.props.openingSide as OpeningSide | undefined) ?? "right";

  const stroke = isSelected ? OPENING_SELECTION : isHovered ? OPENING_HOVER : OPENING_ACCENT;
  const strokeWidth = isSelected ? 2 : 1;

  // Indicador de anclaje a pared (spec: la abertura anclada muestra su punto)
  const anchor = isSelected && fixture.wallId ? (
    <Line
      points={[
        fixture.width / 2,
        fixture.height / 2 - 3,
        fixture.width / 2 + 3,
        fixture.height / 2,
        fixture.width / 2,
        fixture.height / 2 + 3,
        fixture.width / 2 - 3,
        fixture.height / 2,
      ]}
      closed
      fill={OPENING_SELECTION}
      pointerEvents="none"
    />
  ) : null;

  const label = (
    <Text
      text={fixture.label}
      fontSize={8}
      fill={OPENING_ACCENT}
      width={fixture.width}
      align="center"
      y={-12}
      pointerEvents="none"
    />
  );

  // ---- Panel del vano (marco) ----
  const frame = (
    <Rect
      width={fixture.width}
      height={fixture.height}
      fill={fixture.color}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );

  // ---- Marco fijo (ventana-fija): panel + líneas de vidrio (S4 polish) ----
  if (!isWindowOpen) {
    return (
      <>
        {frame}
        <Line
          points={[fixture.width / 3, 0, fixture.width / 3, fixture.height]}
          stroke={OPENING_ACCENT}
          strokeWidth={0.5}
          pointerEvents="none"
        />
        <Line
          points={[(2 * fixture.width) / 3, 0, (2 * fixture.width) / 3, fixture.height]}
          stroke={OPENING_ACCENT}
          strokeWidth={0.5}
          pointerEvents="none"
        />
        {anchor}
        {label}
      </>
    );
  }

  // ---- Corrediza: riel + hoja desplazada (idéntico a S2) ----
  if (isSliding) {
    return (
      <>
        {frame}
        <Rect
          x={fixture.width * 0.05}
          y={-3}
          width={fixture.width * 0.9}
          height={fixture.height}
          fill={fixture.color}
          stroke={stroke}
          strokeWidth={0.75}
          opacity={0.5}
        />
        <Line
          points={[fixture.width * 0.1, fixture.height + 5, fixture.width * 0.9, fixture.height + 5]}
          stroke={OPENING_ACCENT}
          strokeWidth={0.75}
          pointerEvents="none"
        />
        <Line
          points={[
            fixture.width * 0.85,
            fixture.height + 2,
            fixture.width * 0.9,
            fixture.height + 5,
            fixture.width * 0.85,
            fixture.height + 8,
          ]}
          stroke={OPENING_ACCENT}
          strokeWidth={0.75}
          pointerEvents="none"
        />
        {anchor}
        {label}
      </>
    );
  }

  // ---- Panel batiente abierto (arco corregido: sigue la punta del panel) ----
  const pane = windowPaneGeometry(fixture.width, openingSide, 45);
  return (
    <>
      {frame}
      <Line
        points={[pane.hingeX, fixture.height / 2, pane.tipX, fixture.height / 2 + pane.tipY]}
        stroke={OPENING_ACCENT}
        strokeWidth={2}
        pointerEvents="none"
      />
      <Line
        points={arcPoints(pane.hingeX, fixture.height / 2, pane.paneLen, pane.arcStart, pane.arcEnd)}
        stroke={OPENING_ACCENT}
        strokeWidth={0.75}
        dash={[3, 3]}
        pointerEvents="none"
      />
      {anchor}
      {label}
    </>
  );
});
