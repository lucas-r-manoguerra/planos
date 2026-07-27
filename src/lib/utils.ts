/**
 * Funciones de utilidad para el sistema de planos
 * 
 * Todas las funciones trabajan con el sistema de coordenadas en centímetros
 */

import { type ClassValue, clsx } from "clsx";
import { Room, Terrain } from "@/types/plan";

// Función para combinar clases CSS (utility de shadcn/ui)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Generar ID único para elementos
export function generateId(): string {
  return crypto.randomUUID();
}

// Limitar un valor entre un mínimo y máximo
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Redondear valor al punto de grilla más cercano
// Ejemplo: snapToGrid(105, 10) = 110, snapToGrid(95, 10) = 100
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

// Calcular distancia entre dos puntos
export function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

// Convertir centímetros a formato de visualización (metros)
// Ejemplo: cmToDisplay(1200) = "12.00m"
export function cmToDisplay(cm: number): string {
  return `${(cm / 100).toFixed(2)}m`;
}

// Formatear dimensiones para mostrar en UI
// Ejemplo: formatDimensions(300, 400) = "300×400 cm"
export function formatDimensions(width: number, height: number): string {
  return `${width}×${height} cm`;
}

// Obtener rectángulo delimitador
export function getBoundingBox(
  x: number,
  y: number,
  width: number,
  height: number
) {
  return { x, y, width, height };
}

// Verificar si dos rectángulos se superponen
export function doBoundingBoxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Limitar posición de una habitación dentro del terreno
// Magnetiza a bordes del terreno y a otras habitaciones cercanas
export function clampPosition(
  x: number,
  y: number,
  room: Room,
  terrain: Terrain,
  snapDistance: number = 25,
  otherRooms: Room[] = []
): { x: number; y: number } {
  // Allow slight overflow for snap range
  const extendedMin = -snapDistance;
  const extendedMaxX = terrain.width - room.width + snapDistance;
  const extendedMaxY = terrain.height - room.height + snapDistance;

  let rawX = Math.max(extendedMin, Math.min(x, extendedMaxX));
  let rawY = Math.max(extendedMin, Math.min(y, extendedMaxY));

  let snapX = rawX;
  let snapY = rawY;

  // --- Terrain edge snapping: find CLOSEST edge ---
  const terrainEdgesX = [0, terrain.width - room.width];
  const terrainEdgesY = [0, terrain.height - room.height];

  let bestDistX = snapDistance;
  for (const edge of terrainEdgesX) {
    const dist = Math.abs(rawX - edge);
    if (dist < bestDistX) {
      bestDistX = dist;
      snapX = edge;
    }
  }

  let bestDistY = snapDistance;
  for (const edge of terrainEdgesY) {
    const dist = Math.abs(rawY - edge);
    if (dist < bestDistY) {
      bestDistY = dist;
      snapY = edge;
    }
  }

  // --- Room-to-room edge snapping: find CLOSEST alignment ---
  for (const other of otherRooms) {
    if (other.id === room.id) continue;

    // X axis
    const otherEdgesX = [other.x, other.x + other.width];
    const roomEdgesX = [snapX, snapX + room.width];

    let bestRoomEdgeIdx = -1;
    let bestOtherEdgeX = 0;
    let bestDistRoomX = snapDistance;

    for (const otherEdge of otherEdgesX) {
      for (let i = 0; i < roomEdgesX.length; i++) {
        const dist = Math.abs(roomEdgesX[i] - otherEdge);
        if (dist < bestDistRoomX) {
          bestDistRoomX = dist;
          bestRoomEdgeIdx = i;
          bestOtherEdgeX = otherEdge;
        }
      }
    }

    if (bestRoomEdgeIdx !== -1) {
      snapX = bestRoomEdgeIdx === 0 ? bestOtherEdgeX : bestOtherEdgeX - room.width;
    }

    // Y axis
    const otherEdgesY = [other.y, other.y + other.height];
    const roomEdgesY = [snapY, snapY + room.height];

    let bestRoomEdgeIdxY = -1;
    let bestOtherEdgeY = 0;
    let bestDistRoomY = snapDistance;

    for (const otherEdge of otherEdgesY) {
      for (let i = 0; i < roomEdgesY.length; i++) {
        const dist = Math.abs(roomEdgesY[i] - otherEdge);
        if (dist < bestDistRoomY) {
          bestDistRoomY = dist;
          bestRoomEdgeIdxY = i;
          bestOtherEdgeY = otherEdge;
        }
      }
    }

    if (bestRoomEdgeIdxY !== -1) {
      snapY = bestRoomEdgeIdxY === 0 ? bestOtherEdgeY : bestOtherEdgeY - room.height;
    }
  }

  // Final clamp within terrain bounds
  const finalX = Math.max(0, Math.min(snapX, terrain.width - room.width));
  const finalY = Math.max(0, Math.min(snapY, terrain.height - room.height));

  return { x: finalX, y: finalY };
}

/**
 * Semi-magnetismo para fusión de paredes.
 * Cuando dos habitaciones están a menos de `threshold` cm de compartir borde,
 * alinea ese borde exactamente.
 * Se aplica DESPUÉS del clampPosition principal.
 */
export function applyWallMergeSnap(
  x: number,
  y: number,
  room: Room,
  otherRooms: Room[],
  threshold: number = 5
): { x: number; y: number } {
  let snapX = x;
  let snapY = y;

  for (const other of otherRooms) {
    if (other.id === room.id) continue;

    // --- Eje X: bordes verticales ---
    const myEdgesX = [snapX, snapX + room.width];
    const otherEdgesX = [other.x, other.x + other.width];

    let bestDistX = threshold;
    let bestSnapX = snapX;

    for (const myEdge of myEdgesX) {
      for (const otherEdge of otherEdgesX) {
        const dist = Math.abs(myEdge - otherEdge);
        if (dist < bestDistX) {
          bestDistX = dist;
          // Snap: move room so this edge aligns
          const myEdgeIdx = myEdge === snapX ? 0 : 1;
          bestSnapX = myEdgeIdx === 0 ? otherEdge : otherEdge - room.width;
        }
      }
    }

    if (bestDistX < threshold) {
      snapX = bestSnapX;
    }

    // --- Eje Y: bordes horizontales ---
    const myEdgesY = [snapY, snapY + room.height];
    const otherEdgesY = [other.y, other.y + other.height];

    let bestDistY = threshold;
    let bestSnapY = snapY;

    for (const myEdge of myEdgesY) {
      for (const otherEdge of otherEdgesY) {
        const dist = Math.abs(myEdge - otherEdge);
        if (dist < bestDistY) {
          bestDistY = dist;
          const myEdgeIdx = myEdge === snapY ? 0 : 1;
          bestSnapY = myEdgeIdx === 0 ? otherEdge : otherEdge - room.height;
        }
      }
    }

    if (bestDistY < threshold) {
      snapY = bestSnapY;
    }
  }

  return { x: snapX, y: snapY };
}

// Función debounce para optimizar eventos frecuentes
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
