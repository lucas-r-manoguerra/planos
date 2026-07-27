/**
 * Algoritmo NOAA simplificado para posición solar
 *
 * Calcula azimuth y elevación del sol para una ubicación y fecha/hora dadas.
 * Basado en la aproximación NOAA Solar Calculator (Spencer, 1971).
 *
 * Fuentes:
 *   - NOAA Solar Calculator: https://gml.noaa.gov/grad/solcalc/
 *   - NOAA Solar Position Algorithm (SPA)
 */

/**
 * Calcula el número de día del año (1-365/366)
 * @param date - Fecha en formato YYYY-MM-DD
 */
export function getDayOfYear(date: string): number {
  const d = new Date(date + "T00:00:00Z");
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000) + 1;
}

/**
 * Obtiene la posición del sol (azimuth y elevación) para una ubicación y momento dado
 * @param latitude  - Latitud en grados decimales (negativo = sur)
 * @param longitude - Longitud en grados decimales (negativo = oeste)
 * @param date      - Fecha en formato YYYY-MM-DD
 * @param time      - Hora solar en formato decimal (12.5 = 12:30)
 * @returns Objeto con azimuth (grados desde Norte, sentido horario) y elevation (grados sobre el horizonte)
 */
export function getSunPosition(
  latitude: number,
  longitude: number,
  date: string,
  time: number
): { azimuth: number; elevation: number } {
  const n = getDayOfYear(date);

  // Declinación solar (δ) en grados
  const declination =
    23.45 * Math.sin(((360 / 365) * (284 + n) * Math.PI) / 180);

  // Ángulo B (ecuación del tiempo) en grados
  const B = ((360 / 365) * (n - 81) * Math.PI) / 180;

  // Ecuación del tiempo (ET) en minutos
  const ET =
    9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  // Meridiano de la zona horaria (para UTC-3: -45°)
  const tzOffset = getTimezoneOffset(date);
  const tzMeridian = tzOffset * 15;

  // Hora solar en horas decimales
  const solarTime = time + ET / 60 + (longitude - tzMeridian) / 15;

  // Ángulo horario (H) en grados
  const hourAngle = 15 * (solarTime - 12);

  // Convertir a radianes para cálculos trigonométricos
  const latRad = (latitude * Math.PI) / 180;
  const decRad = (declination * Math.PI) / 180;
  const haRad = (hourAngle * Math.PI) / 180;

  // Coseno del ángulo cenital (z)
  const cosZenith =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);

  // Ángulo cenital限制 a [-1, 1] para evitar errores de dominio en acos
  const zenithAngle = Math.acos(Math.max(-1, Math.min(1, cosZenith)));

  // Elevación solar en grados
  const elevation = 90 - (zenithAngle * 180) / Math.PI;

  // Azimuth solar en grados (desde Norte, sentido horario)
  const azimuth =
    (Math.atan2(
      -Math.cos(decRad) * Math.sin(haRad),
      Math.sin(decRad) * Math.cos(latRad) -
        Math.cos(decRad) * Math.sin(latRad) * Math.cos(haRad)
    ) *
      180) /
    Math.PI;

  // Normalizar azimuth a [0, 360)
  const normalizedAzimuth = ((azimuth + 360) % 360);

  return {
    azimuth: normalizedAzimuth,
    elevation: Math.round(elevation * 100) / 100,
  };
}

/**
 * Calcula la hora del amanecer en formato decimal
 * @param latitude  - Latitud en grados decimales
 * @param longitude - Longitud en grados decimales
 * @param date      - Fecha en formato YYYY-MM-DD
 * @returns Hora decimal del amanecer (ej: 6.5 = 06:30)
 */
export function getSunriseTime(
  latitude: number,
  longitude: number,
  date: string
): number {
  const n = getDayOfYear(date);
  const declination =
    23.45 * Math.sin(((360 / 365) * (284 + n) * Math.PI) / 180);
  const declRad = (declination * Math.PI) / 180;
  const latRad = (latitude * Math.PI) / 180;

  // Ángulo horario del amanecer (elevación = -0.833° para refracción)
  const cosHaRise =
    (-Math.sin(-0.833 * Math.PI / 180) - Math.sin(latRad) * Math.sin(declRad)) /
    (Math.cos(latRad) * Math.cos(declRad));

  // El sol no sale en días extremos
  if (cosHaRise < -1 || cosHaRise > 1) return 0;

  const haRise = (Math.acos(cosHaRise) * 180) / Math.PI;

  const B = ((360 / 365) * (n - 81) * Math.PI) / 180;
  const ET = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  const tzOffset = getTimezoneOffset(date);
  const tzMeridian = tzOffset * 15;

  const solarNoon = 12 - ET / 60 - (longitude - tzMeridian) / 15;

  return Math.round((solarNoon - haRise / 15) * 100) / 100;
}

/**
 * Calcula la hora del atardecer en formato decimal
 * @param latitude  - Latitud en grados decimales
 * @param longitude - Longitud en grados decimales
 * @param date      - Fecha en formato YYYY-MM-DD
 * @returns Hora decimal del atardecer (ej: 18.75 = 18:45)
 */
export function getSunsetTime(
  latitude: number,
  longitude: number,
  date: string
): number {
  const n = getDayOfYear(date);
  const declination =
    23.45 * Math.sin(((360 / 365) * (284 + n) * Math.PI) / 180);
  const declRad = (declination * Math.PI) / 180;
  const latRad = (latitude * Math.PI) / 180;

  const cosHaSet =
    (-Math.sin(-0.833 * Math.PI / 180) - Math.sin(latRad) * Math.sin(declRad)) /
    (Math.cos(latRad) * Math.cos(declRad));

  if (cosHaSet < -1 || cosHaSet > 1) return 24;

  const haSet = (Math.acos(cosHaSet) * 180) / Math.PI;

  const B = ((360 / 365) * (n - 81) * Math.PI) / 180;
  const ET = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  const tzOffset = getTimezoneOffset(date);
  const tzMeridian = tzOffset * 15;

  const solarNoon = 12 - ET / 60 - (longitude - tzMeridian) / 15;

  return Math.round((solarNoon + haSet / 15) * 100) / 100;
}

/**
 * Obtiene el offset de la zona horaria en horas para una fecha dada
 * Calcula el offset real (con horario de verano si aplica)
 * @param date - Fecha en formato YYYY-MM-DD
 * @returns Offset en horas desde UTC (ej: -3 para Argentina)
 */
function getTimezoneOffset(date: string): number {
  // Crear fechas en UTC y en la zona horaria local para detectar el offset
  const d = new Date(date + "T12:00:00Z");
  const utcStr = d.toLocaleString("en-US", { timeZone: "UTC" });
  const localStr = d.toLocaleString("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const utcDate = new Date(utcStr);
  const localDate = new Date(localStr);

  return (utcDate.getTime() - localDate.getTime()) / 3_600_000;
}
