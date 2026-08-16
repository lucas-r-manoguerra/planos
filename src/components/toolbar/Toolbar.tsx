/**
 * Barra de herramientas del editor
 *
 * Controles rápidos: zoom, grilla, medición, exportar, deshacer/rehacer
 */

"use client";

import { useState } from "react";
import { useCanvasStore } from "@/stores/canvas.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useHistoryStore } from "@/stores/history.store";
import { useRulerStore } from "@/stores/ruler.store";
import { applyHistoryEntry } from "@/hooks/useEditorShortcuts";
import { ExportDialog } from "@/components/panel/ExportDialog";
import { ZOOM_MIN, ZOOM_MAX } from "@/lib/constants";
import {
  ZoomIn,
  ZoomOut,
  Focus,
  Grid3X3,
  Undo2,
  Redo2,
  Download,
  X,
  Ruler,
  Sun,
  BookOpen,
  Pencil,
  Box,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSunStore } from "@/stores/sun.store";

export function Toolbar() {
  const { zoom, setZoom, toggleGrid, gridVisible, activeTool, setActiveTool, viewMode, setViewMode, centerTerrain } = useCanvasStore();
  const { terrain } = useTerrainStore();
  const { selectedId, clearSelection } = useSelectionStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();
  const { active: rulerActive, activate, deactivate, clearMeasurements, measurements } = useRulerStore();
  const { enabled: sunEnabled, setEnabled: setSunEnabled } = useSunStore();

  const [showExport, setShowExport] = useState(false);

  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, ZOOM_MAX));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, ZOOM_MIN));
  const handleZoomReset = () => setZoom(1);

  const handleToggleRuler = () => {
    if (rulerActive) {
      deactivate();
    } else {
      activate();
    }
  };

  const handleUndo = () => {
    const restored = undo();
    if (restored) applyHistoryEntry(restored);
  };

  const handleRedo = () => {
    const restored = redo();
    if (restored) applyHistoryEntry(restored);
  };

  const handleExportPNG = () => {
    setShowExport(true);
  };

  return (
    <div className="h-10 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center px-3 gap-1 text-sm flex-wrap dark:text-gray-200">
      {/* Controles de zoom */}
      <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2">
        <button onClick={handleZoomOut} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900" title="Zoom alejar" aria-label="Zoom alejar">
          <ZoomOut size={16} />
        </button>
        <span className="text-gray-600 min-w-[44px] text-center text-xs font-medium select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={handleZoomIn} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900" title="Zoom acercar" aria-label="Zoom acercar">
          <ZoomIn size={16} />
        </button>
        <button onClick={handleZoomReset} className="px-1.5 py-1 hover:bg-gray-100 rounded text-xs font-medium text-gray-500 hover:text-gray-900" title="Zoom 100%" aria-label="Restablecer zoom al 100%">
          1:1
        </button>
        <button onClick={() => centerTerrain()} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900" title="Centrar plano en la vista" aria-label="Centrar plano en la vista">
          <Focus size={16} />
        </button>
      </div>

      {/* Grilla */}
      <button
        onClick={toggleGrid}
        className={`p-1.5 rounded ${gridVisible ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
        title="Toggle grilla"
        aria-label={gridVisible ? "Ocultar grilla" : "Mostrar grilla"}
        aria-pressed={gridVisible}
      >
        <Grid3X3 size={16} />
      </button>

      {/* Deshacer / Rehacer */}
      <div className="flex items-center gap-0.5 border-l border-gray-200 pl-2">
        <button
          onClick={handleUndo}
          disabled={!canUndo()}
          className={`p-1.5 rounded ${canUndo() ? "hover:bg-gray-100 text-gray-600 hover:text-gray-900" : "opacity-40 text-gray-300 cursor-not-allowed"}`}
          title="Deshacer (Ctrl+Z)"
          aria-label="Deshacer"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo()}
          className={`p-1.5 rounded ${canRedo() ? "hover:bg-gray-100 text-gray-600 hover:text-gray-900" : "opacity-40 text-gray-300 cursor-not-allowed"}`}
          title="Rehacer (Ctrl+Shift+Z)"
          aria-label="Rehacer"
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* Herramientas: selección vs pared */}
      <div className="flex items-center gap-0.5 border-l border-gray-200 pl-2">
        <button
          onClick={() => setActiveTool(activeTool === "wall" ? "select" : "wall")}
          className={`p-1.5 rounded ${activeTool === "wall" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
          title={activeTool === "wall" ? "Herramienta de selección (Esc)" : "Dibujar paredes (trazo con snap)"}
          aria-label={activeTool === "wall" ? "Salir de la herramienta de paredes" : "Activar herramienta de paredes"}
          aria-pressed={activeTool === "wall"}
        >
          <Pencil size={16} />
        </button>
      </div>

      {/* Vista: 2D / Isométrico (S3 — display only, no toca geometría) */}
      <div
        className="flex items-center border-l border-gray-200 pl-2"
        role="group"
        aria-label="Modo de visualización"
      >
        <button
          onClick={() => setViewMode("2d")}
          className={`px-2 py-1.5 rounded text-xs font-medium flex items-center gap-1 ${
            viewMode === "2d"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
          title="Vista en planta (2D)"
          aria-pressed={viewMode === "2d"}
        >
          2D
        </button>
        <button
          onClick={() => setViewMode("isometric")}
          className={`px-2 py-1.5 rounded text-xs font-medium flex items-center gap-1 ${
            viewMode === "isometric"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
          title="Vista isométrica (preview 3/4, cámara fija)"
          aria-pressed={viewMode === "isometric"}
        >
          <Box size={14} />
          Isométrico
        </button>
      </div>

      {/* Regla */}
      <div className="flex items-center gap-0.5 border-l border-gray-200 pl-2">
        <button
          onClick={handleToggleRuler}
          className={`p-1.5 rounded ${rulerActive ? "bg-red-100 text-red-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
          title={rulerActive ? "Desactivar regla" : "Activar regla"}
          aria-label={rulerActive ? "Desactivar regla" : "Activar regla"}
          aria-pressed={rulerActive}
        >
          <Ruler size={16} />
        </button>
        {measurements.length > 0 && (
          <button
            onClick={clearMeasurements}
            className="text-xs text-gray-400 hover:text-red-500 px-1"
            aria-label="Borrar todas las mediciones"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Simulación solar */}
      <button
        onClick={() => setSunEnabled(!sunEnabled)}
        className={`p-1.5 rounded ${sunEnabled ? "bg-amber-100 text-amber-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
        title={sunEnabled ? "Desactivar simulación solar" : "Activar simulación solar"}
        aria-label={sunEnabled ? "Desactivar simulación solar" : "Activar simulación solar"}
        aria-pressed={sunEnabled}
      >
        <Sun size={16} />
      </button>

      {/* Info del terreno */}
      <div className="border-l border-gray-200 pl-2 text-gray-500 text-xs">
        {(terrain.width / 100).toFixed(1)}m × {(terrain.height / 100).toFixed(1)}m
      </div>

      {/* Selección activa */}
      {selectedId && (
        <div className="border-l border-gray-200 pl-2">
          <button onClick={clearSelection} className="text-gray-500 hover:text-gray-700 p-1.5 hover:bg-gray-100 rounded" title="Deseleccionar" aria-label="Deseleccionar elemento">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Documentación */}
      <div className="border-l border-gray-200 pl-2">
        <Link
          href="/docs"
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors inline-flex"
          title="Documentación"
          aria-label="Abrir documentación de normativas"
        >
          <BookOpen size={16} />
        </Link>
      </div>

      {/* Tema */}
      <div className="border-l border-gray-200 pl-2">
        <ThemeToggle />
      </div>

      {/* Exportar */}
      <div className="ml-auto">
        <button onClick={handleExportPNG} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 flex items-center gap-1" title="Exportar PNG" aria-label="Exportar plano como imagen PNG">
          <Download size={16} />
          <span className="text-xs">PNG</span>
        </button>
      </div>

      {/* Diálogo de exportación */}
      {showExport && <ExportDialog open={showExport} onClose={() => setShowExport(false)} />}
    </div>
  );
}
