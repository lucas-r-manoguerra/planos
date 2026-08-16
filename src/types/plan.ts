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
  snapEnabled?: boolean; // Default: true. Magnetic snap to terrain edges and other rooms
  wallWidth?: number;    // Pared en cm (default: 10). 0 = sin paredes
  enclosed?: boolean;    // true = paredes en los 4 lados. false = abierto
}

// Configuración de ubicación geográfica
export interface LocationSettings {
  latitude: number;   // Latitud en grados decimales
  longitude: number;  // Longitud en grados decimales
  timezone: string;   // Zona horaria IANA (ej: "America/Argentina/Buenos_Aires")
}

// Configuración de simulación solar
export interface SunSettings {
  enabled: boolean;           // Si la simulación está activa
  date: string;               // Fecha en formato YYYY-MM-DD
  time: number;               // Hora solar en formato decimal (12.5 = 12:30)
  location: LocationSettings; // Ubicación geográfica
  floorHeight: number;        // Altura del piso en centímetros
}

// Interfaz para el terreno (área total disponible)
export interface Terrain {
  width: number;  // Ancho del terreno en centímetros
  height: number; // Alto del terreno en centímetros
  color: string;  // Color del terreno
  backgroundImage?: string; // URL de imagen de textura
  front: "top" | "bottom" | "left" | "right"; // Lado del frente (calle)
  northAngle: number; // grados desde Norte (0° = Norte arriba, sentido horario)
}

// Interfaz para una planta del edificio
export interface Floor {
  id: string;
  name: string;
  level: number;
  rooms: Room[];
}

// Interfaz para una pared del plano (entidad persistente, v4)
//
// x1/y1/x2/y2 definen la LÍNEA CENTRAL de la pared en cm. La banda visible
// se dibuja a `thickness / 2` a cada lado de esa línea. `roomId` indica la
// habitación que la generó (pared materializada); ausente = pared libre.
export interface Wall {
  id: string;         // Identificador único (crypto.randomUUID())
  floorId: string;    // Planta a la que pertenece
  x1: number;         // Inicio de la línea central (cm)
  y1: number;         // Inicio de la línea central (cm)
  x2: number;         // Fin de la línea central (cm)
  y2: number;         // Fin de la línea central (cm)
  thickness: number;  // Espesor de la pared en cm (default: 10)
  roomId?: string;    // Habitación que la generó; ausente = pared libre
}

// Modo de visualización del editor (S3: isometrico usa la misma geometría)
export type ViewMode = "2d" | "isometric";

// Interfaz para el estado del canvas
export interface CanvasState {
  zoom: number;         // Nivel de zoom (0.1 a 5.0)
  panX: number;         // Desplazamiento horizontal en centímetros
  panY: number;         // Desplazamiento vertical en centímetros
  gridVisible: boolean; // Si la grilla está visible
  gridSize: number;     // Tamaño de la grilla en centímetros
  activeTool: "select" | "pan" | "wall"; // Herramienta activa
  viewMode: ViewMode;   // Modo de visualización (regla 05: estado de display)
  magnetismEnabled: boolean; // Magnetismo de paredes (snap punto + ángulo, wall-drawing-6)
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

// ==================== FIXTURES (Muebles, Plantas, Puertas, Ventanas, Escaleras) ====================

// Categorías de fixtures
export type FixtureCategory = "furniture" | "plant" | "door" | "window" | "stair" | "bathroom" | "vehicle";

// Subtipos de muebles
export type FurnitureSubtype = 
  | "mesa" | "mesa-comedor" | "silla" | "sofa" | "cama-1plaza" 
  | "cama-2plaza" | "cama-sillon" | "mesada" | "placard" | "escritorio"
  | "banco" | "heladera" | "estufa" | "lavarropas" | "cocina";

// Subtipos de plantas
export type PlantSubtype = "maceta-chica" | "maceta-grande" | "planta-media" | "planta-grande";

// Subtipos de puertas
// S4: puerta-doble = dos hojas espejadas (prop `double: true`, width 160)
export type DoorSubtype = "puerta-standard" | "puerta-americana" | "puerta-garage" | "puerta-corrediza" | "puerta-balcon" | "puerta-doble";

// Subtipos de ventanas
// S4: ventana-fija (props `isOpen: false` → marco fijo); ventana-oscilobatiente (panel a 45°)
export type WindowSubtype = "ventana-standard" | "ventana-corrediza" | "ventana-batiente" | "ventanal" | "ventana-fija" | "ventana-oscilobatiente";

// Subtipos de escaleras
export type StairSubtype = "tramo-unico" | "dos-tramos";

// Subtipos de baño
export type BathroomSubtype = "ducha" | "banera" | "inodoro" | "lavamanos";

// Subtipos de vehículos
export type VehicleSubtype = "auto" | "camioneta";

// Unión de todos los subtipos
export type FixtureSubtype = FurnitureSubtype | PlantSubtype | DoorSubtype | WindowSubtype | StairSubtype | BathroomSubtype | VehicleSubtype;

// Interfaz para un item del catálogo (plantilla)
export interface FixtureCatalogItem {
  id: FixtureSubtype;
  label: string;
  category: FixtureCategory;
  width: number;   // cm
  height: number;  // cm (profundidad en planta)
  color: string;
  icon: string;    // emoji
  // Propiedades específicas por tipo
  props?: Record<string, number | string | boolean>;
}

// Interfaz para un fixture colocado en el canvas
export interface Fixture {
  id: string;
  catalogId: FixtureSubtype;
  label: string;
  category: FixtureCategory;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // grados, 0 = orientación original
  color: string;
  floorId?: string; // Id de la planta a la que pertenece (legacy: undefined → primera planta)
  // Propiedades específicas
  props: Record<string, number | string | boolean>;
  // Para puertas/ventanas: pared anclada
  wallId?: string;      // v4: id de la pared (Wall). v3 legado: id de la habitación
  wallSide?: "top" | "bottom" | "left" | "right"; // qué pared
  wallOffset?: number;  // offset desde el inicio de la pared (cm)
}
