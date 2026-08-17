/**
 * Sección de elementos estructurales en el sidebar.
 *
 * Muestra presets de sección de columnas y botón de activación
 * de la herramienta. Patrón similar a FixtureCatalog.tsx.
 */

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useCanvasStore } from "@/stores/canvas.store";
import { COLUMN_SECTION_PRESETS } from "@/lib/structural-utils";

export const activePreset: { current: [number, number] } = {
  current: COLUMN_SECTION_PRESETS[0],
};

export function StructuralSection() {
  const [isOpen, setIsOpen] = useState(false);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const floorOverlayEnabled = useCanvasStore((s) => s.floorOverlayEnabled);
  const toggleFloorOverlay = useCanvasStore((s) => s.toggleFloorOverlay);
  const structuralDimensioningEnabled = useCanvasStore((s) => s.structuralDimensioningEnabled);
  const toggleStructuralDimensioning = useCanvasStore((s) => s.toggleStructuralDimensioning);

  const isColumnTool = activeTool === "column";
  const isBeamTool = activeTool === "beam";
  const [cw, ch] = activePreset.current;

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
        aria-controls="structural-section"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Elementos Estructurales
        </span>
        {isOpen ? (
          <ChevronDown size={14} className="text-gray-400" />
        ) : (
          <ChevronRight size={14} className="text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div id="structural-section" className="px-4 pb-3 space-y-2">
          <p className="text-[10px] text-gray-500">Sección de columna</p>
          <div className="flex gap-1">
            {COLUMN_SECTION_PRESETS.map(([w, h]) => {
              const isActive = cw === w && ch === h;
              return (
                <button
                  key={`${w}x${h}`}
                  onClick={() => {
                    activePreset.current = [w, h];
                  }}
                  className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                    isActive
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {w}×{h}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setActiveTool(isColumnTool ? "select" : "column");
            }}
            className={`w-full px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
              isColumnTool
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {isColumnTool ? "Columna activa" : "Columna"}
          </button>
          <button
            onClick={() => {
              setActiveTool(isBeamTool ? "select" : "beam");
            }}
            className={`w-full px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
              isBeamTool
                ? "bg-slate-100 border-slate-300 text-slate-700"
                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {isBeamTool ? "Viga activa" : "Viga"}
          </button>

          {/* Slice C: display toggles (floor-overlay-5, structural-dimensioning-4) */}
          <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
            <button
              onClick={toggleFloorOverlay}
              className={`w-full px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                floorOverlayEnabled
                  ? "bg-purple-50 border-purple-300 text-purple-700"
                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {floorOverlayEnabled ? "Planta adyacente visible" : "Planta adyacente"}
            </button>
            <button
              onClick={toggleStructuralDimensioning}
              className={`w-full px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                structuralDimensioningEnabled
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {structuralDimensioningEnabled ? "Dimensionado activo" : "Dimensionado"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
