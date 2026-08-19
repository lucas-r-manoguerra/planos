/**
 * Información de superficie total
 *
 * Muestra los m² construidos vs los m² disponibles del terreno,
 * incluyendo FOS/FOT según normativa Gualeguay.
 */

"use client";

import { useFloorsStore } from "@/stores/floors.store";
import { useTerrainStore } from "@/stores/terrain.store";
import { SquareStack } from "lucide-react";
import { calculateFosFot } from "@/lib/normative/gualeguay/fos-fot";

export function SurfaceInfo() {
  const { floors } = useFloorsStore();
  const { terrain } = useTerrainStore();

  const terrainArea = (terrain.width * terrain.height) / 10000;

  let totalBuiltArea = 0;
  let totalRooms = 0;
  for (const floor of floors) {
    for (const room of floor.rooms) {
      totalBuiltArea += (room.width * room.height) / 10000;
      totalRooms++;
    }
  }

  const percentage = terrainArea > 0 ? Math.round((totalBuiltArea / terrainArea) * 100) : 0;

  const fosFot = calculateFosFot(floors, terrain, terrain.zoneId);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <SquareStack size={14} className="text-gray-500" aria-hidden="true" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Superficie
        </h3>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Terreno</span>
          <span className="font-medium text-gray-800">{terrainArea.toFixed(1)} m²</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Construido</span>
          <span className="font-medium text-gray-800">{totalBuiltArea.toFixed(1)} m²</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Habitaciones</span>
          <span className="font-medium text-gray-800">{totalRooms}</span>
        </div>

        {/* FOS / FOT */}
        {terrainArea > 0 && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">FOS</span>
              <span className={`font-medium ${fosFot.fosExceeded ? "text-red-600" : "text-gray-800"}`}>
                {(fosFot.fos * 100).toFixed(1)}%
                <span className="text-gray-400 text-xs ml-1">
                  (máx {(fosFot.zone.maxFos * 100).toFixed(0)}%)
                </span>
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">FOT</span>
              <span className={`font-medium ${fosFot.fotExceeded ? "text-red-600" : "text-gray-800"}`}>
                {(fosFot.fot * 100).toFixed(1)}%
                <span className="text-gray-400 text-xs ml-1">
                  (máx {(fosFot.zone.maxFot * 100).toFixed(0)}%)
                </span>
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Zona</span>
              <span>{fosFot.zone.id} — {fosFot.zone.label}</span>
            </div>
          </>
        )}

        <div className="pt-1">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Ocupación</span>
            <span className={percentage > 80 ? "text-red-600 font-semibold" : "text-gray-600"}>
              {percentage}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percentage > 80 ? "bg-red-500" : percentage > 50 ? "bg-yellow-500" : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Ocupación del terreno: ${percentage}%`}
            />
          </div>
        </div>

        {/* Decreto 203/16 — placeholder warning */}
        <div className="mt-2 rounded bg-amber-50 border border-amber-200 px-2 py-1.5 text-xs text-amber-700">
          ⚠ Valores FOS/FOT y retiros corresponden al{' '}
          <span className="font-medium">Decreto 203/16 (Gualeguay)</span>{' '}
          usando baseline nacional. Pendiente de ajuste con normativa local vigente.
        </div>
      </div>
    </div>
  );
}
