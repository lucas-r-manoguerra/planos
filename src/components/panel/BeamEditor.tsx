/**
 * Editor de propiedades de una viga estructural.
 *
 * Permite modificar el ancho de la viga.
 * Patrón similar a ColumnEditor.tsx.
 */

"use client";

import { useStructuralStore } from "@/stores/structural.store";

interface BeamEditorProps {
  elementId: string;
}

export function BeamEditor({ elementId }: BeamEditorProps) {
  const beam = useStructuralStore((s) =>
    s.beams.find((b) => b.id === elementId)
  );
  const updateBeam = useStructuralStore((s) => s.updateBeam);

  if (!beam) return null;

  return (
    <div className="space-y-4 p-1">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Ancho de viga (cm)
        </label>
        <input
          type="number"
          min={10}
          step={5}
          value={beam.width}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v >= 10) updateBeam(elementId, { width: v });
          }}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <p className="text-[10px] text-gray-400">
        Extremos: ({Math.round(beam.x1)}, {Math.round(beam.y1)}) → ({Math.round(beam.x2)}, {Math.round(beam.y2)}) cm
      </p>
    </div>
  );
}
