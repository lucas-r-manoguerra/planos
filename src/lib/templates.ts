/**
 * Plantillas predefinidas de distribución de pisos
 *
 * Cada plantilla define una colección de habitaciones con posiciones relativas
 * al terreno (en porcentaje de 0-1). Las dimensiones son fijas en cm.
 */

import { Room, RoomType } from "@/types/plan";

export interface FloorTemplate {
  id: string;
  name: string;
  description: string;
  rooms: Omit<Room, "id" | "x" | "y">[];
}

export const FLOOR_TEMPLATES: FloorTemplate[] = [
  {
    id: "casa-2dorm",
    name: "Casa 2 Dormitorios",
    description: "Planta típica: 2 dormitorios, baño, cocina, estar-comedor",
    rooms: [
      { label: "Dormitorio 1", type: RoomType.DORMITORIO, width: 350, height: 300, color: "#e8f4e8" },
      { label: "Dormitorio 2", type: RoomType.DORMITORIO, width: 300, height: 300, color: "#e8f4e8" },
      { label: "Baño", type: RoomType.BAÑO, width: 150, height: 200, color: "#e8e8f4" },
      { label: "Cocina", type: RoomType.COCINA, width: 250, height: 250, color: "#f4e8e8" },
      { label: "Estar-Comedor", type: RoomType.ESTAR_COMEDOR, width: 400, height: 350, color: "#f4f4e8" },
      { label: "Pasillo", type: RoomType.PASILLO, width: 100, height: 400, color: "#e8f4f4" },
    ],
  },
  {
    id: "depto-2amb",
    name: "Departamento 2 Ambientes",
    description: "Dormitorio, estar-comedor-cocina, baño",
    rooms: [
      { label: "Dormitorio", type: RoomType.DORMITORIO, width: 350, height: 300, color: "#e8f4e8" },
      { label: "Estar-Comedor", type: RoomType.ESTAR_COMEDOR, width: 400, height: 350, color: "#f4f4e8" },
      { label: "Cocina", type: RoomType.COCINA, width: 200, height: 200, color: "#f4e8e8" },
      { label: "Baño", type: RoomType.BAÑO, width: 150, height: 200, color: "#e8e8f4" },
    ],
  },
  {
    id: "casa-3dorm",
    name: "Casa 3 Dormitorios",
    description: "3 dormitorios, 2 baños, cocina, estar-comedor, lavadero",
    rooms: [
      { label: "Dormitorio 1", type: RoomType.DORMITORIO, width: 350, height: 350, color: "#e8f4e8" },
      { label: "Dormitorio 2", type: RoomType.DORMITORIO, width: 300, height: 300, color: "#e8f4e8" },
      { label: "Dormitorio 3", type: RoomType.DORMITORIO, width: 280, height: 280, color: "#e8f4e8" },
      { label: "Baño Principal", type: RoomType.BAÑO, width: 200, height: 200, color: "#e8e8f4" },
      { label: "Baño Servicio", type: RoomType.BAÑO, width: 150, height: 150, color: "#e8e8f4" },
      { label: "Cocina", type: RoomType.COCINA, width: 250, height: 300, color: "#f4e8e8" },
      { label: "Estar-Comedor", type: RoomType.ESTAR_COMEDOR, width: 450, height: 400, color: "#f4f4e8" },
      { label: "Lavadero", type: RoomType.LAVADERO, width: 150, height: 200, color: "#f4e8f4" },
    ],
  },
  {
    id: "monoambiente",
    name: "Monoambiente",
    description: "Ambiente único con baño y cocina integrada",
    rooms: [
      { label: "Ambiente Principal", type: RoomType.ESTAR_COMEDOR, width: 400, height: 350, color: "#f4f4e8" },
      { label: "Cocina", type: RoomType.COCINA, width: 200, height: 200, color: "#f4e8e8" },
      { label: "Baño", type: RoomType.BAÑO, width: 150, height: 180, color: "#e8e8f4" },
    ],
  },
];

// Helper to position rooms in a grid layout within the terrain.
// Pure: no ids, no store access — shared by the template preview
// (spec template-confirm-1) and by applyTemplate.
export function layoutTemplateRooms(
  template: FloorTemplate,
  terrainWidth: number,
  terrainHeight: number
): Omit<Room, "id">[] {
  const rooms = template.rooms;
  const count = rooms.length;

  // Calculate grid layout (columns x rows)
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const cellWidth = terrainWidth / cols;
  const cellHeight = terrainHeight / rows;

  return rooms.map((room, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    // Center the room in its cell
    const x = Math.round(col * cellWidth + (cellWidth - room.width) / 2);
    const y = Math.round(row * cellHeight + (cellHeight - room.height) / 2);

    // Clamp to terrain bounds
    const clampedX = Math.max(0, Math.min(x, terrainWidth - room.width));
    const clampedY = Math.max(0, Math.min(y, terrainHeight - room.height));

    return {
      ...room,
      x: clampedX,
      y: clampedY,
    };
  });
}

// Applies a template, assigning fresh ids to each room.
export function applyTemplate(
  template: FloorTemplate,
  terrainWidth: number,
  terrainHeight: number
): Room[] {
  return layoutTemplateRooms(template, terrainWidth, terrainHeight).map(
    (room) => ({ ...room, id: crypto.randomUUID() })
  );
}
