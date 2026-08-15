/**
 * Vista previa de una plantilla de distribución antes de aplicarla.
 *
 * Solo lee el terreno del store (spec template-confirm-1): no muta nada
 * hasta que el usuario confirma en el diálogo.
 */

"use client";

import type { FloorTemplate } from "@/lib/templates";
import { layoutTemplateRooms } from "@/lib/templates";
import { useTerrainStore } from "@/stores/rooms.store";
import { LayoutTemplate, X } from "lucide-react";

interface TemplatePreviewDialogProps {
  template: FloorTemplate | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TemplatePreviewDialog({
  template,
  onConfirm,
  onCancel,
}: TemplatePreviewDialogProps) {
  const terrain = useTerrainStore((s) => s.terrain);

  if (!template) return null;

  const rooms = layoutTemplateRooms(template, terrain.width, terrain.height);
  const scale = Math.min(240 / terrain.width, 200 / terrain.height, 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa de ${template.name}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <LayoutTemplate size={16} className="text-gray-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-gray-900">{template.name}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar vista previa"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <p className="px-4 pt-3 text-xs text-gray-500">{template.description}</p>

        {/* Preview escalado al terreno activo */}
        <div className="px-4 py-3">
          <div
            className="relative mx-auto border border-gray-300 bg-gray-50"
            style={{ width: terrain.width * scale, height: terrain.height * scale }}
          >
            {rooms.map((room) => (
              <div
                key={room.label}
                className="absolute flex items-center justify-center overflow-hidden border border-gray-400"
                style={{
                  left: room.x * scale,
                  top: room.y * scale,
                  width: room.width * scale,
                  height: room.height * scale,
                  backgroundColor: room.color ?? "#ffffff",
                }}
              >
                <span className="px-0.5 text-center text-[9px] leading-tight text-gray-800">
                  {room.label}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-gray-400">
            {rooms.length} habitaciones · {terrain.width} × {terrain.height} cm
          </p>
        </div>

        {/* Lista de habitaciones */}
        <ul className="max-h-40 overflow-y-auto border-t border-gray-100 px-4 py-2">
          {rooms.map((room) => (
            <li
              key={room.label}
              className="flex items-center gap-2 py-1 text-xs text-gray-700"
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border border-gray-400"
                style={{ backgroundColor: room.color ?? "#ffffff" }}
                aria-hidden="true"
              />
              <span className="flex-1">{room.label}</span>
              <span className="text-gray-400">
                {room.width} × {room.height} cm
              </span>
            </li>
          ))}
        </ul>

        {/* Acciones */}
        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Aplicar plantilla
          </button>
        </div>
      </div>
    </div>
  );
}
