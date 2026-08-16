/**
 * Glifo 2D de ventana (S4).
 *
 * Estados (openings-visualization-1): panel batiente abierto (línea + arco que
 * sigue la punta del panel, corregido en lib/openings.ts), corrediza (riel +
 * flecha, idéntico a S2), marco fijo (ventana-fija: panel + líneas de vidrio)
 * y subtipos por catálogo (S4-fix): ventana-standard = guillotina doble con
 * travesaño horizontal, ventanal = 2×2 parteluces, batiente = hoja a 90°,
 * oscilobatiente = hoja a 45°. Selección/hover cambian el trazo (glyph-theme).
 */

"use client";

import { memo } from "react";
import { Rect, Line, Text } from "react-konva";
import { Fixture } from "@/types/plan";
import {
  OpeningSide,
  arcPoints,
  windowGridDividers,
  windowPaneGeometry,
} from "@/lib/openings";
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
  const catalogId = fixture.catalogId;
  const openingSide = (fixture.props.openingSide as OpeningSide | undefined) ?? "right";
  const openingAngle = (fixture.props.openingAngle as number | undefined) ?? 90;

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

  // Líneas de vidrio (parteluces) en la grilla columns×rows
  const glassDividers = (columns: number, rows: number) => (
    <Line
      points={windowGridDividers(fixture.width, fixture.height, columns, rows)}
      stroke={OPENING_ACCENT}
      strokeWidth={0.5}
      pointerEvents="none"
    />
  );

  // Hoja batiente abierta a `paneAngle` grados (panel + arco que sigue la punta)
  const casement = (paneAngle: number) => {
    const pane = windowPaneGeometry(fixture.width, openingSide, paneAngle);
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
  };

  // ---- Marco fijo (ventana-fija): panel + parteluces (2×1) ----
  if (!isWindowOpen) {
    return (
      <>
        {frame}
        {glassDividers(3, 1)}
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

  // ---- Subtipos por catálogo (S4-fix) ----
  if (catalogId === "ventana-standard") {
    // Guillotina doble cerrada: travesaño horizontal al medio
    return (
      <>
        {frame}
        {glassDividers(1, 2)}
        {anchor}
        {label}
      </>
    );
  }

  if (catalogId === "ventanal") {
    // Ventanal: parteluces 2×2
    return (
      <>
        {frame}
        {glassDividers(2, 2)}
        {anchor}
        {label}
      </>
    );
  }

  if (catalogId === "ventana-batiente") {
    return casement(openingAngle);
  }

  if (catalogId === "ventana-oscilobatiente") {
    return casement(Math.min(Math.max(openingAngle, 0), 90));
  }

  // ---- Default: hoja batiente a 45° (compat S4) ----
  return casement(45);
});
