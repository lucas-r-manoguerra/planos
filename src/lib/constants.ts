/**
 * Constantes y valores por defecto para el sistema de planos
 * 
 * Unidades: todas las medidas están en centímetros (cm)
 */

import { RoomType, SunSettings } from "@/types/plan";

// Dimensiones por defecto del terreno: 10m x 8m = 1000cm x 800cm
export const DEFAULT_TERRAIN = {
  width: 1000,  // 10 metros en centímetros
  height: 800,  // 8 metros en centímetros
} as const;

// Nombre por defecto de un proyecto nuevo (persistencia v3)
export const DEFAULT_PROJECT_NAME = "Mi Plano";

// Configuración de la grilla
export const DEFAULT_GRID_SIZE = 10; // 10 cm entre líneas de grilla
export const SNAP_THRESHOLD = 25;    // Umbral de snapping en centímetros

// Límites de zoom
export const ZOOM_MIN = 0.1;  // Zoom mínimo (10%)
export const ZOOM_MAX = 5.0;  // Zoom máximo (500%)

// Presets de tipos de habitaciones con dimensiones típicas argentinas
export const ROOM_TYPE_PRESETS = {
  [RoomType.DORMITORIO]: { width: 300, height: 350 },      // 3m x 3.5m
  [RoomType.COCINA]: { width: 250, height: 300 },          // 2.5m x 3m
  [RoomType.BAÑO]: { width: 150, height: 200 },            // 1.5m x 2m
  [RoomType.ESTAR_COMEDOR]: { width: 400, height: 500 },   // 4m x 5m
  [RoomType.LAVADERO]: { width: 150, height: 200 },        // 1.5m x 2m
  [RoomType.PASILLO]: { width: 100, height: 200 },         // 1m x 2m
} as const;

// Colores para las habitaciones
export const ROOM_COLORS = {
  [RoomType.DORMITORIO]: "#e8f4e8",
  [RoomType.COCINA]: "#f4e8e8",
  [RoomType.BAÑO]: "#e8e8f4",
  [RoomType.ESTAR_COMEDOR]: "#f4f4e8",
  [RoomType.LAVADERO]: "#f4e8f4",
  [RoomType.PASILLO]: "#e8f4f4",
} as const;

// Atajos de teclado
export const KEYBOARD_SHORTCUTS = {
  delete: ["Delete", "Backspace"],
  undo: ["Meta+z", "Control+z"],
  redo: ["Meta+Shift+z", "Control+Shift+z"],
  selectAll: ["Meta+a", "Control+a"],
  duplicate: ["Meta+d", "Control+d"],
  zoomIn: ["Meta+=", "Control+="],
  zoomOut: ["Meta+-", "Control+-"],
  zoomReset: ["Meta+0", "Control+0"],
} as const;

// Configuración por defecto de la simulación solar
export const DEFAULT_SUN_SETTINGS: SunSettings = {
  enabled: false,
  date: new Date().toISOString().split("T")[0],
  time: 12,
  location: {
    latitude: -32.05,
    longitude: -59.25,
    timezone: "America/Argentina/Buenos_Aires",
  },
  floorHeight: 280, // 2.80 m en centímetros
};
