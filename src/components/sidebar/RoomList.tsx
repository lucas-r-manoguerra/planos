/**
 * Lista de habitaciones agregadas
 *
 * Muestra todas las habitaciones de la planta activa con su nombre y tipo.
 * Permite eliminar habitaciones individuales.
 */

"use client";

import { useFloorsStore } from "@/stores/floors.store";
import { ROOM_COLORS } from "@/lib/constants";
import { Trash2, Home } from "lucide-react";
import { useSelectionStore } from "@/stores/selection.store";

export function RoomList() {
  const { floors, activeFloorId, removeRoom } = useFloorsStore();
  const { selectedId, select } = useSelectionStore();
  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const rooms = activeFloor?.rooms || [];

  if (rooms.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Home size={14} className="text-gray-500" aria-hidden="true" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Habitaciones
          </h3>
        </div>
        <p className="text-xs text-gray-400 italic py-2">
          No hay habitaciones en esta planta
        </p>
        <button
          onClick={() => document.getElementById("room-label")?.focus()}
          className="rounded border border-gray-300 px-2 py-1 text-[11px] text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Agregar habitación
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Home size={14} className="text-gray-500" aria-hidden="true" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Habitaciones
        </h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
          {rooms.length}
        </span>
      </div>

      <div className="space-y-1 max-h-72 overflow-y-auto" role="list" aria-label="Lista de habitaciones">
        {rooms.map((room) => {
          const isSelected = selectedId === room.id;
          return (
            <div
              key={room.id}
              role="listitem"
              onClick={() => select(room.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  select(room.id);
                }
              }}
              tabIndex={0}
              className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                isSelected
                  ? "ring-2 ring-blue-400 bg-blue-50"
                  : "hover:bg-gray-50 border border-transparent hover:border-gray-200"
              }`}
              style={{ borderLeftColor: room.color || ROOM_COLORS[room.type], borderLeftWidth: "3px" }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{room.label}</div>
                <div className="text-xs text-gray-500">
                  {room.type} · {room.width}×{room.height} cm
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeRoom(room.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-opacity"
                aria-label={`Eliminar habitación ${room.label}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
