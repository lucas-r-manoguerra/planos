/**
 * Contenedor de notificaciones (toasts).
 *
 * Renderiza las notificaciones del store en la esquina inferior derecha.
 * Los errores persisten hasta que el usuario los cierra; el resto se
 * auto-oculta (spec feedback-system-1). La región se anuncia a
 * tecnologías de asistencia vía aria-live.
 */

"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToastStore, type Toast } from "@/stores/toast.store";

const KIND_STYLES: Record<Toast["kind"], string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
};

function ToastIcon({ kind }: { kind: Toast["kind"] }) {
  if (kind === "success") {
    return <CheckCircle2 size={16} aria-hidden="true" />;
  }
  if (kind === "error") {
    return <XCircle size={16} aria-hidden="true" />;
  }
  return <Info size={16} aria-hidden="true" />;
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notificaciones"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 shadow-lg ${KIND_STYLES[toast.kind]}`}
        >
          <span className="mt-0.5 shrink-0">
            <ToastIcon kind={toast.kind} />
          </span>
          <p className="flex-1 text-xs leading-relaxed">{toast.message}</p>
          {toast.kind === "error" && (
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Cerrar notificación"
              className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
