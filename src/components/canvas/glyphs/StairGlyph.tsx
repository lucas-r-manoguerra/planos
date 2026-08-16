/**
 * Glifo 2D de escalera (S4).
 *
 * Traslado verbatim del branch stair de FixtureLayer S2: tramo único y dos
 * tramos con descanso, líneas de escalones, flecha de subida y colores fijos.
 * Solo cambia la selección (OPENING_SELECTION) y el panel (DOOR_PANEL) vía
 * glyph-theme; sin hover (comportamiento S1-S3 exacto).
 */

"use client";

import { memo } from "react";
import { Rect, Line, Text } from "react-konva";
import { Fixture } from "@/types/plan";
import { DOOR_PANEL, OPENING_SELECTION } from "./glyph-theme";

export interface StairGlyphProps {
  fixture: Fixture;
  isSelected: boolean;
}

export const StairGlyph = memo(function StairGlyph({
  fixture,
  isSelected,
}: StairGlyphProps) {
  const stepWidth = (fixture.props.stepWidth as number) || 28;
  const flights = (fixture.props.flights as number) || 1;
  const separation = (fixture.props.separation as number) || 10;
  const strokeWidth = isSelected ? 2 : 1;
  const flightStroke = isSelected ? OPENING_SELECTION : DOOR_PANEL;

  const label = (
    <Text
      text={fixture.label}
      fontSize={9}
      fill="#8b4513"
      width={fixture.width}
      align="center"
      y={fixture.height / 2 - 6}
      pointerEvents="none"
    />
  );

  if (flights === 2) {
    const flightWidth = (fixture.width - separation) / 2;
    const landingW = (fixture.props.landingWidth as number) || 90;
    const flightRun = fixture.height - landingW > stepWidth * 2
      ? fixture.height - landingW
      : fixture.height;

    const numStepsFlight = Math.floor(flightRun / stepWidth);
    const stepLinesLeft: number[] = [];
    for (let i = 1; i < numStepsFlight; i++) {
      const y = i * stepWidth;
      stepLinesLeft.push(0, y, flightWidth, y);
    }

    const stepLinesRight: number[] = [];
    for (let i = 1; i < numStepsFlight; i++) {
      const y = i * stepWidth;
      stepLinesRight.push(flightWidth + separation, y, fixture.width, y);
    }

    return (
      <>
        {/* Tramo izquierdo */}
        <Rect
          x={0}
          y={0}
          width={flightWidth}
          height={flightRun}
          fill="#f5f0e8"
          stroke={flightStroke}
          strokeWidth={strokeWidth}
        />
        {stepLinesLeft.length > 0 && (
          <Line points={stepLinesLeft} stroke={DOOR_PANEL} strokeWidth={0.5} pointerEvents="none" />
        )}
        <Line
          points={[flightWidth / 2, flightRun - 10, flightWidth / 2, 10]}
          stroke="#8b4513"
          strokeWidth={1.5}
          pointerEvents="none"
        />

        {/* Separación entre tramos */}
        <Rect
          x={flightWidth}
          y={0}
          width={separation}
          height={flightRun}
          fill="#e8e0d0"
          stroke="none"
        />

        {/* Tramo derecho */}
        <Rect
          x={flightWidth + separation}
          y={0}
          width={flightWidth}
          height={flightRun}
          fill="#f5f0e8"
          stroke={flightStroke}
          strokeWidth={strokeWidth}
        />
        {stepLinesRight.length > 0 && (
          <Line points={stepLinesRight} stroke={DOOR_PANEL} strokeWidth={0.5} pointerEvents="none" />
        )}
        <Line
          points={[
            flightWidth + separation + flightWidth / 2,
            flightRun - 10,
            flightWidth + separation + flightWidth / 2,
            10,
          ]}
          stroke="#8b4513"
          strokeWidth={1.5}
          pointerEvents="none"
        />

        {/* Descanso — plataforma al final de los tramos */}
        <Rect
          x={0}
          y={flightRun}
          width={fixture.width}
          height={landingW}
          fill="#e8dcc8"
          stroke={flightStroke}
          strokeWidth={strokeWidth}
          dash={[4, 4]}
        />
        {label}
      </>
    );
  }

  // Tramo único (1 tramo)
  const landingW = (fixture.props.landingWidth as number) || 90;
  const flightRun = fixture.height - landingW > stepWidth * 2
    ? fixture.height - landingW
    : fixture.height;

  const numSteps = Math.floor(flightRun / stepWidth);
  const stepLines: number[] = [];
  for (let i = 1; i < numSteps; i++) {
    const y = i * stepWidth;
    stepLines.push(0, y, fixture.width, y);
  }

  return (
    <>
      {/* Tramo */}
      <Rect
        width={fixture.width}
        height={flightRun}
        fill="#f5f0e8"
        stroke={flightStroke}
        strokeWidth={strokeWidth}
      />
      {stepLines.length > 0 && (
        <Line points={stepLines} stroke={DOOR_PANEL} strokeWidth={0.5} pointerEvents="none" />
      )}
      <Line
        points={[fixture.width / 2, flightRun - 10, fixture.width / 2, 10]}
        stroke="#8b4513"
        strokeWidth={1.5}
        pointerEvents="none"
      />

      {/* Descanso */}
      <Rect
        x={0}
        y={flightRun}
        width={fixture.width}
        height={landingW}
        fill="#e8dcc8"
        stroke={flightStroke}
        strokeWidth={strokeWidth}
        dash={[4, 4]}
      />
      {label}
    </>
  );
});
