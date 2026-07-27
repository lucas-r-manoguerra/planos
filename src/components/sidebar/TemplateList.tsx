/**
 * Lista de plantillas predefinidas
 *
 * Permite aplicar una distribución predefinida a la planta activa
 */

"use client";

import { useFloorsStore } from "@/stores/floors.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { FLOOR_TEMPLATES, applyTemplate } from "@/lib/templates";
import { LayoutTemplate } from "lucide-react";

export function TemplateList() {
  const { applyFloorTemplate } = useFloorsStore();
  const { terrain } = useTerrainStore();

  const handleApply = (templateId: string) => {
    const template = FLOOR_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    if (!confirm(`¿Aplicar plantilla "${template.name}"? Se reemplazarán todas las habitaciones de esta planta.`)) {
      return;
    }

    const rooms = applyTemplate(template, terrain.width, terrain.height);
    applyFloorTemplate(rooms);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <LayoutTemplate size={14} className="text-gray-500" aria-hidden="true" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Plantillas
        </h3>
      </div>

      <div className="space-y-1">
        {FLOOR_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => handleApply(template.id)}
            className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
          >
            <div className="text-sm font-medium text-gray-800 group-hover:text-blue-800">
              {template.name}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {template.description}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">
              {template.rooms.length} habitaciones
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
