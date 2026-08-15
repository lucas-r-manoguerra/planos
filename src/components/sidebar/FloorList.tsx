/**
 * Gestor de plantas del edificio
 *
 * Permite agregar, eliminar, renombrar y reordenar plantas.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { useFloorsStore } from "@/stores/floors.store";
import { Layers, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

export function FloorList() {
  const { floors, activeFloorId, setActiveFloor, addFloor, removeFloor, renameFloor, moveFloorUp, moveFloorDown, setFloorLevel, levelError, clearLevelError } =
    useFloorsStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [levelEditValue, setLevelEditValue] = useState("");
  const levelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (editingLevelId && levelInputRef.current) {
      levelInputRef.current.focus();
      levelInputRef.current.select();
    }
  }, [editingLevelId]);

  const startEditing = (floorId: string, currentName: string) => {
    setEditingId(floorId);
    setEditValue(currentName);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) {
      renameFloor(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, floorId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setActiveFloor(floorId);
    }
  };

  const handleDelete = (e: React.MouseEvent, floorId: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeFloor(floorId);
  };

  const handleMoveUp = (e: React.MouseEvent, floorId: string) => {
    e.preventDefault();
    e.stopPropagation();
    moveFloorUp(floorId);
  };

  const handleMoveDown = (e: React.MouseEvent, floorId: string) => {
    e.preventDefault();
    e.stopPropagation();
    moveFloorDown(floorId);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-gray-500" aria-hidden="true" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Plantas
          </h3>
        </div>
        <button
          onClick={() => addFloor()}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-1.5 py-1 rounded"
          aria-label="Agregar nueva planta"
        >
          <Plus size={12} />
          Agregar
        </button>
      </div>

      <div role="listbox" aria-label="Lista de plantas" className="space-y-1">
        {floors.map((floor, index) => {
          const isActive = floor.id === activeFloorId;
          const isEditing = editingId === floor.id;

          return (
            <div
              key={floor.id}
              role="option"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => setActiveFloor(floor.id)}
              onKeyDown={(e) => handleKeyDown(e, floor.id)}
              className={`relative flex items-center gap-2 p-2.5 pr-16 rounded-lg cursor-pointer transition-all ${
                isActive
                  ? "bg-blue-50 border border-blue-200 shadow-sm"
                  : "border border-transparent hover:bg-gray-50 hover:border-gray-200"
              }`}
            >
              {/* Nivel editable */}
              {editingLevelId === floor.id ? (
                <div className="shrink-0 relative">
                  <input
                    ref={levelInputRef}
                    type="number"
                    min={0}
                    value={levelEditValue}
                    onChange={(e) => setLevelEditValue(e.target.value)}
                    onBlur={() => {
                      const val = parseInt(levelEditValue, 10);
                      if (!isNaN(val)) {
                        setFloorLevel(floor.id, val);
                      }
                      setEditingLevelId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseInt(levelEditValue, 10);
                        if (!isNaN(val)) {
                          setFloorLevel(floor.id, val);
                        }
                        setEditingLevelId(null);
                      }
                      if (e.key === "Escape") {
                        setEditingLevelId(null);
                        clearLevelError();
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-14 text-[10px] font-medium text-gray-900 bg-white border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  {levelError && editingLevelId === floor.id && (
                    <div className="absolute top-full left-0 mt-1 text-[10px] text-red-600 whitespace-nowrap z-10 bg-white border border-red-200 rounded px-1.5 py-0.5 shadow-sm">
                      {levelError}
                    </div>
                  )}
                </div>
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingLevelId(floor.id);
                    setLevelEditValue(String(floor.level));
                    clearLevelError();
                  }}
                  className="shrink-0 text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-200 hover:text-gray-600 transition-colors"
                  title="Doble clic para cambiar nivel"
                >
                  Nivel {floor.level + 1}
                </span>
              )}

              {/* Nombre editable */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-sm font-medium text-gray-900 bg-white border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEditing(floor.id, floor.name);
                    }}
                    className={`text-sm font-medium truncate ${isActive ? "text-blue-900" : "text-gray-800"}`}
                  >
                    {floor.name}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-0.5">
                  {floor.rooms.length} habitación{floor.rooms.length !== 1 ? "es" : ""}
                </div>
              </div>

              {/* Acciones */}
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                {/* Reordenar */}
                {floors.length > 1 && (
                  <div className="flex flex-col -space-y-0.5">
                    <button
                      onClick={(e) => handleMoveUp(e, floor.id)}
                      disabled={index === 0}
                      className={`p-0.5 rounded ${index === 0 ? "text-gray-200 cursor-not-allowed" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                      aria-label={`Mover ${floor.name} arriba`}
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      onClick={(e) => handleMoveDown(e, floor.id)}
                      disabled={index === floors.length - 1}
                      className={`p-0.5 rounded ${index === floors.length - 1 ? "text-gray-200 cursor-not-allowed" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                      aria-label={`Mover ${floor.name} abajo`}
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                )}

                {/* Eliminar */}
                {floors.length > 1 && (
                  <button
                    onClick={(e) => handleDelete(e, floor.id)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    aria-label={`Eliminar planta ${floor.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
