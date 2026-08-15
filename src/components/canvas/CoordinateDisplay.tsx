/**
 * Mostrador de coordenadas del cursor
 *
 * Muestra la posición actual del cursor en centímetros sobre el canvas.
 * Recibe las coordenadas como prop desde el componente padre (PlanCanvas)
 * que las obtiene del evento onMouseMove del Stage.
 */

"use client";

interface CoordinateDisplayProps {
  x: number;
  y: number;
}

export function CoordinateDisplay({ x, y }: CoordinateDisplayProps) {
  return (
    <div
      className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-600 shadow-sm dark:bg-[#1A1B1E]/90 dark:border-gray-700 dark:text-gray-300"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      <span className="text-gray-400 dark:text-gray-500">X:</span> {x} <span className="text-gray-400 dark:text-gray-500">Y:</span> {y} <span className="text-gray-400 dark:text-gray-500">cm</span>
    </div>
  );
}
