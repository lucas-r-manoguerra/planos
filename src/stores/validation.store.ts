/**
 * Store de estado para el sistema de validación normativa
 *
 * Centraliza las violaciones detectadas y el estado de los overlays
 * de validación en el canvas.
 *
 * Reglas: selector fino (regla 05), acciones de dominio (regla 05).
 */

"use client";

import { create } from "zustand";
import { Violation } from "@/types/plan";

interface ValidationOverlays {
  areas: boolean;
  cotas: boolean;
  setbacks: boolean;
  validationPanel: boolean;
  sunHours: boolean;
  circulation: boolean;
}

interface ValidationStore {
  violations: Violation[];
  overlays: ValidationOverlays;

  // Acciones
  setViolations: (violations: Violation[]) => void;
  toggleOverlay: (key: keyof ValidationOverlays) => void;
  setOverlay: (key: keyof ValidationOverlays, value: boolean) => void;
  getViolationsByRoom: (roomId: string) => Violation[];
  getErrorCount: () => number;
  getWarningCount: () => number;
}

export const useValidationStore = create<ValidationStore>((set, get) => ({
  violations: [],
  overlays: {
    areas: true,
    cotas: true,
    setbacks: true,
    validationPanel: true,
    sunHours: false,
    circulation: false,
  },

  setViolations: (violations) => set({ violations }),

  toggleOverlay: (key) =>
    set((state) => ({
      overlays: { ...state.overlays, [key]: !state.overlays[key] },
    })),

  setOverlay: (key, value) =>
    set((state) => ({
      overlays: { ...state.overlays, [key]: value },
    })),

  getViolationsByRoom: (roomId) =>
    get().violations.filter((v) => v.roomId === roomId),

  getErrorCount: () =>
    get().violations.filter((v) => v.severity === "error").length,

  getWarningCount: () =>
    get().violations.filter((v) => v.severity === "warning").length,
}));
