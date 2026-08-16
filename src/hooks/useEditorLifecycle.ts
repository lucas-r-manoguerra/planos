/**
 * Ciclo de vida del editor: carga inicial y autosave.
 *
 * Centraliza los efectos de persistencia de la página del editor (spec
 * landing-page-2/3): carga el proyecto guardado al montar y guarda el
 * estado del editor periódicamente y antes de cerrar la pestaña.
 *
 * Expone `collectEditorState` y `applyProjectData` para reutilizarlos en
 * la gestión de proyectos (cambiar de proyecto, importar, etc.).
 */

import { useEffect } from "react";
import { Floor, Fixture, SunSettings, Terrain, Wall } from "@/types/plan";
import { useFloorsStore } from "@/stores/floors.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useSunStore } from "@/stores/sun.store";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useWallsStore } from "@/stores/walls.store";
import { useHistoryStore } from "@/stores/history.store";
import {
  ensureActiveProject,
  loadActiveProject,
  saveActiveProject,
  ProjectData,
} from "@/lib/storage";

const DEFAULT_SAVE_INTERVAL_MS = 30000;

/** Snapshot del estado del editor listo para persistir */
export interface EditorSnapshot {
  terrain: Terrain;
  floors: Floor[];
  activeFloorId: string;
  sunSettings: SunSettings;
  fixtures: Fixture[];
  walls: Wall[];
}

/** Lee el estado actual de los stores en un snapshot persistible */
export function collectEditorState(): EditorSnapshot {
  const { floors, activeFloorId } = useFloorsStore.getState();
  const { terrain } = useTerrainStore.getState();
  const { fixtures } = useFixtureStore.getState();
  const { walls } = useWallsStore.getState();
  const sunSettings = useSunStore.getState();

  return {
    terrain,
    floors,
    activeFloorId,
    fixtures,
    walls,
    sunSettings,
  };
}

/** Aplica un proyecto persistido a los stores del editor */
export function applyProjectData(saved: ProjectData): void {
  useFloorsStore.setState({
    floors: saved.floors,
    activeFloorId: saved.activeFloorId,
  });
  useTerrainStore.setState({ terrain: saved.terrain });
  if (saved.sunSettings) {
    useSunStore.setState({
      enabled: saved.sunSettings.enabled,
      date: saved.sunSettings.date,
      time: saved.sunSettings.time,
      location: saved.sunSettings.location,
      floorHeight: saved.sunSettings.floorHeight,
    });
  }
  if (saved.fixtures) {
    useFixtureStore.setState({ fixtures: saved.fixtures });
  }
  if (saved.walls) {
    useWallsStore.setState({ walls: saved.walls });
  }
  // El historial de undo pertenece al proyecto anterior: no cruzar proyectos.
  useHistoryStore.getState().clear();
}

/**
 * Monta el ciclo de vida de persistencia del editor.
 *
 * @param options.saveIntervalMs Intervalo de autosave en ms (default 30s).
 */
export function useEditorLifecycle(options?: {
  saveIntervalMs?: number;
}): void {
  const saveIntervalMs = options?.saveIntervalMs ?? DEFAULT_SAVE_INTERVAL_MS;

  // Cargar proyecto activo al montar
  useEffect(() => {
    ensureActiveProject();
    const saved = loadActiveProject();
    if (saved) applyProjectData(saved);
  }, []);

  // Autosave periódico + al cerrar la pestaña
  useEffect(() => {
    const persist = () => {
      saveActiveProject(collectEditorState());
    };

    const interval = setInterval(persist, saveIntervalMs);
    window.addEventListener("beforeunload", persist);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", persist);
    };
  }, [saveIntervalMs]);
}
