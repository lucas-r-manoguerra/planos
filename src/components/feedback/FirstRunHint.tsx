/**
 * Pista de primer uso.
 *
 * Se muestra una sola vez al abrir el editor; el cierre queda persistido en
 * localStorage para que no reaparezca en visitas posteriores
 * (spec feedback-system-3).
 */

"use client";

import { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";

const HINT_DISMISSED_KEY = "planos:first-run-hint-dismissed";

export function FirstRunHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // SSR-safe: el estado inicial es false; se activa solo en el cliente.
    // Diferido un tick para evitar setState síncrono dentro del effect
    // (regla react-hooks/set-state-in-effect).
    const id = window.setTimeout(() => {
      if (localStorage.getItem(HINT_DISMISSED_KEY) !== "1") {
        setVisible(true);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const dismiss = () => {
    localStorage.setItem(HINT_DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="note"
      className="fixed bottom-4 left-1/2 z-[60] w-[min(92vw,26rem)] -translate-x-1/2 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-lg dark:border-blue-800 dark:bg-blue-950"
    >
      <div className="flex items-start gap-2">
        <Lightbulb
          size={16}
          className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-300"
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">
            Bienvenido a Planos
          </p>
          <p className="mt-1 text-xs leading-relaxed text-blue-700 dark:text-blue-300">
            Para comenzar, agregue una habitación en el panel lateral, ajuste el
            terreno y coloque muebles desde el catálogo.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Cerrar sugerencia"
          className="shrink-0 rounded p-0.5 text-blue-600 opacity-70 transition-opacity hover:opacity-100 dark:text-blue-300"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <button
        onClick={dismiss}
        className="mt-2 w-full rounded border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
      >
        Entendido
      </button>
    </div>
  );
}
