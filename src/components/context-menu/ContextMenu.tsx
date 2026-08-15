/**
 * Menú contextual del editor de planos
 *
 * Se muestra al hacer click derecho sobre elementos del canvas.
 * Semántica WAI-ARIA (menú/menuitem/separador) con navegación por teclado:
 * Flechas arriba/abajo (cíclico), Inicio/Fin, Escape cierra y devuelve el
 * foco al canvas. Se cierra al hacer click fuera.
 */

"use client";

import { useEffect, useRef } from "react";
import { useContextMenuStore } from "@/stores/context-menu.store";
import { ContextMenuItem } from "@/types/context-menu";

function MenuItem({ item }: { item: ContextMenuItem }) {
  if (item.divider) {
    return <div role="separator" className="border-t border-gray-200 my-1" />;
  }

  return (
    <button
      role="menuitem"
      onClick={(e) => {
        e.stopPropagation();
        if (!item.disabled) {
          item.action?.();
          useContextMenuStore.getState().hide();
        }
      }}
      disabled={item.disabled}
      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
        item.danger
          ? "text-red-600 hover:bg-red-50"
          : item.disabled
            ? "text-gray-400 cursor-not-allowed"
            : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {item.icon && <span className="text-base">{item.icon}</span>}
      {item.label}
    </button>
  );
}

export function ContextMenu() {
  const { visible, x, y, items, hide } = useContextMenuStore();
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClick = () => hide();

    if (visible) {
      document.addEventListener("click", handleClick);
    }

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [visible, hide]);

  // Cerrar con Escape desde cualquier foco
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        hide();
      }
    };

    if (visible) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [visible, hide]);

  // Posicionar dentro del viewport y enfocar el primer item habilitado
  useEffect(() => {
    if (!visible || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    if (x + rect.width > viewportW) {
      adjustedX = viewportW - rect.width - 8;
    }
    if (y + rect.height > viewportH) {
      adjustedY = viewportH - rect.height - 8;
    }

    menu.style.left = `${adjustedX}px`;
    menu.style.top = `${adjustedY}px`;

    const firstItem = menu.querySelector<HTMLElement>(
      '[role="menuitem"]:not(:disabled)'
    );
    firstItem?.focus();
  }, [visible, x, y]);

  // Navegación por teclado dentro del menú
  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      hide();
      document.querySelector<HTMLElement>(".plan-canvas")?.focus();
      return;
    }

    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") {
      return;
    }

    e.preventDefault();
    const menu = menuRef.current;
    if (!menu) return;

    const items = Array.from(
      menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')
    );
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    let nextIndex: number;
    if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = items.length - 1;
    } else if (e.key === "ArrowDown") {
      nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % items.length;
    } else {
      nextIndex =
        currentIndex === -1 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
    }

    items[nextIndex].focus();
  };

  if (!visible || items.length === 0) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menú contextual"
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleMenuKeyDown}
    >
      {items.map((item, index) => (
        <MenuItem key={index} item={item} />
      ))}
    </div>
  );
}
