/**
 * Editor de propiedades de habitación
 *
 * Nombre, tipo, dimensiones, posición, color, magnetismo y paredes.
 * Sin botón de eliminar (decisión de diseño: las habitaciones se eliminan
 * desde el menú contextual o el canvas).
 */

"use client";

import { useFloorsStore } from "@/stores/floors.store";
import { Switch } from "@/components/ui/switch";
import type { Room } from "@/types/plan";

interface RoomEditorProps {
  room: Room;
}

export function RoomEditor({ room }: RoomEditorProps) {
  const {
    renameRoom,
    setRoomColor,
    updateRoomDimensions,
    setRoomSnap,
    setRoomWallWidth,
    setRoomEnclosed,
  } = useFloorsStore();

  return (
    <>
      {/* Nombre */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Nombre</label>
        <input
          type="text"
          value={room.label}
          onChange={(e) => renameRoom(room.id, e.target.value)}
          className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Tipo */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Tipo</label>
        <div className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-1.5 border border-gray-200">
          {room.type}
        </div>
      </div>

      {/* Dimensiones */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Dimensiones (cm)</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-400">Ancho</label>
            <input
              type="number"
              value={room.width}
              min={50}
              onChange={(e) => {
                const w = parseInt(e.target.value) || 50;
                updateRoomDimensions(room.id, w, room.height);
              }}
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400">Alto</label>
            <input
              type="number"
              value={room.height}
              min={50}
              onChange={(e) => {
                const h = parseInt(e.target.value) || 50;
                updateRoomDimensions(room.id, room.width, h);
              }}
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="text-xs text-gray-400">
          = {((room.width * room.height) / 10000).toFixed(1)} m²
        </div>
      </div>

      {/* Posición */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Posición (cm)</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-400">X</label>
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
              {Math.round(room.x)}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400">Y</label>
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
              {Math.round(room.y)}
            </div>
          </div>
        </div>
      </div>

      {/* Color */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={room.color || "#e8f4e8"}
            onChange={(e) => setRoomColor(room.id, e.target.value)}
            className="h-8 w-10 rounded border border-gray-300 cursor-pointer"
            aria-label="Color de la habitación"
          />
          <span className="text-xs text-gray-500 font-mono">{room.color || "#e8f4e8"}</span>
        </div>
      </div>

      {/* Magnetismo */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Magnetismo</label>
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-md border transition-colors ${
            room.snapEnabled !== false
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-gray-50 border-gray-200 text-gray-500"
          }`}
        >
          <span className="text-sm">
            {room.snapEnabled !== false ? "Activado" : "Desactivado"}
          </span>
          <Switch
            checked={room.snapEnabled !== false}
            onCheckedChange={(checked) => setRoomSnap(room.id, checked)}
            label={`Magnetismo ${room.snapEnabled !== false ? "activado" : "desactivado"} para ${room.label}`}
          />
        </div>
        <p className="text-[10px] text-gray-400">
          Alineación magnética a bordes del terreno y otras habitaciones
        </p>
      </div>

      {/* Paredes */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-500">Paredes</label>

        {/* Enclosed toggle */}
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-md border transition-colors ${
            room.enclosed !== false
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-gray-50 border-gray-200 text-gray-500"
          }`}
        >
          <span className="text-sm">
            {room.enclosed !== false ? "Encerrada (4 paredes)" : "Abierta"}
          </span>
          <Switch
            checked={room.enclosed !== false}
            onCheckedChange={(checked) => setRoomEnclosed(room.id, checked)}
            label={`Paredes ${room.enclosed !== false ? "encerradas" : "abiertas"} para ${room.label}`}
          />
        </div>

        {/* Wall width */}
        <div className="space-y-1">
          <label className="text-[10px] text-gray-400">Ancho de pared (cm)</label>
          <input
            type="number"
            value={room.wallWidth ?? 10}
            min={0}
            max={50}
            step={1}
            onChange={(e) => {
              const w = parseInt(e.target.value) || 0;
              setRoomWallWidth(room.id, Math.max(0, Math.min(50, w)));
            }}
            className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-[10px] text-gray-400">
            {(room.wallWidth ?? 10) > 0
              ? `= ${((room.wallWidth ?? 10) / 100).toFixed(2)}m`
              : "Sin paredes"}
          </div>
        </div>

        <p className="text-[10px] text-gray-400">
          Las paredes de habitaciones adyacentes se fusionan automáticamente
        </p>
      </div>
    </>
  );
}
