/**
 * Panel flotante de propiedades de habitación
 *
 * Se abre al seleccionar "Propiedades" desde el menú contextual.
 * Se puede arrastrar por la pantalla y se cierra con X o click fuera.
 */

"use client";

import { useRef, useEffect, useCallback } from "react";
import { usePanelStore } from "@/stores/panel.store";
import { useFloorsStore } from "@/stores/floors.store";
import { X, GripHorizontal } from "lucide-react";

export function PropertiesPanel() {
  const { isOpen, roomId, x, y, closePanel, setPosition } = usePanelStore();
  const { floors, activeFloorId, renameRoom, setRoomColor, updateRoomDimensions, setRoomSnap, setRoomWallWidth, setRoomEnclosed } = useFloorsStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; panelX: number; panelY: number } | null>(null);

  // Find the room
  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const room = activeFloor?.rooms.find((r) => r.id === roomId);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };

    // Delay to avoid closing immediately from the right-click that opened it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen, closePanel]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closePanel]);

  // Drag handling
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startY: e.clientY, panelX: x, panelY: y };

      const handleDragMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = moveEvent.clientX - dragRef.current.startX;
        const dy = moveEvent.clientY - dragRef.current.startY;
        setPosition(dragRef.current.panelX + dx, dragRef.current.panelY + dy);
      };

      const handleDragEnd = () => {
        dragRef.current = null;
        document.removeEventListener("mousemove", handleDragMove);
        document.removeEventListener("mouseup", handleDragEnd);
      };

      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
    },
    [x, y, setPosition]
  );

  if (!isOpen || !room) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col"
      style={{ left: x, top: y, width: 320 }}
      role="dialog"
      aria-label={`Propiedades de ${room.label}`}
    >
      {/* Header — draggable */}
      <div
        onMouseDown={handleDragStart}
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 cursor-grab active:cursor-grabbing rounded-t-xl bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-gray-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-gray-800">Propiedades</span>
        </div>
        <button
          onClick={closePanel}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
          aria-label="Cerrar panel de propiedades"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          <button
            onClick={() => setRoomSnap(room.id, room.snapEnabled === false)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md border transition-colors ${
              room.snapEnabled !== false
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}
            role="switch"
            aria-checked={room.snapEnabled !== false}
            aria-label={`Magnetismo ${room.snapEnabled !== false ? "activado" : "desactivado"} para ${room.label}`}
          >
            <span className="text-sm">
              {room.snapEnabled !== false ? "Activado" : "Desactivado"}
            </span>
            <div
              className={`w-9 h-5 rounded-full transition-colors relative ${
                room.snapEnabled !== false ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  room.snapEnabled !== false ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
          <p className="text-[10px] text-gray-400">
            Alineación magnética a bordes del terreno y otras habitaciones
          </p>
        </div>

        {/* Paredes */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">Paredes</label>

          {/* Enclosed toggle */}
          <button
            onClick={() => setRoomEnclosed(room.id, room.enclosed === false)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md border transition-colors ${
              room.enclosed !== false
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}
            role="switch"
            aria-checked={room.enclosed !== false}
            aria-label={`Paredes ${room.enclosed !== false ? "encerradas" : "abiertas"} para ${room.label}`}
          >
            <span className="text-sm">
              {room.enclosed !== false ? "Encerrada (4 paredes)" : "Abierta"}
            </span>
            <div
              className={`w-9 h-5 rounded-full transition-colors relative ${
                room.enclosed !== false ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  room.enclosed !== false ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>

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
      </div>
    </div>
  );
}
