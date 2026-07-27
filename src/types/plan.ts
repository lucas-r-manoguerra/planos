/**
 * Tipos y enumeraciones para el sistema de planos de construcción
 * 
 * Sistema de coordenadas: 1 unidad = 1 centímetro
 * Todas las medidas están en centímetros (cm)
 */

// Enumeración de tipos de habitaciones permitidos
export enum RoomType {
  DORMITORIO = "Dormitorio",
  COCINA = "Cocina",
  BAÑO = "Baño",
  ESTAR_COMEDOR = "Estar-Comedor",
  LAVADERO = "Lavadero",
  PASILLO = "Pasillo",
}

// Interfaz para puntos en el espacio bidimensional
export interface Point {
  x: number; // Coordenada X en centímetros
  y: number; // Coordenada Y en centímetros
}

// Interfaz para dimensiones (ancho y alto)
export interface Size {
  width: number;  // Ancho en centímetros
  height: number; // Alto en centímetros
}

// Interfaz para rectángulo delimitador
export interface BoundingBox {
  x: number;      // Posición X en centímetros
  y: number;      // Posición Y en centímetros
  width: number;  // Ancho en centímetros
  height: number; // Alto en centímetros
}

// Interfaz para una habitación del plano
export interface Room {
  id: string;           // Identificador único (crypto.randomUUID())
  label: string;        // Nombre de la habitación (ej: "Dormitorio 1")
  type: RoomType;       // Tipo de habitación
  x: number;            // Posición X en centímetros desde origen del terreno
  y: number;            // Posición Y en centímetros desde origen del terreno
  width: number;        // Ancho en centímetros
  height: number;       // Alto en centímetros
  color?: string;       // Color personalizado de la habitación
  opacity?: number;     // 0 a 1, default 1
}

// Interfaz para el terreno (área total disponible)
export interface Terrain {
  width: number;  // Ancho del terreno en centímetros
  height: number; // Alto del terreno en centímetros
  color: string;  // Color del terreno
  backgroundImage?: string; // URL de imagen de textura
  front: "top" | "bottom" | "left" | "right"; // Lado del frente (calle)
}

// Interfaz para una planta del edificio
export interface Floor {
  id: string;
  name: string;
  level: number;
  rooms: Room[];
}

// Interfaz para el estado del canvas
export interface CanvasState {
  zoom: number;         // Nivel de zoom (0.1 a 5.0)
  panX: number;         // Desplazamiento horizontal en centímetros
  panY: number;         // Desplazamiento vertical en centímetros
  gridVisible: boolean; // Si la grilla está visible
  gridSize: number;     // Tamaño de la grilla en centímetros
  activeTool: "select" | "pan"; // Herramienta activa
}

// Interfaz para la tienda de habitaciones (Zustand store)
export interface RoomStore {
  rooms: Room[];        // Lista de habitaciones
  terrain: Terrain;     // Dimensiones del terreno
  
  // Acciones
  addRoom: (room: Omit<Room, "id">) => void;           // Agregar habitación
  removeRoom: (id: string) => void;                     // Eliminar habitación
  moveRoom: (id: string, x: number, y: number) => void; // Mover habitación
  renameRoom: (id: string, label: string) => void;      // Renombrar habitación
  setRoomColor: (id: string, color: string) => void;    // Cambiar color de habitación
  duplicateRoom: (id: string) => void;                  // Duplicar habitación
  updateRoomDimensions: (id: string, width: number, height: number) => void; // Editar dimensiones
  updateTerrain: (width: number, height: number) => void; // Actualizar terreno
  setTerrainColor: (color: string) => void;             // Actualizar color del terreno
  setTerrainImage: (image: string | undefined) => void; // Actualizar imagen del terreno
  setTerrainFront: (front: "top" | "bottom" | "left" | "right") => void; // Actualizar frente
}
