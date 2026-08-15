/**
 * Notificaciones transitorias (toasts).
 *
 * Los errores persisten hasta que el usuario los cierra; el resto
 * se auto-oculta a los 4s. Máximo 5 visibles (spec feedback-system-1).
 */

import { create } from "zustand";

export interface Toast {
  id: string;
  kind: "success" | "error" | "info";
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (kind: Toast["kind"], message: string) => void;
  dismiss: (id: string) => void;
}

const MAX_TOASTS = 5;
const AUTO_DISMISS_MS = 4000;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, message) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts, { id, kind, message }].slice(-MAX_TOASTS),
    }));
    if (kind !== "error") {
      setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
    }
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
