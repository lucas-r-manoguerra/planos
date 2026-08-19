/**
 * Lista de plantillas predefinidas
 *
 * El clic abre una vista previa (spec template-confirm-1); solo al
 * confirmar se aplica la plantilla a la planta activa, en una sola
 * entrada de historial (spec template-history-1).
 */

"use client";

import { useState } from "react";
import { useFloorsStore } from "@/stores/floors.store";
import { useTerrainStore } from "@/stores/terrain.store";
import { useToastStore } from "@/stores/toast.store";
import {
  FLOOR_TEMPLATES,
  applyTemplate,
  type FloorTemplate,
} from "@/lib/templates";
import { LayoutTemplate, Eye } from "lucide-react";
import { TemplatePreviewDialog } from "@/components/panel/TemplatePreviewDialog";

export function TemplateList() {
  const { applyFloorTemplate } = useFloorsStore();
  const terrain = useTerrainStore((s) => s.terrain);
  const push = useToastStore((s) => s.push);
  const [preview, setPreview] = useState<FloorTemplate | null>(null);

  const handleConfirm = () => {
    if (!preview) return;
    const rooms = applyTemplate(preview, terrain.width, terrain.height);
    applyFloorTemplate(rooms);
    push("info", `Plantilla «${preview.name}» aplicada a la planta activa`);
    setPreview(null);
  };

  return (
    <>
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
              onClick={() => setPreview(template)}
              className="w-full text-left p-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-800 group-hover:text-blue-800">
                  {template.name}
                </div>
                <Eye
                  size={12}
                  className="text-gray-300 group-hover:text-gray-500"
                  aria-hidden="true"
                />
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

      <TemplatePreviewDialog
        template={preview}
        onConfirm={handleConfirm}
        onCancel={() => setPreview(null)}
      />
    </>
  );
}
