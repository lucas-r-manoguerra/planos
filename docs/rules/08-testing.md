# Regla 08 — Verificación de cambios

> Qué significa "listo" en este repo. La verificación se apoya en lint,
> typecheck, build, tests (vitest) y validación manual del flujo afectado.
> Los tests de lógica pura viven en `tests/*.test.ts` (comando: `bun test`).

## Verificación mínima obligatoria (siempre)

1. `bun lint` — sin errores nuevos (ESLint + next/core-web-vitals + TS rules).
2. `bun build` — build de producción verde.
3. `bunx tsc --noEmit` — typecheck limpio (sin `any` silencioso, regla 02).
4. `bun test` — suite vitest verde (los tests tocados, mínimo).
5. **Validación manual del flujo tocado**: si el cambio es visual (canvas, UI,
   docs), correr `bun dev` y verificar en navegador la interacción afectada
   (zoom, pan, selección, snap, simulación solar, render de docs).

## Para lógica pura (lib/)

- Las funciones deterministas (`solar.ts`, `shadow.ts`, `storage.ts`,
  `wall-utils.ts`, `migrate.ts`, ...) se verifican con tests en `tests/`
  (vitest, `bun test`). Los casos de borde se cubren en los tests: fechas
  límite, zonas horarias, coordenadas extremas, ángulos >360°, migraciones.
- Los scripts ad-hoc (`scripts/*.ts`, `bunx tsx <script>`) siguen disponibles
  para smoke checks rápidos, pero no reemplazan la suite.

## Para el editor (canvas/stores)

- Verificar interacciones que toca el cambio: mover/redimensionar habitaciones,
  snap, anclaje de puertas/ventanas, undo/redo, persistencia de sesión.
- Cambios en la simulación solar: probar con ubicación y fecha conocidas
  (Buenos Aires, mediodía) para validar dirección y longitud de sombras.
- Regresión visual: que ninguna capa existente se rompa o deje de renderizar.

## Reglas duras

1. Nunca declarar done con lint o build rojos.
2. Nunca arreglar un error degradando el typecheck o agregando `any`.
3. Si un cambio introduce lógica compleja sin forma de verificarla, se detiene y
   se discute cómo verificarla — no se mergea a ciegas.
