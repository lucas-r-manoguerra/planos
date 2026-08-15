/**
 * Colores del canvas sensibles al tema
 *
 * Konva dibuja en un canvas nativo y no puede leer variables CSS.
 * Este hook traduce el tema activo a valores concretos para que las
 * capas se repinten cuando el usuario alterna light/dark.
 */

"use client";

import { useMemo } from "react";
import { useTheme } from "@/components/ThemeProvider";

export interface CanvasColors {
  grid: string;
  wall: string;
  roomStroke: string;
  roomLabel: string;
  roomDim: string;
  fixtureStroke: string;
  fixtureLabel: string;
  textMuted: string;
  shadow: string;
  terrainStroke: string;
  compassBg: string;
  compassStroke: string;
}

const LIGHT: CanvasColors = {
  grid: "#e0e0e0",
  wall: "#4a4a4a",
  roomStroke: "#666666",
  roomLabel: "#333333",
  roomDim: "#666666",
  fixtureStroke: "#666666",
  fixtureLabel: "#333333",
  textMuted: "#666666",
  shadow: "rgba(0, 0, 0, 0.15)",
  terrainStroke: "#333333",
  compassBg: "rgba(255, 255, 255, 0.92)",
  compassStroke: "#ccc",
};

const DARK: CanvasColors = {
  grid: "#3a3d45",
  wall: "#8a8a8a",
  roomStroke: "#9a9a9a",
  roomLabel: "#d4d4d4",
  roomDim: "#9a9a9a",
  fixtureStroke: "#b0b0b0",
  fixtureLabel: "#c8c8c8",
  textMuted: "#909296",
  shadow: "rgba(0, 0, 0, 0.45)",
  terrainStroke: "#8a8a8a",
  compassBg: "rgba(37, 38, 43, 0.92)",
  compassStroke: "#4a4d55",
};

export function useCanvasColors(): CanvasColors {
  const { theme } = useTheme();
  return useMemo(() => (theme === "dark" ? DARK : LIGHT), [theme]);
}
