/**
 * Tienda de estado para el canvas de visualización
 * 
 * Maneja: zoom, desplazamiento, grilla, herramienta activa
 * Esta tienda se actualiza en cada evento de mouse sobre el canvas
 */

import { create } from "zustand";
import type Konva from "konva";
import { CanvasState, ViewMode } from "@/types/plan";
import { DEFAULT_GRID_SIZE, ZOOM_MIN, ZOOM_MAX } from "@/lib/constants";
import { clamp } from "@/lib/utils";
import { fitToView } from "@/lib/canvas-fit";
import { useTerrainStore } from "@/stores/rooms.store";

// Estado inicial del canvas
const initialState: CanvasState = {
  zoom: 1.0,
  panX: 0,
  panY: 0,
  gridVisible: true,
  gridSize: DEFAULT_GRID_SIZE,
  activeTool: "select",
  viewMode: "2d",
  magnetismEnabled: true,
};

// Interfaz de la tienda con acciones
interface CanvasStore extends CanvasState {
  /** Referencia al Stage de Konva montado (lo setea PlanCanvas); se usa para exportar PNG */
  stageRef: Konva.Stage | null;
  setStageRef: (stage: Konva.Stage | null) => void;
  setZoom: (zoom: number) => void;
  smoothZoom: (targetZoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;
  setActiveTool: (tool: "select" | "pan" | "wall" | "column" | "beam") => void;
  toggleMagnetism: () => void; // Alternar magnetismo de paredes (wall-drawing-6)
  /** Cambiar modo de visualización (2D o isométrico) — estado de display (S3) */
  setViewMode: (viewMode: ViewMode) => void;
  /**
   * Centrar el terreno en la vista (botón "Centrar" y retorno isométrico→2D):
   * zoom = fit completo, pan = centro del viewport. Sin viewport explícito,
   * usa el tamaño del Stage (fallback 800×600).
   */
  centerTerrain: (viewportWidth?: number, viewportHeight?: number) => void;

  // ── Display toggles (session-only, no persistidos — regla 05, Slice C) ──
  floorOverlayEnabled: boolean;
  structuralDimensioningEnabled: boolean;
  toggleFloorOverlay: () => void;
  toggleStructuralDimensioning: () => void;
}

let zoomAnimationId: number | null = null;

// Crear tienda de Zustand
export const useCanvasStore = create<CanvasStore>((set, get) => ({
  ...initialState,
  stageRef: null,

  // Display toggles: session-only, default overlay OFF, dimensioning ON
  floorOverlayEnabled: false,
  structuralDimensioningEnabled: true,

  // Registrar el Stage de Konva (null al desmontar)
  setStageRef: (stageRef) => set({ stageRef }),

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

  // Alternar magnetismo de paredes (wall-drawing-6)
  toggleMagnetism: () => set((state) => ({ magnetismEnabled: !state.magnetismEnabled })),

  // Cambiar modo de visualización (display only — no toca la geometría, spec isometric-view-1)
  setViewMode: (viewMode) => {
    const previous = get().viewMode;
    set({ viewMode });
    // Volver a 2D: recentrar el plano (iso no preserva pan/zoom, S3 fix)
    if (viewMode === "2d" && previous === "isometric") {
      get().centerTerrain();
    }
  },

  // Centrar el terreno en la vista: fit completo + centrado (S3 fix)
  centerTerrain: (viewportWidth, viewportHeight) => {
    const stage = get().stageRef;
    const vw = viewportWidth ?? stage?.width() ?? 800;
    const vh = viewportHeight ?? stage?.height() ?? 600;
    const terrain = useTerrainStore.getState().terrain;
    const { zoom, panX, panY } = fitToView(
      terrain.width,
      terrain.height,
      vw,
      vh,
      ZOOM_MIN,
      ZOOM_MAX
    );
    set({ zoom, panX, panY });
  },

  // Toggle superposición de plantas adyacentes (Slice C, floor-overlay-1)
  toggleFloorOverlay: () =>
    set((state) => ({ floorOverlayEnabled: !state.floorOverlayEnabled })),

  // Toggle dimensionado automático (Slice C, structural-dimensioning-3)
  toggleStructuralDimensioning: () =>
    set((state) => ({
      structuralDimensioningEnabled: !state.structuralDimensioningEnabled,
    })),
}));
