/**
 * Página principal del editor de planos
 * 
 * Compone la interfaz completa: toolbar, sidebar con herramientas y plantas, canvas interactivo
 */

"use client";

import { useEffect } from "react";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { PlanCanvas } from "@/components/canvas/PlanCanvas";
import { useFloorsStore } from "@/stores/floors.store";
import { useHistoryStore } from "@/stores/history.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useSunStore } from "@/stores/sun.store";
import { useContextMenuStore } from "@/stores/context-menu.store";
import { usePanelStore } from "@/stores/panel.store";
import { useCanvasStore } from "@/stores/canvas.store";
import { useSelectionStore } from "@/stores/selection.store";
import { saveProject, loadProject } from "@/lib/storage";
import { Room } from "@/types/plan";

export default function Home() {
  const show = useContextMenuStore((s) => s.show);

  // Cargar proyecto al iniciar
  useEffect(() => {
    const saved = loadProject();
    if (saved) {
      useFloorsStore.setState({
        floors: saved.floors,
        activeFloorId: saved.activeFloorId,
      });
      useTerrainStore.setState({
        terrain: saved.terrain,
      });
      if (saved.sunSettings) {
        useSunStore.setState({
          enabled: saved.sunSettings.enabled,
          date: saved.sunSettings.date,
          time: saved.sunSettings.time,
          location: saved.sunSettings.location,
          floorHeight: saved.sunSettings.floorHeight,
        });
      }
    }
  }, []);

  // Auto-guardar cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      const { floors, activeFloorId } = useFloorsStore.getState();
      const { terrain } = useTerrainStore.getState();
      const sunSettings = useSunStore.getState();
      saveProject({
        name: "Mi Plano",
        terrain,
        floors,
        activeFloorId,
        sunSettings: {
          enabled: sunSettings.enabled,
          date: sunSettings.date,
          time: sunSettings.time,
          location: sunSettings.location,
          floorHeight: sunSettings.floorHeight,
        },
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Guardar antes de cerrar
  useEffect(() => {
    const handleBeforeUnload = () => {
      const { floors, activeFloorId } = useFloorsStore.getState();
      const { terrain } = useTerrainStore.getState();
      const sunSettings = useSunStore.getState();
      saveProject({
        name: "Mi Plano",
        terrain,
        floors,
        activeFloorId,
        sunSettings: {
          enabled: sunSettings.enabled,
          date: sunSettings.date,
          time: sunSettings.time,
          location: sunSettings.location,
          floorHeight: sunSettings.floorHeight,
        },
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const restored = useHistoryStore.getState().undo();
        if (restored) {
          useFloorsStore.setState({
            floors: restored.floors,
            activeFloorId: restored.activeFloorId,
          });
          if (restored.terrain) {
            useTerrainStore.setState({ terrain: restored.terrain });
          }
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        const restored = useHistoryStore.getState().redo();
        if (restored) {
          useFloorsStore.setState({
            floors: restored.floors,
            activeFloorId: restored.activeFloorId,
          });
          if (restored.terrain) {
            useTerrainStore.setState({ terrain: restored.terrain });
          }
        }
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        const { selectedId, clearSelection } = useSelectionStore.getState();
        if (selectedId) {
          useFloorsStore.getState().removeRoom(selectedId);
          clearSelection();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Context menu handlers
  useEffect(() => {
    const handleRoomContext = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { room, clientX, clientY } = customEvent.detail as {
        room: Room;
        clientX: number;
        clientY: number;
      };

      const items = [
        { label: `${room.label}`, disabled: true },
        {
          label: "Propiedades",
          action: () => {
            const panelStore = usePanelStore.getState();
            panelStore.openPanel(room.id, clientX + 10, clientY + 10);
          },
        },
        { label: "", divider: true },
        {
          label: "Renombrar",
          action: () => {
            const { floors, activeFloorId } = useFloorsStore.getState();
            const floor = floors.find((f) => f.id === activeFloorId);
            const roomData = floor?.rooms.find((r) => r.id === room.id);
            usePanelStore.getState().openPanel(room.id, roomData?.x ?? 100, roomData?.y ?? 100);
          },
        },
        {
          label: "Cambiar color",
          action: () => {
            const input = document.createElement("input");
            input.type = "color";
            input.value = room.color || "#e8f4e8";
            input.addEventListener("change", (ev) => {
              useFloorsStore
                .getState()
                .setRoomColor(room.id, (ev.target as HTMLInputElement).value);
            });
            input.click();
          },
        },
        {
          label: "Duplicar",
          action: () => useFloorsStore.getState().duplicateRoom(room.id),
        },
        { label: "", divider: true },
        {
          label: "Editar dimensiones",
          action: () => {
            const { floors, activeFloorId } = useFloorsStore.getState();
            const floor = floors.find((f) => f.id === activeFloorId);
            const roomData = floor?.rooms.find((r) => r.id === room.id);
            usePanelStore.getState().openPanel(room.id, roomData?.x ?? 100, roomData?.y ?? 100);
          },
        },
        { label: "", divider: true },
        {
          label: "Eliminar",
          danger: true,
          action: () => {
            useFloorsStore.getState().removeRoom(room.id);
          },
        },
      ];
      show(clientX, clientY, items);
    };

    const handleTerrainContext = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { clientX, clientY } = customEvent.detail;

      const items = [
        { label: "Terreno", disabled: true },
        { label: "", divider: true },
        {
          label: "Cambiar color",
          action: () => {
            const input = document.createElement("input");
            input.type = "color";
            input.value = useTerrainStore.getState().terrain.color;
            input.addEventListener("change", (ev) => {
              useTerrainStore
                .getState()
                .setTerrainColor((ev.target as HTMLInputElement).value);
            });
            input.click();
          },
        },
        {
          label: "Agregar textura",
          action: () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.addEventListener("change", (ev) => {
              const file = (ev.target as HTMLInputElement).files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  useTerrainStore
                    .getState()
                    .setTerrainImage(event.target?.result as string);
                };
                reader.readAsDataURL(file);
              }
            });
            input.click();
          },
        },
        {
          label: "Quitar textura",
          action: () => useTerrainStore.getState().setTerrainImage(undefined),
        },
        {
          label: "Definir frente",
          action: () => {
            const current = useTerrainStore.getState().terrain.front;
            const options = ["top", "bottom", "left", "right"] as const;
            const nextIndex = (options.indexOf(current) + 1) % options.length;
            useTerrainStore.getState().setTerrainFront(options[nextIndex]);
          },
        },
        { label: "", divider: true },
        {
          label: "Agregar habitacion",
          action: () => document.getElementById("room-label")?.focus(),
        },
      ];
      show(clientX, clientY, items);
    };

    const handleEmptyContext = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { clientX, clientY } = customEvent.detail;
      const items = [
        { label: "Agregar habitacion", action: () => document.getElementById("room-label")?.focus() },
        { label: "Centrar terreno", action: () => { useCanvasStore.getState().setPan(0, 0); useCanvasStore.getState().setZoom(1); } },
        { label: "", divider: true },
        { label: "Ver grilla", action: () => useCanvasStore.getState().toggleGrid() },
      ];
      show(clientX, clientY, items);
    };

    window.addEventListener("room-contextmenu", handleRoomContext);
    window.addEventListener("terrain-contextmenu", handleTerrainContext);
    window.addEventListener("canvas-empty-contextmenu", handleEmptyContext);

    return () => {
      window.removeEventListener("room-contextmenu", handleRoomContext);
      window.removeEventListener("terrain-contextmenu", handleTerrainContext);
      window.removeEventListener("canvas-empty-contextmenu", handleEmptyContext);
    };
  }, [show]);

  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <PlanCanvas />
      </div>
    </div>
  );
}
