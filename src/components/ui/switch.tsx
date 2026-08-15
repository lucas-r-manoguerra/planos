/**
 * Switch accesible (WAI-ARIA pattern)
 *
 * Es un <button role="switch"> con aria-checked; el estado se controla desde
 * el padre vía `checked`/`onCheckedChange`. Accesible por teclado (Enter y
 * Espacio son nativos de button) y por lectores de pantalla.
 */

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  /** Etiqueta accesible (aria-label) cuando no hay texto visible */
  label?: string;
  className?: string;
}

export function Switch({ checked, onCheckedChange, id, label, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-amber-500" : "bg-gray-300",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
