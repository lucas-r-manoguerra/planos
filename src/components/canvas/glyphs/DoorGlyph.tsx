/**
 * Glifo 2D de puerta (S4).
 *
 * Estados (openings-visualization-1): hoja abierta (bisagra + hoja + arco
 * punteado que sigue la punta de la hoja), hoja cerrada (panel + líneas),
 * corrediza (riel + flecha, idéntico a S2), doble (puerta-doble: dos hojas
 * espejadas). Selección/hover cambian el trazo (glyph-theme).
 *
 * La geometría es pura y vive en lib/openings.ts (doorLeafGeometry,
 * doubleDoorLeafGeometry, arcPoints) — esta capa solo dibuja.
 */

"use client";

import { memo } from "react";
import { Rect, Line, Text } from "react-konva";
import { Fixture } from "@/types/plan";
import {
  OpeningSide,
  arcPoints,
  doorLeafGeometry,
  doubleDoorLeafGeometry,
} from "@/lib/openings";
import { useCanvasColors } from "../canvas-colors";
import {
  DOOR_PANEL,
  OPENING_ARC,
  OPENING_HOVER,
  OPENING_SELECTION,
} from "./glyph-theme";

export interface DoorGlyphProps {
  fixture: Fixture;
  isSelected: boolean;
  isHovered: boolean;
}

export const DoorGlyph = memo(function DoorGlyph({
  fixture,
  isSelected,
  isHovered,
}: DoorGlyphProps) {
  const { fixtureLabel, fixtureStroke } = useCanvasColors();
  const isDoorOpen = fixture.props.isOpen !== false;
  const isSliding = !!fixture.props.sliding;
  const isDouble = !!fixture.props.double;
  const catalogId = fixture.catalogId;
  const openingSide = (fixture.props.openingSide as OpeningSide | undefined) ?? "right";
  const openingAngle = (fixture.props.openingAngle as number | undefined) ?? 90;
  const doorColor = fixture.color;

  const stroke = isSelected ? OPENING_SELECTION : isHovered ? OPENING_HOVER : fixtureStroke;
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
      fill={fixtureLabel}
      width={fixture.width}
      align="center"
      y={-12}
      pointerEvents="none"
    />
  );

  // ---- Cerrada: panel + líneas de hoja (S4 polish) ----
  if (!isDoorOpen) {
    return (
      <>
        <Rect
          width={fixture.width}
          height={fixture.height}
          fill={doorColor}
          stroke={stroke}
          strokeWidth={1.5}
        />
        <Line
          points={[fixture.width * 0.2, 0, fixture.width * 0.2, fixture.height]}
          stroke={DOOR_PANEL}
          strokeWidth={0.5}
          pointerEvents="none"
        />
        <Line
          points={[fixture.width * 0.8, 0, fixture.width * 0.8, fixture.height]}
          stroke={DOOR_PANEL}
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
        <Rect
          width={fixture.width}
          height={fixture.height}
          fill={doorColor}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <Rect
          x={fixture.width * 0.05}
          y={-3}
          width={fixture.width * 0.9}
          height={fixture.height}
          fill={doorColor}
          stroke={stroke}
          strokeWidth={1}
          opacity={0.6}
        />
        <Line
          points={[fixture.width * 0.1, fixture.height + 6, fixture.width * 0.9, fixture.height + 6]}
          stroke={OPENING_ARC}
          strokeWidth={1}
          pointerEvents="none"
        />
        <Line
          points={[
            fixture.width * 0.85,
            fixture.height + 3,
            fixture.width * 0.9,
            fixture.height + 6,
            fixture.width * 0.85,
            fixture.height + 9,
          ]}
          stroke={OPENING_ARC}
          strokeWidth={1}
          pointerEvents="none"
        />
        {label}
      </>
    );
  }

  // Rect transparente: área de hit para drag (misma semántica que S2)
  const transparentHitRect = (
    <Rect width={fixture.width} height={fixture.height} fill="transparent" stroke="none" />
  );

  // ---- Puerta de garaje: portón seccional (panel sólido + costillas) ----
  if (catalogId === "puerta-garage") {
    return (
      <>
        <Rect
          width={fixture.width}
          height={fixture.height}
          fill={doorColor}
          stroke={stroke}
          strokeWidth={1.5}
        />
        {/* Costillas horizontales del portón (seccional) */}
        <Line
          points={[0, fixture.height / 4, fixture.width, fixture.height / 4]}
          stroke={DOOR_PANEL}
          strokeWidth={0.75}
          pointerEvents="none"
        />
        <Line
          points={[0, fixture.height / 2, fixture.width, fixture.height / 2]}
          stroke={DOOR_PANEL}
          strokeWidth={0.75}
          pointerEvents="none"
        />
        <Line
          points={[0, (3 * fixture.height) / 4, fixture.width, (3 * fixture.height) / 4]}
          stroke={DOOR_PANEL}
          strokeWidth={0.75}
          pointerEvents="none"
        />
        {/* Montante central */}
        <Line
          points={[fixture.width / 2, 0, fixture.width / 2, fixture.height]}
          stroke={DOOR_PANEL}
          strokeWidth={0.75}
          pointerEvents="none"
        />
        {anchor}
        {label}
      </>
    );
  }

  // ---- Doble hoja (puerta-doble): marco + dos hojas espejadas, cada una con su arco ----
  if (isDouble) {
    const [leftLeaf, rightLeaf] = doubleDoorLeafGeometry(fixture.width, openingAngle);
    return (
      <>
        {transparentHitRect}
        <Rect
          width={fixture.width}
          height={fixture.height}
          fill={doorColor}
          stroke={stroke}
          strokeWidth={1.5}
        />
        {/* Línea de encuentro de las hojas en el centro del vano */}
        <Line
          points={[fixture.width / 2, 0, fixture.width / 2, fixture.height]}
          stroke={DOOR_PANEL}
          strokeWidth={0.75}
          pointerEvents="none"
        />
        <Line
          points={[leftLeaf.hingeX, 0, leftLeaf.tipX, leftLeaf.tipY]}
          stroke={doorColor}
          strokeWidth={3}
          pointerEvents="none"
        />
        <Line
          points={arcPoints(leftLeaf.hingeX, 0, leftLeaf.leafLen, leftLeaf.arcStart, leftLeaf.arcEnd)}
          stroke={OPENING_ARC}
          strokeWidth={1}
          dash={[4, 3]}
          pointerEvents="none"
        />
        <Line
          points={[leftLeaf.hingeX - 2, 0, leftLeaf.hingeX + 2, 0]}
          stroke={doorColor}
          strokeWidth={1}
          pointerEvents="none"
        />
        <Line
          points={[leftLeaf.hingeX, -2, leftLeaf.hingeX, 2]}
          stroke={doorColor}
          strokeWidth={1}
          pointerEvents="none"
        />
        <Line
          points={[rightLeaf.hingeX, 0, rightLeaf.tipX, rightLeaf.tipY]}
          stroke={doorColor}
          strokeWidth={3}
          pointerEvents="none"
        />
        <Line
          points={arcPoints(rightLeaf.hingeX, 0, rightLeaf.leafLen, rightLeaf.arcStart, rightLeaf.arcEnd)}
          stroke={OPENING_ARC}
          strokeWidth={1}
          dash={[4, 3]}
          pointerEvents="none"
        />
        <Line
          points={[rightLeaf.hingeX - 2, 0, rightLeaf.hingeX + 2, 0]}
          stroke={doorColor}
          strokeWidth={1}
          pointerEvents="none"
        />
        <Line
          points={[rightLeaf.hingeX, -2, rightLeaf.hingeX, 2]}
          stroke={doorColor}
          strokeWidth={1}
          pointerEvents="none"
        />
        {anchor}
        {label}
      </>
    );
  }

  // ---- Hoja simple (arco corregido: sigue la punta de la hoja) ----
  const leaf = doorLeafGeometry(fixture.width, openingAngle, openingSide);
  return (
    <>
      {transparentHitRect}
      <Line
        points={[leaf.hingeX, 0, leaf.tipX, leaf.tipY]}
        stroke={doorColor}
        strokeWidth={3}
        pointerEvents="none"
      />
      <Line
        points={arcPoints(leaf.hingeX, 0, leaf.leafLen, leaf.arcStart, leaf.arcEnd)}
        stroke={OPENING_ARC}
        strokeWidth={1}
        dash={[4, 3]}
        pointerEvents="none"
      />
      <Line
        points={[leaf.hingeX - 2, 0, leaf.hingeX + 2, 0]}
        stroke={doorColor}
        strokeWidth={1}
        pointerEvents="none"
      />
      <Line
        points={[leaf.hingeX, -2, leaf.hingeX, 2]}
        stroke={doorColor}
        strokeWidth={1}
        pointerEvents="none"
      />
      {anchor}
      {label}
    </>
  );
});
