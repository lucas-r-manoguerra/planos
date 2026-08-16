/**
 * Tests de fitToView (lib/canvas-fit.ts, S3 fix).
 * Terreno en cm, viewport en px; zoom clampado a [minZoom, maxZoom].
 */
import { describe, expect, it } from "vitest";
import { fitToView } from "@/lib/canvas-fit";

describe("fitToView", () => {
  it("terreno más ancho que el viewport: fit por ancho y centrado", () => {
    // terrain 1000×800, viewport 1000×800, padding 40 → avail 920×720
    // fit = min(920/1000, 720/800) = min(0.92, 0.9) = 0.9
    // pan = (1000 − 1000·0.9)/2 = 50 ; (800 − 800·0.9)/2 = 40
    expect(fitToView(1000, 800, 1000, 800, 0.1, 5)).toEqual({
      zoom: 0.9,
      panX: 50,
      panY: 40,
    });
  });

  it("terreno chico: el fit se mantiene dentro del zoom máximo", () => {
    // 10×10 cm en 800×600 → fit enorme → clamp a 5
    const r = fitToView(10, 10, 800, 600, 0.1, 5);
    expect(r.zoom).toBe(5);
    expect(r.panX).toBe((800 - 10 * 5) / 2);
    expect(r.panY).toBe((600 - 10 * 5) / 2);
  });

  it("terreno enorme: el fit se mantiene dentro del zoom mínimo", () => {
    const r = fitToView(100000, 100000, 800, 600, 0.1, 5);
    expect(r.zoom).toBe(0.1);
    // El terreno excede el viewport → pan negativo (se muestra el origen)
    expect(r.panX).toBe((800 - 100000 * 0.1) / 2);
    expect(r.panY).toBe((600 - 100000 * 0.1) / 2);
    expect(Number.isFinite(r.panX)).toBe(true);
  });

  it("viewport degenerado (0×0): zoom finito dentro de [min, max]", () => {
    const r = fitToView(1000, 800, 0, 0, 0.1, 5);
    expect(Number.isFinite(r.zoom)).toBe(true);
    expect(r.zoom).toBeGreaterThanOrEqual(0.1);
    expect(r.zoom).toBeLessThanOrEqual(5);
  });

  it("terreno y viewport cuadrados: fit idéntico por ambos ejes", () => {
    // terrain 500×500 en 600×600 → avail 520×520 → fit = 1.04 (bajo el max 5)
    const r = fitToView(500, 500, 600, 600, 0.1, 5);
    expect(r.zoom).toBe(1.04);
    expect(r.panX).toBe((600 - 500 * 1.04) / 2);
    expect(r.panY).toBe((600 - 500 * 1.04) / 2);
  });
});
