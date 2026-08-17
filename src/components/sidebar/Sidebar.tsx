/**
 * Barra lateral del editor de planos
 *
 * Contiene las herramientas: selector de plantas, configuración del terreno,
 * formulario para agregar habitaciones y lista de habitaciones
 */

"use client";

import { FloorList } from "./FloorList";
import { ProjectSection } from "./ProjectSection";
import { TerrainSettings } from "./TerrainSettings";
import { SunSettings } from "./SunSettings";
import { TemplateList } from "./TemplateList";
import { SurfaceInfo } from "./SurfaceInfo";
import { RoomForm } from "./RoomForm";
import { RoomList } from "./RoomList";
import { FixtureCatalog } from "./FixtureCatalog";
import { StructuralSection } from "./StructuralSection";
import { useState } from "react";
import { Pencil, ChevronDown, ChevronRight } from "lucide-react";

export function Sidebar() {
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [fixturesOpen, setFixturesOpen] = useState(false);

  return (
    <aside
      className="w-72 border-r border-gray-200 dark:border-gray-700 bg-[#fafafa] dark:bg-gray-900 flex flex-col overflow-hidden dark:text-gray-200"
      aria-label="Panel de herramientas"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Pencil size={16} className="text-blue-600" aria-hidden="true" />
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Planos</h1>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Editor de planos de construcción</p>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto">
        {/* Sección: Proyectos */}
        <ProjectSection />

        {/* Sección: Plantas */}
        <div className="px-4 py-3 border-b border-gray-100">
          <FloorList />
        </div>

        {/* Sección: Plantillas (colapsable) */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => setTemplatesOpen(!templatesOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            aria-expanded={templatesOpen}
            aria-controls="templates-section"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Plantillas
            </span>
            {templatesOpen ? (
              <ChevronDown size={14} className="text-gray-400" />
            ) : (
              <ChevronRight size={14} className="text-gray-400" />
            )}
          </button>
          {templatesOpen && (
            <div id="templates-section" className="px-4 pb-3">
              <TemplateList />
            </div>
          )}
        </div>

        {/* Sección: Terreno */}
        <div className="px-4 py-3 border-b border-gray-100">
          <TerrainSettings />
        </div>

        {/* Sección: Simulación Solar */}
        <div className="px-4 py-3 border-b border-gray-100">
          <SunSettings />
        </div>

        {/* Sección: Elementos Estructurales */}
        <div className="border-b border-gray-100">
          <StructuralSection />
        </div>

        {/* Sección: Superficie */}
        <div className="px-4 py-3 border-b border-gray-100">
          <SurfaceInfo />
        </div>

        {/* Sección: Agregar habitación */}
        <div className="px-4 py-3 border-b border-gray-100">
          <RoomForm />
        </div>

        {/* Sección: Catálogo de Muebles (colapsable) */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => setFixturesOpen(!fixturesOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            aria-expanded={fixturesOpen}
            aria-controls="fixtures-section"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Muebles y Accesorios
            </span>
            {fixturesOpen ? (
              <ChevronDown size={14} className="text-gray-400" />
            ) : (
              <ChevronRight size={14} className="text-gray-400" />
            )}
          </button>
          {fixturesOpen && (
            <div id="fixtures-section" className="px-4 pb-3">
              <FixtureCatalog />
            </div>
          )}
        </div>

        {/* Sección: Lista de habitaciones */}
        <div className="px-4 py-3">
          <RoomList />
        </div>
      </div>
    </aside>
  );
}
