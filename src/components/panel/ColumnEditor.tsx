/**
 * Editor de propiedades de una columna estructural.
 *
 * Permite modificar el ancho y alto de la sección.
 * Patrón similar a room-editor.tsx (dialog-shell, controlled inputs).
 */

"use client";

import { useStructuralStore } from "@/stores/structural.store";

interface ColumnEditorProps {
  elementId: string;
}

export function ColumnEditor({ elementId }: ColumnEditorProps) {
  const column = useStructuralStore((s) =>
    s.columns.find((c) => c.id === elementId)
  );
  const updateColumn = useStructuralStore((s) => s.updateColumn);

  if (!column) return null;

  return (
    <div className="space-y-4 p-1">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Ancho de sección (cm)
        </label>
        <input
          type="number"
          min={10}
          step={5}
          value={column.sectionWidth}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v >= 10) updateColumn(elementId, { sectionWidth: v });
          }}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Alto de sección (cm)
        </label>
        <input
          type="number"
          min={10}
          step={5}
          value={column.sectionHeight}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (v >= 10) updateColumn(elementId, { sectionHeight: v });
          }}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <p className="text-[10px] text-gray-400">
        Posición: ({column.x}, {column.y}) cm
      </p>
    </div>
  );
}
