"use client";

/**
 * Diálogo de gestión de proyectos: crear, renombrar o borrar.
 * Español neutro-profesional (regla INDEX.5).
 */

import { useState, type FormEvent } from "react";

export type ProjectDialogMode = "create" | "rename" | "delete";

interface ProjectDialogProps {
  open: boolean;
  mode: ProjectDialogMode;
  initialName?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const TITLES: Record<ProjectDialogMode, string> = {
  create: "Nuevo proyecto",
  rename: "Renombrar proyecto",
  delete: "Borrar proyecto",
};

const CONFIRM_LABELS: Record<ProjectDialogMode, string> = {
  create: "Crear",
  rename: "Renombrar",
  delete: "Borrar",
};

export function ProjectDialog({
  open,
  mode,
  initialName = "",
  onConfirm,
  onCancel,
}: ProjectDialogProps) {
  const [name, setName] = useState(initialName);

  if (!open) return null;

  const isDelete = mode === "delete";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onConfirm(name.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={TITLES[mode]}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          {TITLES[mode]}
        </h2>

        {isDelete ? (
          <>
            <p className="mb-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              Se borrará el proyecto <strong>{initialName}</strong> y el editor se
              reiniciará. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onConfirm("")}
                className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                {CONFIRM_LABELS[mode]}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <label
              htmlFor="project-name-input"
              className="mb-1 block text-xs text-gray-600 dark:text-gray-300"
            >
              Nombre del proyecto
            </label>
            <input
              id="project-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Ej: Casa en Palermo"
              className="mb-3 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={name.trim().length === 0}
                className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {CONFIRM_LABELS[mode]}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
