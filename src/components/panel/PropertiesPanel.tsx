/**
 * Panel modal de propiedades
 *
 * Se abre al seleccionar "Propiedades" desde el menú contextual. Es un modal
 * centrado (accesibilidad a11y-4): role=dialog, trap de foco, cierre con
 * Escape o click en el backdrop. Enruta al editor según el tipo de elemento:
 * room, fixture (muebles/plantas/baño/vehículos), opening (puertas/ventanas)
 * o stair (escaleras).
 */

"use client";

import { usePanelStore } from "@/stores/panel.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useFixtureStore } from "@/stores/fixtures.store";
import { DialogShell } from "./dialog-shell";
import { RoomEditor } from "./properties/room-editor";
import { FixtureEditor } from "./properties/fixture-editor";
import { OpeningEditor } from "./properties/opening-editor";
import { StairEditor } from "./properties/stair-editor";
import { ColumnEditor } from "./ColumnEditor";
import { BeamEditor } from "./BeamEditor";
import { useStructuralStore } from "@/stores/structural.store";

export function PropertiesPanel() {
  const { isOpen, type, elementId, closePanel } = usePanelStore();
  const floors = useFloorsStore((s) => s.floors);
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);
  const fixtures = useFixtureStore((s) => s.fixtures);

  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const room =
    type === "room" && elementId
      ? activeFloor?.rooms.find((r) => r.id === elementId)
      : null;
  const fixture =
    type !== "room" && elementId
      ? fixtures.find((f) => f.id === elementId)
      : null;

  let title = "Propiedades";
  let content: React.ReactNode = null;

  const column =
    type === "column" && elementId
      ? useStructuralStore.getState().columns.find((c) => c.id === elementId)
      : null;

  const beam =
    type === "beam" && elementId
      ? useStructuralStore.getState().beams.find((b) => b.id === elementId)
      : null;

  if (column && elementId) {
    title = "Propiedades de Columna";
    content = <ColumnEditor elementId={elementId} />;
  } else if (beam && elementId) {
    title = "Propiedades de Viga";
    content = <BeamEditor elementId={elementId} />;
  } else if (room) {
    title = `Propiedades de ${room.label}`;
    content = <RoomEditor room={room} />;
  } else if (fixture) {
    title = `Propiedades de ${fixture.label}`;
    if (type === "opening") {
      content = <OpeningEditor fixture={fixture} />;
    } else if (type === "stair") {
      content = <StairEditor fixture={fixture} />;
    } else {
      content = <FixtureEditor fixture={fixture} />;
    }
  }

  if (!isOpen || !content) return null;

  return (
    <DialogShell open title={title} onClose={closePanel}>
      {content}
    </DialogShell>
  );
}
