/**
 * Barra lateral del editor de planos
 *
 * Contiene las herramientas: selector de plantas, configuración del terreno,
 * formulario para agregar habitaciones y lista de habitaciones
 */

"use client";

import { FloorList } from "./FloorList";
import { TerrainSettings } from "./TerrainSettings";
import { TemplateList } from "./TemplateList";
import { SurfaceInfo } from "./SurfaceInfo";
import { RoomForm } from "./RoomForm";
import { RoomList } from "./RoomList";
import { Pencil } from "lucide-react";

export function Sidebar() {
  return (
    <aside
      className="w-72 border-r border-gray-200 bg-[#fafafa] flex flex-col overflow-hidden"
      aria-label="Panel de herramientas"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <Pencil size={16} className="text-blue-600" aria-hidden="true" />
          <h1 className="text-base font-semibold text-gray-900">Planos</h1>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Editor de planos de construcción</p>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto">
        {/* Sección: Plantas */}
        <div className="px-4 py-3 border-b border-gray-100">
          <FloorList />
        </div>

        {/* Sección: Plantillas */}
        <div className="px-4 py-3 border-b border-gray-100">
          <TemplateList />
        </div>

        {/* Sección: Terreno */}
        <div className="px-4 py-3 border-b border-gray-100">
          <TerrainSettings />
        </div>

        {/* Sección: Superficie */}
        <div className="px-4 py-3 border-b border-gray-100">
          <SurfaceInfo />
        </div>

        {/* Sección: Agregar habitación */}
        <div className="px-4 py-3 border-b border-gray-100">
          <RoomForm />
        </div>

        {/* Sección: Lista de habitaciones */}
        <div className="px-4 py-3">
          <RoomList />
        </div>
      </div>
    </aside>
  );
}
