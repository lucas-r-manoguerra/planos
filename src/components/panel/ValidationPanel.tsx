/**
 * Panel lateral de validación normativa
 *
 * Muestra todas las violaciones detectadas agrupadas por categoría.
 * Se toggla via overlays.validationPanel del validation store.
 * Click en una violación selecciona la habitación en el canvas.
 */

"use client";

import { useMemo } from "react";
import { useValidationStore } from "@/stores/validation.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useFloorsStore } from "@/stores/floors.store";
import { X, AlertTriangle } from "lucide-react";
import type { Violation, ViolationCategory } from "@/types/plan";

const CATEGORY_META: Record<
  ViolationCategory,
  { emoji: string; label: string }
> = {
  dimensions: { emoji: "📐", label: "Dimensiones" },
  lighting: { emoji: "💡", label: "Iluminación" },
  safety: { emoji: "🔒", label: "Seguridad" },
  structural: { emoji: "🏗️", label: "Estructural" },
  circulation: { emoji: "🚶", label: "Circulación" },
};

const SEVERITY_ICON: Record<string, string> = {
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
};

function ViolationItem({
  violation,
  roomLabel,
}: {
  violation: Violation;
  roomLabel?: string;
}) {
  const select = useSelectionStore((s) => s.select);

  const handleClick = () => {
    if (violation.roomId) {
      select(violation.roomId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left rounded-lg border border-gray-100 p-2.5 transition-colors ${
        violation.roomId
          ? "hover:bg-blue-50 hover:border-blue-200 cursor-pointer"
          : "cursor-default"
      } dark:border-gray-700 dark:hover:bg-gray-800`}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-sm">
          {SEVERITY_ICON[violation.severity]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {roomLabel && (
              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {roomLabel}
              </span>
            )}
            <span className="text-xs text-gray-700 dark:text-gray-200">
              {violation.message}
            </span>
          </div>
          <span className="mt-0.5 block text-[10px] text-gray-400 dark:text-gray-500">
            {violation.normativeRef}
          </span>
        </div>
      </div>
    </button>
  );
}

export function ValidationPanel() {
  const violations = useValidationStore((s) => s.violations);
  const isOpen = useValidationStore((s) => s.overlays.validationPanel);
  const togglePanel = useValidationStore((s) => s.toggleOverlay);
  const errorCount = useValidationStore((s) => s.getErrorCount());
  const warningCount = useValidationStore((s) => s.getWarningCount());

  const floors = useFloorsStore((s) => s.floors);

  const roomLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const floor of floors) {
      for (const room of floor.rooms) {
        map.set(room.id, room.label);
      }
    }
    return map;
  }, [floors]);

  const grouped = useMemo(() => {
    const groups = new Map<ViolationCategory, Violation[]>();
    for (const v of violations) {
      const list = groups.get(v.category);
      if (list) {
        list.push(v);
      } else {
        groups.set(v.category, [v]);
      }
    }
    return groups;
  }, [violations]);

  const totalIssues = errorCount + warningCount;

  return (
    <>
      {/* Toggle button — fixed bottom-right */}
      <button
        type="button"
        onClick={() => togglePanel("validationPanel")}
        className={`fixed bottom-4 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-colors ${
          isOpen
            ? "border-blue-300 bg-blue-100 text-blue-700"
            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        }`}
        title="Validación normativa"
        aria-label={isOpen ? "Cerrar validación normativa" : "Abrir validación normativa"}
        aria-pressed={isOpen}
      >
        <AlertTriangle size={18} />
        {totalIssues > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalIssues}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-40 flex w-80 max-h-[calc(100vh-6rem)] flex-col rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Validación Normativa
            </span>
            <button
              type="button"
              onClick={() => togglePanel("validationPanel")}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              aria-label="Cerrar panel de validación"
            >
              <X size={16} />
            </button>
          </div>

          {/* Summary */}
          <div className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
            {violations.length === 0 ? (
              <span>✅ Todo conforme — sin violaciones normativas</span>
            ) : (
              <span>
                {errorCount > 0 && (
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {errorCount} error{errorCount !== 1 ? "es" : ""}
                  </span>
                )}
                {errorCount > 0 && warningCount > 0 && ", "}
                {warningCount > 0 && (
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {warningCount} advertencia{warningCount !== 1 ? "s" : ""}
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Violations list */}
          <div className="flex-1 overflow-y-auto p-3">
            {violations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="text-2xl">✅</span>
                <span className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  Todo conforme — sin violaciones normativas
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from(grouped.entries()).map(([category, items]) => {
                  const meta = CATEGORY_META[category];
                  return (
                    <div key={category}>
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                        <span>{meta.emoji}</span>
                        <span>{meta.label}</span>
                        <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
                          {items.length}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {items.map((v) => (
                          <ViolationItem
                            key={v.id}
                            violation={v}
                            roomLabel={
                              v.roomId
                                ? roomLabelMap.get(v.roomId) ?? "Habitación"
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
