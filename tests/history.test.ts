/**
 * Tests del historial (S2): undo/redo restauran la geometría de paredes y
 * la alternancia undo→redo→undo recorre estados reales.
 *
 * Regresión del fix de redo: redo() empuja el estado VIVO actual al stack
 * de undo (antes empujaba el snapshot re-ejecutado, rompiendo la
 * alternancia y devolviendo estado incorrecto).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useHistoryStore } from "@/stores/history.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useWallsStore } from "@/stores/walls.store";
import { applyHistoryEntry } from "@/hooks/useEditorShortcuts";
import { Wall } from "@/types/plan";

function wall(id: string, x1: number): Wall {
  return {
    id,
    floorId: "f1",
    x1,
    y1: 5,
    x2: x1 + 100,
    y2: 5,
    thickness: 10,
  };
}

beforeEach(() => {
  useFloorsStore.setState({ floors: [], activeFloorId: "f1" });
  useFixtureStore.setState({ fixtures: [] });
  useWallsStore.setState({ walls: [] });
  useHistoryStore.setState({ past: [], future: [] });
});

describe("historial de paredes (S2, wall-drawing-5)", () => {
  it("undo restaura el estado previo y deja el estado vivo para redo", () => {
    useWallsStore.setState({ walls: [wall("w1", 0)] });
    const history = useHistoryStore.getState();
    history.pushState(history.captureSnapshot());
    useWallsStore.setState({ walls: [wall("w1", 50)] });

    const restored = history.undo();
    expect(restored).not.toBeNull();
    if (restored) applyHistoryEntry(restored);

    expect(useWallsStore.getState().walls[0].x1).toBe(0);
    expect(history.canRedo()).toBe(true);
    expect(history.canUndo()).toBe(false);
  });

  it("redo restaura el estado POST-cambio (no el snapshot previo)", () => {
    useWallsStore.setState({ walls: [wall("w1", 0)] });
    const history = useHistoryStore.getState();
    history.pushState(history.captureSnapshot());
    useWallsStore.setState({ walls: [wall("w1", 50)] });

    const restored = history.undo();
    if (restored) applyHistoryEntry(restored);

    const redone = history.redo();
    expect(redone).not.toBeNull();
    if (redone) applyHistoryEntry(redone);

    // El redo debe devolver la geometría POST-cambio (x1=50), no la previa
    expect(useWallsStore.getState().walls[0].x1).toBe(50);
    expect(history.canRedo()).toBe(false);
  });

  it("alternancia undo→redo→undo recorre estados reales", () => {
    useWallsStore.setState({ walls: [wall("w1", 0)] });
    const history = useHistoryStore.getState();
    history.pushState(history.captureSnapshot());
    useWallsStore.setState({ walls: [wall("w1", 50)] });

    let restored = history.undo();
    if (restored) applyHistoryEntry(restored);
    expect(useWallsStore.getState().walls[0].x1).toBe(0);

    restored = history.redo();
    if (restored) applyHistoryEntry(restored);
    expect(useWallsStore.getState().walls[0].x1).toBe(50);

    restored = history.undo();
    if (restored) applyHistoryEntry(restored);
    expect(useWallsStore.getState().walls[0].x1).toBe(0);
    expect(history.canRedo()).toBe(true); // el tercer paso vuelve a estar disponible
  });

  it("dos cambios secuenciales se deshacen en orden inverso", () => {
    useWallsStore.setState({ walls: [wall("w1", 0)] });
    const history = useHistoryStore.getState();
    history.pushState(history.captureSnapshot());
    useWallsStore.setState({ walls: [wall("w1", 50)] });
    history.pushState(history.captureSnapshot());
    useWallsStore.setState({ walls: [wall("w1", 100)] });

    let restored = history.undo();
    if (restored) applyHistoryEntry(restored);
    expect(useWallsStore.getState().walls[0].x1).toBe(50);

    restored = history.undo();
    if (restored) applyHistoryEntry(restored);
    expect(useWallsStore.getState().walls[0].x1).toBe(0);
  });

  it("gesto: beginGesture/endGesture agrupan el drag en un solo paso", () => {
    useWallsStore.setState({ walls: [wall("w1", 0)] });
    const history = useHistoryStore.getState();
    history.beginGesture();
    useWallsStore.setState({ walls: [wall("w1", 10)] });
    useWallsStore.setState({ walls: [wall("w1", 20)] });
    useWallsStore.setState({ walls: [wall("w1", 30)] });
    history.endGesture();

    const restored = history.undo();
    if (restored) applyHistoryEntry(restored);
    expect(useWallsStore.getState().walls[0].x1).toBe(0);
    expect(history.canUndo()).toBe(false); // un único paso para todo el drag
  });

  it("gesto sin cambios (click sin mover) descarta el snapshot", () => {
    useWallsStore.setState({ walls: [wall("w1", 0)] });
    const history = useHistoryStore.getState();
    history.beginGesture();
    history.endGesture();
    expect(history.canUndo()).toBe(false);
  });
});
