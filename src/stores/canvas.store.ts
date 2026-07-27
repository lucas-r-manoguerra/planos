/**
 * Tienda de estado para el canvas de visualización
 * 
 * Maneja: zoom, desplazamiento, grilla, herramienta activa
 * Esta tienda se actualiza en cada evento de mouse sobre el canvas
 */

import { create } from "zustand";
import { CanvasState } from "@/types/plan";
import { DEFAULT_GRID_SIZE, ZOOM_MIN, ZOOM_MAX } from "@/lib/constants";
import { clamp } from "@/lib/utils";

// Estado inicial del canvas
const initialState: CanvasState = {
  zoom: 1.0,
  panX: 0,
  panY: 0,
  gridVisible: true,
  gridSize: DEFAULT_GRID_SIZE,
  activeTool: "select",
};

// Interfaz de la tienda con acciones
interface CanvasStore extends CanvasState {
  setZoom: (zoom: number) => void;
  smoothZoom: (targetZoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;
  setActiveTool: (tool: "select" | "pan") => void;
}

let zoomAnimationId: number | null = null;

// Crear tienda de Zustand
export const useCanvasStore = create<CanvasStore>((set, get) => ({
  ...initialState,

  // Actualizar nivel de zoom (limitado entre ZOOM_MIN y ZOOM_MAX)
  setZoom: (zoom) =>
    set({ zoom: clamp(zoom, ZOOM_MIN, ZOOM_MAX) }),

  // Zoom suave con interpolación via requestAnimationFrame
  smoothZoom: (targetZoom) => {
    if (zoomAnimationId !== null) {
      cancelAnimationFrame(zoomAnimationId);
    }

    const clamped = clamp(targetZoom, ZOOM_MIN, ZOOM_MAX);
    const startZoom = get().zoom;
    const startTime = performance.now();
    const duration = 150;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startZoom + (clamped - startZoom) * eased;

      set({ zoom: current });

      if (progress < 1) {
        zoomAnimationId = requestAnimationFrame(animate);
      } else {
        zoomAnimationId = null;
      }
    };

    zoomAnimationId = requestAnimationFrame(animate);
  },

  // Actualizar desplazamiento del canvas
  setPan: (panX, panY) => set({ panX, panY }),

  // Alternar visibilidad de la grilla
  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),

  // Cambiar tamaño de la grilla
  setGridSize: (gridSize) => set({ gridSize }),

  // Cambiar herramienta activa (seleccionar o mover)
  setActiveTool: (activeTool) => set({ activeTool }),
}));
