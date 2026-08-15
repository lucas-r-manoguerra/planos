# Regla 08 — Verificación de cambios

> Qué significa "listo" en este repo. No hay suite de tests configurada aún:
> la verificación se apoya en lint, typecheck y build, y en validación manual
> del flujo afectado.

## Verificación mínima obligatoria (siempre)

1. `bun lint` — sin errores nuevos (ESLint + next/core-web-vitals + TS rules).
2. `bun build` — build de producción verde.
3. `bunx tsc --noEmit` — typecheck limpio (sin `any` silencioso, regla 02).
4. **Validación manual del flujo tocado**: si el cambio es visual (canvas, UI,
   docs), correr `bun dev` y verificar en navegador la interacción afectada
   (zoom, pan, selección, snap, simulación solar, render de docs).

## Para lógica pura (lib/)

- Funciones como `solar.ts`, `shadow.ts`, `storage.ts`, `templates.ts` son
  deterministas: al modificarlas, verificar con un script ad-hoc
  (`bunx tsx <script>`) o ejercicio manual los casos de borde (fechas límite,
  zonas horarias, coordenadas extremas, ángulos >360°).
- Si la función tiene varios casos de borde y no existe test, **proponer agregar
  un test runner** (p. ej. `vitest`) antes de escribir más casos — no acumular
  lógica sin test.

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
