/**
 * Proveedor del menú contextual
 *
 * Envuelve la aplicación y genera los items del menú
 * según el elemento clickeado (habitación, terreno, o espacio vacío).
 * Se conecta a los stores para ejecutar acciones.
 */

"use client";

import { ReactNode } from "react";
import { ContextMenu } from "./ContextMenu";

interface ContextMenuProviderProps {
  children: ReactNode;
}

export function ContextMenuProvider({ children }: ContextMenuProviderProps) {
  return (
    <>
      {children}
      <ContextMenu />
    </>
  );
}
