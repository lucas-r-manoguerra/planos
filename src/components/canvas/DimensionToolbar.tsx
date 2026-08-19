/**
 * Dimension toolbar — appears when a room is selected.
 *
 * Shows width × height in meters and allows direct editing.
 * Positioned above the selected room on the canvas.
 */

"use client";

import { memo, useCallback, useRef, useState } from "react";
import { useSelectionStore } from "@/stores/selection.store";
import { useFloorsStore } from "@/stores/floors.store";
import { cmToDisplay } from "@/lib/utils";

export const DimensionToolbar = memo(function DimensionToolbar() {
  const selectedId = useSelectionStore((s) => s.selectedId);
  const floors = useFloorsStore((s) => s.floors);

  // Find the selected room
  const room = floors
    .flatMap((f) => f.rooms)
    .find((r) => r.id === selectedId);

  if (!room) return null;

  return <DimensionToolbarInner room={room} />;
});

function DimensionToolbarInner({
  room,
}: {
  room: { id: string; width: number; height: number };
}) {
  const [widthM, setWidthM] = useState(room.width / 100);
  const [heightM, setHeightM] = useState(room.height / 100);
  const [editing, setEditing] = useState<"width" | "height" | null>(null);
  const widthRef = useRef<HTMLInputElement>(null);
  const heightRef = useRef<HTMLInputElement>(null);

  // Sync when room changes externally (drag, snap, etc.) — only when not editing.
  // Uses the React render-time sync pattern (no useEffect).
  const [prevRoom, setPrevRoom] = useState({ w: room.width, h: room.height });
  if (prevRoom.w !== room.width || prevRoom.h !== room.height) {
    setPrevRoom({ w: room.width, h: room.height });
    if (editing === null) {
      setWidthM(room.width / 100);
      setHeightM(room.height / 100);
    }
  }

  const commitWidth = useCallback(() => {
    const cm = Math.round(widthM * 100);
    if (cm > 0 && cm !== room.width) {
      useFloorsStore.getState().updateRoomDimensions(room.id, cm, room.height);
    }
    setEditing(null);
  }, [widthM, room.id, room.width, room.height]);

  const commitHeight = useCallback(() => {
    const cm = Math.round(heightM * 100);
    if (cm > 0 && cm !== room.height) {
      useFloorsStore.getState().updateRoomDimensions(room.id, room.width, cm);
    }
    setEditing(null);
  }, [heightM, room.id, room.width, room.height]);

  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-sm"
      role="toolbar"
      aria-label="Dimensiones de la habitación"
    >
      <span className="text-gray-500 text-xs">Dim:</span>

      {/* Width */}
      <label className="flex items-center gap-1">
        <span className="text-gray-400 text-xs">An:</span>
        {editing === "width" ? (
          <input
            ref={widthRef}
            type="number"
            value={widthM}
            onChange={(e) => setWidthM(parseFloat(e.target.value) || 0)}
            onBlur={commitWidth}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitWidth();
              if (e.key === "Escape") {
                setWidthM(room.width / 100);
                setEditing(null);
              }
            }}
            className="w-16 h-6 text-xs border border-blue-400 rounded px-1 text-right"
            min={0.1}
            step={0.1}
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditing("width")}
            className="font-mono text-gray-800 dark:text-gray-200 hover:text-blue-600 hover:underline"
            title="Click para editar ancho"
          >
            {cmToDisplay(room.width)}
          </button>
        )}
      </label>

      <span className="text-gray-300">×</span>

      {/* Height */}
      <label className="flex items-center gap-1">
        <span className="text-gray-400 text-xs">Al:</span>
        {editing === "height" ? (
          <input
            ref={heightRef}
            type="number"
            value={heightM}
            onChange={(e) => setHeightM(parseFloat(e.target.value) || 0)}
            onBlur={commitHeight}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitHeight();
              if (e.key === "Escape") {
                setHeightM(room.height / 100);
                setEditing(null);
              }
            }}
            className="w-16 h-6 text-xs border border-blue-400 rounded px-1 text-right"
            min={0.1}
            step={0.1}
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditing("height")}
            className="font-mono text-gray-800 dark:text-gray-200 hover:text-blue-600 hover:underline"
            title="Click para editar alto"
          >
            {cmToDisplay(room.height)}
          </button>
        )}
      </label>

      <span className="text-gray-400 text-xs ml-1">
        ({((room.width * room.height) / 10000).toFixed(2)} m²)
      </span>
    </div>
  );
}
