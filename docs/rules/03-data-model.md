# Regla 03 — Modelo de Datos

> Tipos de dominio, sistema de coordenadas y persistencia. Esta regla define el
> lenguaje del editor de planos.

## Sistema de coordenadas (CONTRATO)

**1 unidad = 1 centímetro.** Todas las medidas del editor están en centímetros (cm).

- `Point { x, y }` — coordenadas en cm desde el origen del terreno.
- `Size { width, height }` — ancho y alto en cm.
- `BoundingBox` — x, y, width, height, todo en cm.
- Ángulos en **grados** (`northAngle`, `rotation`), no radianes.
- El origen del terreno es `(0, 0)` en la esquina superior izquierda.

Nunca mezclar unidades, nunca convertir implícitamente (px ↔ cm) sin pasar por
una función explícita en `src/lib/` con comentario de la conversión.

## Tipos de dominio (`src/types/plan.ts`)

Fuente de verdad del modelo del editor:

- `RoomType` — tipos de habitación permitidos (Dormitorio, Cocina, Baño, ...).
- `Room` — habitación con posición, tamaño, color, snap, paredes.
- `LocationSettings` / `SunSettings` — ubicación geográfica y simulación solar
  (lat/lon en grados decimales, timezone IANA, hora solar decimal: `12.5` = 12:30).
- `Terrain` — terreno: tamaño en cm, color, frente (`top|bottom|left|right`),
  `northAngle` en grados.
- `Floor` — planta con habitaciones.
- `CanvasState` — zoom (0.1 a 5.0), pan en cm, grilla, herramienta activa.
- `Fixture`, `FixtureCatalogItem`, `FixtureCategory`, `FixtureSubtype` —
  mobiliario, plantas, puertas, ventanas, escaleras, baño, vehículos.
  `wallId` / `wallSide` / `wallOffset` para puertas/ventanas ancladas a paredes.

**Reglas:**

1. Si un dato existe en el dominio, tiene su tipo en `plan.ts` — no interfaces
   locales duplicadas.
2. IDs: `crypto.randomUUID()` (string). Nunca números autoincrementales en el cliente.
3. Extender un subtipo (nueva categoría de fixture, nuevo RoomType) es un cambio
   de dominio: actualizar `plan.ts`, el catálogo en `lib/fixtures-catalog.ts` y
   los componentes que lo renderizan, en el mismo PR.
4. Enums de UI en español (`RoomType.DORMITORIO`), identificadores en inglés.

## Persistencia (Prisma 7 + PostgreSQL)

- Schema en `prisma/schema.prisma`; cliente generado en `src/generated/prisma`
  (no editar, se regenera con `bunx prisma generate`).
- Modelos actuales: `Project`, `Floor`, `Room`, `Wall` (proyecto → plantas → habitaciones).
- **Los datos del editor en sesión viven en Zustand** (ver regla 05); Prisma es
  para persistir proyectos/planos entre sesiones.
- Cambios de schema = migración: `bunx prisma migrate dev --name <nombre>`.
- No cambiar `provider = "postgresql"` ni la salida del generator sin aprobación.
- Usar `@map` para tablas en snake_case (patrón existente).
