/**
 * Tests of canvas magnetism state (P1, wall-drawing-6):
 * `magnetismEnabled` defaults to ON, is session-only (no Zustand persist
 * middleware on this store) and toggles through `toggleMagnetism`.
 */
import { describe, expect, it } from "vitest";
import { useCanvasStore } from "@/stores/canvas.store";

describe("canvas magnetism state", () => {
  it("defaults to enabled (magnetism ON at first draw)", () => {
    expect(useCanvasStore.getState().magnetismEnabled).toBe(true);
  });

  it("toggleMagnetism flips the flag", () => {
    const store = useCanvasStore.getState();
    expect(store.magnetismEnabled).toBe(true);

    store.toggleMagnetism();
    expect(useCanvasStore.getState().magnetismEnabled).toBe(false);

    useCanvasStore.getState().toggleMagnetism();
    expect(useCanvasStore.getState().magnetismEnabled).toBe(true);
  });

  it("is session-only: the store has no persist middleware", () => {
    const withPersist = useCanvasStore as unknown as {
      persist?: { options?: unknown };
    };
    expect(withPersist.persist).toBeUndefined();
  });
});
