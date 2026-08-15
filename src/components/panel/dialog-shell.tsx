/**
 * Shell de diálogo modal accesible (WAI-ARIA dialog pattern)
 *
 * - role="dialog" + aria-modal + aria-label
 * - Foco inicial en el diálogo y restauración del foco al cerrar
 * - Trap de foco con Tab/Shift+Tab (cíclico)
 * - Cierre con Escape o click en el backdrop
 */

"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface DialogShellProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function DialogShell({ open, title, onClose, children }: DialogShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Foco inicial en el diálogo y restauración del foco al cerrar
  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const timer = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      const restore = previouslyFocusedRef.current;
      if (restore && document.contains(restore)) {
        restore.focus();
      } else {
        document.querySelector<HTMLElement>(".plan-canvas")?.focus();
      }
    };
  }, [open]);

  // Escape cierra; Tab/Shift+Tab quedan atrapados dentro del diálogo
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onMouseDown={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative z-10 flex max-h-[90vh] w-full max-w-[min(90vw,480px)] flex-col overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl focus:outline-none dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="sticky top-0 flex items-center justify-between rounded-t-xl border-b border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {title}
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label="Cerrar panel de propiedades"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 p-4">{children}</div>
      </div>
    </div>
  );
}
