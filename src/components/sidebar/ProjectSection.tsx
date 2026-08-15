"use client";

/**
 * Gestión de proyectos (persistencia v3).
 *
 * Lista los proyectos, cambia el activo, crea/renombra/borra, importa y
 * exporta snapshots JSON. SSR-safe: no lee localStorage en el primer
 * render (ready flag + useEffect, regla de hidratación).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FolderUp, Pencil, Save, Trash2 } from "lucide-react";
import { useToastStore } from "@/stores/toast.store";
import { applyProjectData, collectEditorState } from "@/hooks/useEditorLifecycle";
import {
  buildProjectData,
  createProject,
  deleteProject,
  downloadProjectJSON,
  ensureActiveProject,
  getActiveProjectId,
  importProjectJSON,
  listProjects,
  loadActiveProject,
  loadProjectById,
  renameProject,
  saveActiveProject,
  switchProject,
  type ProjectIndexEntry,
} from "@/lib/storage";
import { ProjectDialog, type ProjectDialogMode } from "./ProjectDialog";

export function ProjectSection() {
  const [projects, setProjects] = useState<ProjectIndexEntry[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [dialog, setDialog] = useState<ProjectDialogMode | null>(null);
  const [dialogNonce, setDialogNonce] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const push = useToastStore((s) => s.push);

  const openDialog = (mode: ProjectDialogMode) => {
    setDialog(mode);
    setDialogNonce((n) => n + 1);
  };

  const refresh = useCallback(() => {
    ensureActiveProject();
    setProjects(listProjects());
    setActiveProjectId(getActiveProjectId());
  }, []);

  useEffect(() => {
    // Sincroniza con el sistema externo (localStorage) y luego notifica.
    // Diferido un tick para evitar setState síncrono dentro del effect
    // (regla react-hooks/set-state-in-effect).
    const id = window.setTimeout(() => {
      refresh();
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [refresh]);

  if (!ready) return null;

  const active = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  const handleSwitch = (id: string) => {
    if (id === activeProjectId || !active) return;
    saveActiveProject(collectEditorState());
    if (!switchProject(id)) return;
    const data = loadProjectById(id);
    if (data) applyProjectData(data);
    refresh();
  };

  const handleSave = () => {
    saveActiveProject(collectEditorState());
    push("success", "Proyecto guardado");
    refresh();
  };

  const handleCreate = (name: string) => {
    if (!name) return;
    createProject(name);
    push("success", `Proyecto "${name}" creado`);
    refresh();
  };

  const handleRename = (name: string) => {
    if (!name || !active) return;
    renameProject(active.id, name);
    push("success", "Proyecto renombrado");
    refresh();
  };

  const handleDelete = () => {
    if (!active) return;
    deleteProject(active.id);
    refresh();
    const data = loadActiveProject();
    if (data) applyProjectData(data);
    push("info", `Proyecto "${active.name}" borrado`);
  };

  const handleImport = async (file: File) => {
    const raw = await file.text();
    const result = importProjectJSON(raw);
    if (!result.ok) {
      push("error", result.error);
      return;
    }
    applyProjectData(result.project);
    push("success", `Proyecto "${result.project.name}" importado`);
    refresh();
  };

  const handleExport = () => {
    if (!active) return;
    const data = buildProjectData(collectEditorState(), active.name);
    downloadProjectJSON(data);
    push("success", "Proyecto exportado");
  };

  return (
    <section
      aria-label="Proyectos"
      className="border-b border-gray-100 px-4 py-3"
    >
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Proyectos
      </h2>

      {projects.length === 0 ? (
        <p className="mb-3 text-xs text-gray-500">
          No hay proyectos todavía. Crea el primero para empezar.
        </p>
      ) : (
        <ul className="mb-2 space-y-1">
          {projects.map((p) => {
            const isActive = p.id === activeProjectId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => handleSwitch(p.id)}
                  aria-current={isActive ? "true" : undefined}
                  title={isActive ? "Proyecto activo" : `Cambiar a "${p.name}"`}
                  className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {isActive && (
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      Activo
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={!active}
          title="Guardar ahora"
          className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <Save size={12} aria-hidden="true" />
          Guardar
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={!active}
          title="Exportar proyecto como JSON"
          className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <Download size={12} aria-hidden="true" />
          Exportar
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Importar proyecto desde JSON"
          className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <FolderUp size={12} aria-hidden="true" />
          Importar
        </button>
        <button
          type="button"
          onClick={() => openDialog("create")}
          title="Nuevo proyecto"
          className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <Pencil size={12} aria-hidden="true" />
          Nuevo
        </button>
        {active && (
          <>
            <button
              type="button"
              onClick={() => openDialog("rename")}
              title="Renombrar proyecto"
              className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Renombrar
            </button>
            <button
              type="button"
              onClick={() => openDialog("delete")}
              title="Borrar proyecto"
              className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 dark:border-gray-600 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 size={12} aria-hidden="true" />
              Borrar
            </button>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImport(file);
          e.target.value = "";
        }}
      />

      <ProjectDialog
        key={dialogNonce}
        open={dialog !== null}
        mode={dialog ?? "create"}
        initialName={active?.name ?? ""}
        onConfirm={(name) => {
          if (dialog === "create") handleCreate(name);
          else if (dialog === "rename") handleRename(name);
          else handleDelete();
          setDialog(null);
        }}
        onCancel={() => setDialog(null)}
      />
    </section>
  );
}
