"use client";

/**
 * Diálogo de exportación del plano a PNG.
 *
 * Ofrece la resolución (1x/2x/4x) y muestra si la brújula se incluirá
 * según el estado de la simulación solar. Abierto desde la toolbar.
 */

import { useState } from "react";

import { exportPlanPNG, ExportScale } from "@/lib/export";
import { useCanvasStore } from "@/stores/canvas.store";
import { useSunStore } from "@/stores/sun.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useToastStore } from "@/stores/toast.store";
import { useCanvasColors } from "@/components/canvas/canvas-colors";

const SCALES: ExportScale[] = [1, 2, 4];

export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [scale, setScale] = useState<ExportScale>(2);
  const stage = useCanvasStore((s) => s.stageRef);
  const { enabled: sunEnabled } = useSunStore();
  const { terrain } = useTerrainStore();
  const colors = useCanvasColors();
  const push = useToastStore((s) => s.push);

  if (!open) return null;

  const northAngle = Math.round((terrain.northAngle ?? 0) % 360);
  const compassAngle = sunEnabled ? northAngle : null;

  const handleExport = () => {
    if (!stage) return;
    exportPlanPNG(stage, {
      scale,
      compassAngle,
      colors: {
        bg: colors.compassBg,
        stroke: colors.compassStroke,
        text: colors.textMuted,
        north: "#e74c3c",
      },
    });
    push("success", "Plano exportado como PNG");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Exportar plano como PNG"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-lg bg-white p-4 shadow-lg dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
          Exportar PNG
        </h2>

        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Resolución</p>
        <div className="mb-4 flex gap-2">
          {SCALES.map((s) => (
            <button
              key={s}
              onClick={() => setScale(s)}
              aria-pressed={scale === s}
              className={`flex-1 rounded border px-2 py-1.5 text-xs transition-colors ${
                scale === s
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          {compassAngle === null
            ? "Brújula oculta: la simulación solar está desactivada."
            : `La exportación incluye la brújula (Norte a ${compassAngle}°).`}
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={!stage}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
            title={!stage ? "Canvas no disponible" : "Descargar PNG"}
          >
            Exportar
          </button>
        </div>
      </div>
    </div>
  );
}
