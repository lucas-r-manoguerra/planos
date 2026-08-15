/**
 * Campos compartidos del editor de fixtures
 *
 * Usado por los editores de muebles/plantas (fixture), puertas/ventanas
 * (opening) y escaleras (stair). Las dimensiones se ocultan para escaleras
 * (se calculan a partir de las propiedades de tramo/escalón).
 */

"use client";

import { getCatalogItem } from "@/lib/fixtures-catalog";
import { useFixtureStore } from "@/stores/fixtures.store";
import { usePanelStore } from "@/stores/panel.store";
import type { Fixture } from "@/types/plan";

interface FixtureCommonFieldsProps {
  fixture: Fixture;
  updateFixture: (id: string, updates: Partial<Fixture>) => void;
}

export function FixtureCommonFields({
  fixture,
  updateFixture,
}: FixtureCommonFieldsProps) {
  const catalogItem = getCatalogItem(fixture.catalogId);

  return (
    <>
      {/* Nombre */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Nombre</label>
        <input
          type="text"
          value={fixture.label}
          onChange={(e) => updateFixture(fixture.id, { label: e.target.value })}
          className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Tipo */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Tipo</label>
        <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-1.5 border border-gray-200">
          <span>{catalogItem?.icon}</span>
          <span>{catalogItem?.label ?? fixture.catalogId}</span>
        </div>
      </div>

      {/* Dimensiones — solo editable para fixtures que no son escalera */}
      {fixture.category !== "stair" && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Dimensiones (cm)</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400">Ancho</label>
              <input
                type="number"
                value={fixture.width}
                min={5}
                onChange={(e) => updateFixture(fixture.id, { width: parseInt(e.target.value) || 5 })}
                className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400">Alto</label>
              <input
                type="number"
                value={fixture.height}
                min={5}
                onChange={(e) => updateFixture(fixture.id, { height: parseInt(e.target.value) || 5 })}
                className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Posición */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Posición (cm)</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-400">X</label>
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
              {Math.round(fixture.x)}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400">Y</label>
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
              {Math.round(fixture.y)}
            </div>
          </div>
        </div>
      </div>

      {/* Rotación */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Rotación</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={360}
            step={15}
            value={fixture.rotation}
            onChange={(e) => updateFixture(fixture.id, { rotation: parseInt(e.target.value) })}
            className="flex-1"
          />
          <span className="text-xs text-gray-600 w-10 text-right">{fixture.rotation}°</span>
        </div>
      </div>

      {/* Color */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={fixture.color}
            onChange={(e) => updateFixture(fixture.id, { color: e.target.value })}
            className="h-8 w-10 rounded border border-gray-300 cursor-pointer"
          />
          <span className="text-xs text-gray-500 font-mono">{fixture.color}</span>
        </div>
      </div>
    </>
  );
}

/** Botón de eliminar compartido (remueve el fixture y cierra el panel) */
export function FixtureDeleteButton({ fixture }: { fixture: Fixture }) {
  return (
    <button
      onClick={() => {
        useFixtureStore.getState().removeFixture(fixture.id);
        usePanelStore.getState().closePanel();
      }}
      className="w-full px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors text-sm"
    >
      Eliminar fixture
    </button>
  );
}
