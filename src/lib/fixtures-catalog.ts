/**
 * Catálogo de muebles, plantas, puertas, ventanas y escaleras
 * 
 * Dimensiones estándar argentinas (cm)
 * Fórmula IRAM para escalones: 2h + w = 60–64 cm
 */

import { FixtureCatalogItem, FixtureCategory, FixtureSubtype } from "@/types/plan";

export const FIXTURE_CATALOG: FixtureCatalogItem[] = [
  // ==================== MUEBLES ====================
  {
    id: "mesa",
    label: "Mesa",
    category: "furniture",
    width: 80,
    height: 80,
    color: "#c9a96e",
    icon: "🪑",
  },
  {
    id: "mesa-comedor",
    label: "Mesa Comedor",
    category: "furniture",
    width: 180,
    height: 90,
    color: "#c9a96e",
    icon: "🍽️",
  },
  {
    id: "silla",
    label: "Silla",
    category: "furniture",
    width: 45,
    height: 45,
    color: "#b8956a",
    icon: "🪑",
  },
  {
    id: "sofa",
    label: "Sofá",
    category: "furniture",
    width: 200,
    height: 90,
    color: "#7c9a7c",
    icon: "🛋️",
  },
  {
    id: "cama-1plaza",
    label: "Cama 1 Plaza",
    category: "furniture",
    width: 100,
    height: 190,
    color: "#a8c4e0",
    icon: "🛏️",
  },
  {
    id: "cama-2plaza",
    label: "Cama 2 Plazas",
    category: "furniture",
    width: 150,
    height: 190,
    color: "#a8c4e0",
    icon: "🛏️",
  },
  {
    id: "cama-sillon",
    label: "Cama Sillón",
    category: "furniture",
    width: 80,
    height: 190,
    color: "#a8c4e0",
    icon: "🛏️",
  },
  {
    id: "mesada",
    label: "Mesada",
    category: "furniture",
    width: 150,
    height: 60,
    color: "#d4c4a8",
    icon: "🍳",
  },
  {
    id: "placard",
    label: "Placard",
    category: "furniture",
    width: 120,
    height: 60,
    color: "#b8a080",
    icon: "🗄️",
  },
  {
    id: "escritorio",
    label: "Escritorio",
    category: "furniture",
    width: 120,
    height: 60,
    color: "#a08060",
    icon: "📝",
  },
  {
    id: "heladera",
    label: "Heladera",
    category: "furniture",
    width: 60,
    height: 70,
    color: "#e0e0e0",
    icon: "🧊",
  },
  {
    id: "estufa",
    label: "Estufa",
    category: "furniture",
    width: 60,
    height: 60,
    color: "#404040",
    icon: "🔥",
  },
  {
    id: "lavarropas",
    label: "Lavarropas",
    category: "furniture",
    width: 60,
    height: 65,
    color: "#d0d0d0",
    icon: "🫧",
  },
  {
    id: "cocina",
    label: "Cocina",
    category: "furniture",
    width: 60,
    height: 60,
    color: "#505050",
    icon: "🍳",
  },

  // ==================== PLANTAS ====================
  {
    id: "maceta-chica",
    label: "Maceta Chica",
    category: "plant",
    width: 25,
    height: 25,
    color: "#6b8e23",
    icon: "🌱",
  },
  {
    id: "maceta-grande",
    label: "Maceta Grande",
    category: "plant",
    width: 50,
    height: 50,
    color: "#228b22",
    icon: "🪴",
  },
  {
    id: "planta-media",
    label: "Planta Media",
    category: "plant",
    width: 40,
    height: 40,
    color: "#32cd32",
    icon: "🌿",
  },
  {
    id: "planta-grande",
    label: "Planta Grande",
    category: "plant",
    width: 80,
    height: 80,
    color: "#006400",
    icon: "🌳",
  },

  // ==================== BAÑO ====================
  {
    id: "ducha",
    label: "Ducha",
    category: "bathroom",
    width: 90,
    height: 90,
    color: "#b0d4f1",
    icon: "🚿",
  },
  {
    id: "banera",
    label: "Bañera",
    category: "bathroom",
    width: 170,
    height: 75,
    color: "#e8f0f8",
    icon: "🛁",
  },
  {
    id: "inodoro",
    label: "Inodoro",
    category: "bathroom",
    width: 40,
    height: 70,
    color: "#f0f0f0",
    icon: "🚽",
  },
  {
    id: "lavamanos",
    label: "Lavamanos",
    category: "bathroom",
    width: 55,
    height: 45,
    color: "#e8e8f0",
    icon: "🧼",
  },

  // ==================== VEHÍCULOS ====================
  {
    id: "auto",
    label: "Auto",
    category: "vehicle",
    width: 180,
    height: 450,
    color: "#4a6fa5",
    icon: "🚗",
  },
  {
    id: "camioneta",
    label: "Camioneta",
    category: "vehicle",
    width: 200,
    height: 530,
    color: "#5a7fa5",
    icon: "🛻",
  },

  // ==================== PUERTAS ====================
  {
    id: "puerta-standard",
    label: "Puerta Standard",
    category: "door",
    width: 80,
    height: 10,
    color: "#8b4513",
    icon: "🚪",
    props: { isOpen: true, openingAngle: 90, openingSide: "right" },
  },
  {
    id: "puerta-americana",
    label: "Puerta Americana",
    category: "door",
    width: 90,
    height: 10,
    color: "#a0522d",
    icon: "🚪",
    props: { isOpen: true, openingAngle: 90, openingSide: "right" },
  },
  {
    id: "puerta-garage",
    label: "Puerta Garage",
    category: "door",
    width: 250,
    height: 10,
    color: "#696969",
    icon: "🚗",
    props: { isOpen: true, openingAngle: 90, openingSide: "right" },
  },
  {
    id: "puerta-corrediza",
    label: "Puerta Corrediza",
    category: "door",
    width: 80,
    height: 10,
    color: "#deb887",
    icon: "🚪",
    props: { isOpen: true, sliding: true },
  },
  {
    id: "puerta-balcon",
    label: "Puerta Balcón",
    category: "door",
    width: 150,
    height: 10,
    color: "#a0522d",
    icon: "🚪",
    props: { isOpen: true, openingAngle: 90, openingSide: "right" },
  },
  {
    id: "puerta-doble",
    label: "Puerta Doble",
    category: "door",
    width: 160,
    height: 10,
    color: "#7c5a33",
    icon: "🚪",
    props: { isOpen: true, openingAngle: 90, openingSide: "right", double: true },
  },

  // ==================== VENTANAS ====================
  {
    id: "ventana-standard",
    label: "Ventana Standard",
    category: "window",
    width: 120,
    height: 10,
    color: "#87ceeb",
    icon: "🪟",
    props: { isOpen: true, openingAngle: 90, openingSide: "right" },
  },
  {
    id: "ventana-corrediza",
    label: "Ventana Corrediza",
    category: "window",
    width: 150,
    height: 10,
    color: "#b0e0e6",
    icon: "🪟",
    props: { isOpen: true, sliding: true },
  },
  {
    id: "ventana-batiente",
    label: "Ventana Batiente",
    category: "window",
    width: 100,
    height: 10,
    color: "#add8e6",
    icon: "🪟",
    props: { isOpen: true, openingAngle: 90, openingSide: "right" },
  },
  {
    id: "ventanal",
    label: "Ventanal",
    category: "window",
    width: 200,
    height: 10,
    color: "#b0e0e6",
    icon: "🪟",
    props: { isOpen: true, openingAngle: 90, openingSide: "right" },
  },
  {
    id: "ventana-fija",
    label: "Ventana Fija",
    category: "window",
    width: 120,
    height: 10,
    color: "#d8eef5",
    icon: "🪟",
    props: { isOpen: false },
  },
  {
    id: "ventana-oscilobatiente",
    label: "Ventana Oscilobatiente",
    category: "window",
    width: 100,
    height: 10,
    color: "#6fa8c8",
    icon: "🪟",
    props: { isOpen: true, openingAngle: 45, openingSide: "right" },
  },

  // ==================== ESCALERAS ====================
  {
    id: "tramo-unico",
    label: "Escalera Tramo Único",
    category: "stair",
    width: 90,
    height: 538,
    color: "#d2b48c",
    icon: "🪜",
    props: {
      stepHeight: 18,
      stepWidth: 28,
      stairWidth: 90,
      floorHeight: 280,
      flights: 1,
      landingWidth: 90,
    },
  },
  {
    id: "dos-tramos",
    label: "Escalera Dos Tramos",
    category: "stair",
    width: 190,
    height: 314,
    color: "#c4a882",
    icon: "🪜",
    props: {
      stepHeight: 18,
      stepWidth: 28,
      stairWidth: 90,
      floorHeight: 280,
      flights: 2,
      separation: 10,
      landingWidth: 90,
    },
  },
];

// Buscar un item del catálogo por ID
export function getCatalogItem(subtype: FixtureSubtype): FixtureCatalogItem | undefined {
  return FIXTURE_CATALOG.find((item) => item.id === subtype);
}

// Obtener items por categoría
export function getCatalogByCategory(category: FixtureCategory): FixtureCatalogItem[] {
  return FIXTURE_CATALOG.filter((item) => item.category === category);
}

// Calcular escalones según norma IRAM
// Fórmula: 2h + w = 60–64 cm
// Geometría: tramos paralelos lado a lado
export function calculateStairs(
  floorHeight: number,
  stepHeight: number,
  stepWidth: number,
  flights: number,
  stairWidth: number = 90,
  separation: number = 10,
  landingWidth: number = 90,
): {
  stepsPerFlight: number;
  totalSteps: number;
  formulaResult: number;
  isCompliant: boolean;
  totalRun: number;
  calculatedWidth: number;
  calculatedHeight: number;
  recommendation: string;
} {
  const formulaResult = 2 * stepHeight + stepWidth;
  const isCompliant = formulaResult >= 60 && formulaResult <= 64;
  
  const totalSteps = Math.ceil(floorHeight / stepHeight);
  const stepsPerFlight = flights === 1 ? totalSteps : Math.ceil(totalSteps / 2);
  const totalRun = stepsPerFlight * stepWidth;

  const calculatedWidth = flights === 2 ? stairWidth * 2 + separation : stairWidth;
  // Alto = desarrollo horizontal total + descanso
  const calculatedHeight = totalRun + landingWidth;

  let recommendation = "";
  if (!isCompliant) {
    const idealWidthMin = 60 - 2 * stepHeight;
    const idealWidthMax = 64 - 2 * stepHeight;
    if (idealWidthMin > 0) {
      recommendation = `Ancho ideal: ${idealWidthMin}–${idealWidthMax} cm (actual: ${stepWidth} cm)`;
    } else {
      recommendation = `Altura de escalón muy alta (${stepHeight} cm). Máximo recomendado: 30 cm`;
    }
  }

  return {
    stepsPerFlight,
    totalSteps,
    formulaResult,
    isCompliant,
    totalRun,
    calculatedWidth,
    calculatedHeight,
    recommendation,
  };
}
