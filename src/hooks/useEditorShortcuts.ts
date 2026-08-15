/**
 * Atajos de teclado del editor (spec fixtures-2).
 *
 * - Ctrl/Cmd+Z: deshacer, Ctrl/Cmd+Shift+Z: rehacer.
 * - Delete/Backspace: elimina la selección — habitación primero (cascade
 *   de aberturas), si no, fixture. No-op cuando el foco está en un campo
 *   editable (input, textarea, select, contentEditable).
 *
 * La selección se resuelve room-first (decisión de diseño): si el id
 * seleccionado pertenece a una habitación de la planta activa se elimina
 * la habitación; si no, se intenta como fixture.
 */

"use client";

import { useEffect } from "react";
import { useHistoryStore } from "@/stores/history.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useSelectionStore } from "@/stores/selection.store";
import type { HistoryEntry } from "@/stores/history.store";

/** Restaura un entry del historial en los stores (deshacer/rehacer) */
export function applyHistoryEntry(entry: HistoryEntry): void {
  useFloorsStore.setState({
    floors: entry.floors,
    activeFloorId: entry.activeFloorId,
  });
  if (entry.terrain) {
    useTerrainStore.setState({ terrain: entry.terrain });
  }
  if (entry.fixtures) {
    useFixtureStore.setState({ fixtures: entry.fixtures });
  }
}

/** true si el foco está en un campo editable (no robar atajos) */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

/** Registra los atajos de teclado del editor */
export function useEditorShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        const history = useHistoryStore.getState();
        const restored = e.shiftKey ? history.redo() : history.undo();
        if (restored) applyHistoryEntry(restored);
        return;
      }

      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (isEditableTarget(e.target)) return;

      e.preventDefault();
      const { selectedId, clearSelection } = useSelectionStore.getState();
      if (!selectedId) return;

      const { floors, activeFloorId } = useFloorsStore.getState();
      const activeFloor = floors.find((f) => f.id === activeFloorId);
      const isRoom = activeFloor?.rooms.some((r) => r.id === selectedId);
      const isFixture = useFixtureStore
        .getState()
        .fixtures.some((f) => f.id === selectedId);

      if (isRoom) {
        useFloorsStore.getState().removeRoom(selectedId);
      } else if (isFixture) {
        useFixtureStore.getState().removeFixture(selectedId);
      }
      clearSelection();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
