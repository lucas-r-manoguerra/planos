/**
 * Cálculo de sombras para la simulación solar
 *
 * Genera vectores de sombra y polígonos de sombra proyectados
 * a partir de la posición del sol y la altura de las habitaciones.
 *
 * Unidades: 1 unidad = 1 cm (consistente con el sistema de coordenadas del plano)
 */

import { Point } from "@/types/plan";

/**
 * Calcula el vector de sombra proyectado por un objeto de altura dada
 * @param azimuth   - Azimuth del sol en grados (desde Norte, sentido horario)
 * @param elevation - Elevación del sol en grados sobre el horizonte
 * @param height    - Altura del objeto en centímetros
 * @returns Vector de sombra {dx, dy} en centímetros desde la base del objeto
 */
export function computeShadowVector(
  azimuth: number,
  elevation: number,
  height: number
): Point {
  // Longitud de la sombra en el suelo (cm)
  const elevationRad = (elevation * Math.PI) / 180;
  const shadowLength = height / Math.tan(elevationRad);

  // Proyectar según azimuth:
  //   - azimuth 0° (Norte): sombra hacia Sur (dy positiva en canvas)
  //   - azimuth 90° (Este): sombra hacia Oeste (dx negativa en canvas)
  //   - azimuth 180° (Sur): sombra hacia Norte (dy negativa)
  //   - azimuth 270° (Oeste): sombra hacia Este (dx positiva)
  const azimuthRad = (azimuth * Math.PI) / 180;
  const dx = -Math.sin(azimuthRad) * shadowLength;
  const dy = Math.cos(azimuthRad) * shadowLength;

  return { x: Math.round(dx * 100) / 100, y: Math.round(dy * 100) / 100 };
}

/**
 * Calcula el polígono de sombra de un rectángulo con un vector de sombra dado
 *
 * Genera los 4 vértices de la sombra proyectada. El rectángulo se define
 * por su esquina superior-izquierda y dimensiones.
 *
 * @param roomX      - Posición X del rectángulo (esquina superior-izquierda)
 * @param roomY      - Posición Y del rectángulo (esquina superior-izquierda)
 * @param roomWidth  - Ancho del rectángulo en centímetros
 * @param roomHeight - Alto del rectángulo en centímetros
 * @param shadowVector - Vector de sombra {x, y} en centímetros
 * @returns Array de puntos que forman el polígono de sombra
 */
export function computeShadowPolygon(
  roomX: number,
  roomY: number,
  roomWidth: number,
  roomHeight: number,
  shadowVector: Point
): Point[] {
  // Esquinas del rectángulo original (sentido horario desde superior-izquierda)
  const corners: Point[] = [
    { x: roomX, y: roomY },                         // superior-izquierda
    { x: roomX + roomWidth, y: roomY },              // superior-derecha
    { x: roomX + roomWidth, y: roomY + roomHeight }, // inferior-derecha
    { x: roomX, y: roomY + roomHeight },             // inferior-izquierda
  ];

  // Desplazar cada esquina por el vector de sombra para obtener las sombras
  const shadowCorners: Point[] = corners.map((c) => ({
    x: Math.round((c.x + shadowVector.x) * 100) / 100,
    y: Math.round((c.y + shadowVector.y) * 100) / 100,
  }));

  // Combinar esquinas originales + sombras y calcular hull envolvente
  const allPoints = [...corners, ...shadowCorners];
  return convexHull(allPoints);
}

/**
 * Calcula el cierre convexo de un conjunto de puntos (algoritmo de Graham)
 *
 * Implementación simple para <= 8 puntos (rectángulo + sombra = 8 puntos).
 *
 * @param points - Array de puntos {x, y}
 * @returns Array de puntos formando el polígono convexo (sentido antihorario)
 */
export function convexHull(points: Point[]): Point[] {
  const n = points.length;
  if (n <= 2) return [...points];

  // Encontrar el punto más abajo-izquierda (pivote)
  let pivotIdx = 0;
  for (let i = 1; i < n; i++) {
    if (
      points[i].y > points[pivotIdx].y ||
      (points[i].y === points[pivotIdx].y && points[i].x < points[pivotIdx].x)
    ) {
      pivotIdx = i;
    }
  }

  // Intercambiar pivote con el primer elemento
  const pts = [...points];
  [pts[0], pts[pivotIdx]] = [pts[pivotIdx], pts[0]];
  const pivot = pts[0];

  // Ordenar el resto por ángulo polar con respecto al pivote
  const sorted = pts.slice(1).sort((a, b) => {
    const cross = crossProduct(pivot, a, b);
    if (Math.abs(cross) < 1e-10) {
      // Misma línea: preferir el más lejano
      const distA = (a.x - pivot.x) ** 2 + (a.y - pivot.y) ** 2;
      const distB = (b.x - pivot.x) ** 2 + (b.y - pivot.y) ** 2;
      return distB - distA;
    }
    return cross > 0 ? -1 : 1;
  });

  // Construir hull usando stack
  const hull: Point[] = [pivot, sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    while (hull.length > 1) {
      const top = hull[hull.length - 1];
      const second = hull[hull.length - 2];
      if (crossProduct(second, top, sorted[i]) <= 0) {
        hull.pop();
      } else {
        break;
      }
    }
    hull.push(sorted[i]);
  }

  return hull;
}

/**
 * Producto cruzado de los vectores OA y OB
 * > 0: giro a la izquierda, < 0: a la derecha, = 0: colineales
 */
function crossProduct(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}
