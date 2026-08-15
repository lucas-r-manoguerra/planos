# Regla 04 — Canvas (Konva / react-konva)

> El editor de planos es un canvas Konva. Esta regla define cómo se estructura
> el renderizado del plano.

## Arquitectura de capas

Una capa = un archivo en `src/components/canvas/`. Cada capa dibuja una
responsabilidad sobre el `Stage`:

| Capa | Responsabilidad |
|---|---|
| `GridLayer` | Grilla de fondo (tamaño configurable en cm) |
| `TerrainLayer` | Terreno (tamaño, color, imagen de textura) |
| `RoomLayer` | Habitaciones (rectángulos con paredes) |
| `WallLayer` | Paredes de las habitaciones |
| `FixtureLayer` | Muebles, plantas, puertas, ventanas, escaleras |
| `MeasurementLayer` | Mediciones activas |
| `ShadowLayer` | Sombras proyectadas (simulación solar) |
| `SunArcLayer` | Arco solar |
| `CompassOverlay` / `NorthArrowLayer` | Brújula y Norte (HTML overlay o capa Konva) |
| `CoordinateDisplay` | Coordenadas del cursor |

**Reglas:**

1. **Una capa no dibuja lo de otra.** Si un dato nuevo cruza capas, se coordina
   vía store (regla 05), no dibujando duplicado.
2. Las capas leen el estado desde el store (selectores) — nunca reciben props de
   datos que ya viven en Zustand.
3. El `Stage` (`PlanCanvas.tsx`) solo orquesta capas, zoom y pan: sin lógica de negocio.
4. Coordenadas del canvas = coordenadas del dominio (cm) — ver regla 03. La
   conversión a píxeles la maneja Konva vía escala del Stage.
5. Actualizaciones de shapes: **nunca mutar un shape Konva directamente desde
   fuera de su capa**. Cambiar el estado en el store y dejar que React re-renderice.
6. Capas costosas (ShadowLayer, SunArcLayer) deben evitar re-render innecesario:
   extraer selectores finos y memoizar (ver regla 09).

## Interacción

- Herramientas activas: `select` y `pan` (definidas en `CanvasState.activeTool`).
- El context menu, el snap a bordes del terreno y a otras habitaciones
  (`snapEnabled`) son parte del contrato de interacción: no romperlos al tocar
  una capa.
- Puertas/ventanas se anclan a paredes (`wallId`, `wallSide`, `wallOffset`):
  mover la pared debe mover la abertura.
