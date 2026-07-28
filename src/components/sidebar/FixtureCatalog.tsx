/**
 * Catálogo de fixtures en el sidebar
 *
 * Muestra muebles, plantas, puertas, ventanas y escaleras agrupados por categoría.
 * Click en un item activa modo colocación — click en el canvas lo posiciona.
 */

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useFixtureStore } from "@/stores/fixtures.store";
import { getCatalogByCategory } from "@/lib/fixtures-catalog";
import { FixtureCategory, FixtureSubtype } from "@/types/plan";

const CATEGORY_LABELS: Record<FixtureCategory, string> = {
  furniture: "Muebles",
  plant: "Plantas",
  bathroom: "Baño",
  door: "Puertas",
  window: "Ventanas",
  stair: "Escaleras",
  vehicle: "Vehículos",
};

const CATEGORY_ICONS: Record<FixtureCategory, string> = {
  furniture: "🪑",
  plant: "🪴",
  bathroom: "🚿",
  door: "🚪",
  window: "🪟",
  stair: "🪜",
  vehicle: "🚗",
};

const ALL_CATEGORIES: FixtureCategory[] = [
  "furniture",
  "plant",
  "bathroom",
  "door",
  "window",
  "stair",
  "vehicle",
];

export function FixtureCatalog() {
  const { placingFixture, setPlacingFixture } = useFixtureStore();
  const [openCategories, setOpenCategories] = useState<
    Record<FixtureCategory, boolean>
  >({
    furniture: true,
    plant: false,
    bathroom: false,
    door: false,
    window: false,
    stair: false,
    vehicle: false,
  });

  const toggleCategory = (cat: FixtureCategory) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleSelect = (subtype: FixtureSubtype) => {
    if (placingFixture === subtype) {
      setPlacingFixture(null);
    } else {
      setPlacingFixture(subtype);
    }
  };

  return (
    <div className="space-y-1">
      {ALL_CATEGORIES.map((cat) => {
        const items = getCatalogByCategory(cat);
        const isOpen = openCategories[cat];

        return (
          <div key={cat}>
            <button
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-gray-50 rounded transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <span className="text-sm">{CATEGORY_ICONS[cat]}</span>
                <span className="text-xs font-medium text-gray-700">
                  {CATEGORY_LABELS[cat]}
                </span>
              </span>
              {isOpen ? (
                <ChevronDown size={12} className="text-gray-400" />
              ) : (
                <ChevronRight size={12} className="text-gray-400" />
              )}
            </button>

            {isOpen && (
              <div className="grid grid-cols-2 gap-1 px-2 pb-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`flex flex-col items-center gap-0.5 p-2 rounded-md border text-center transition-all ${
                      placingFixture === item.id
                        ? "bg-blue-50 border-blue-300 ring-1 ring-blue-200"
                        : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                    title={`${item.label} — ${item.width}×${item.height} cm`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[10px] text-gray-600 leading-tight">
                      {item.label}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {item.width}×{item.height}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {placingFixture && (
        <div className="mx-2 mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-center">
          <p className="text-[10px] text-blue-700 font-medium">
            Modo colocación activo
          </p>
          <p className="text-[10px] text-blue-500">
            Click en el canvas para colocar
          </p>
          <button
            onClick={() => setPlacingFixture(null)}
            className="mt-1 text-[10px] text-blue-600 underline hover:text-blue-800"
          >
            Cancelar (Esc)
          </button>
        </div>
      )}
    </div>
  );
}
