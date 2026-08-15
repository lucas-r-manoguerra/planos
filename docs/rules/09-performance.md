# Regla 09 — Performance

> El editor es interactivo en canvas: cada interacción (pan, zoom, selección,
> simulación solar) debe responder sin jank. La performance es parte del contrato.

## Principios

1. **Selectores finos de Zustand**: cada componente suscribe solo al estado que
   usa (regla 05). Suscribirse al store completo re-renderiza en cada cambio y
   degrada el canvas.
2. **Memoizar capas y componentes pesados**: `React.memo` para capas de Konva
   cuyos props no cambian; evitar re-render de `Stage` completo en cada movimiento.
3. **No calcular en render**: la simulación solar (solar.ts, shadow.ts) son
   funciones deterministas — calcularlas en el momento justo (cambio de settings
   o de geometría) y no en cada frame de pan/zoom salvo que dependan de él.
4. **Capas costosas**: `ShadowLayer` y `SunArcLayer` son las más caras; su
   resultado depende de settings + geometría, no del zoom/pan. Evitar recomputar
   sombras al hacer pan/zoom si el resultado no cambia.
5. **Sin work pesado en eventos de alto frecuencia**: `mousemove`, `dragmove`,
   `wheel` no deben disparar lógica cara; si hace falta, throttling/debounce.
6. **Konva por capas**: mantener una `Layer` por dominio (regla 04) para que Konva
   redibuje solo lo necesario.

## Reglas duras

1. Un cambio que degrada visiblemente la interacción (jank en pan/zoom/selección)
   no se mergea sin medir y justificar.
2. No agregar listeners globales innecesarios ni re-crear callbacks por render
   (`useCallback` cuando el callback va a hijos memoizados).
3. No hacer fetch/persistencia síncrona en el render path.
4. Si un cambio toca hot path del canvas, verificar manualmente con `bun dev`
   que el editor sigue fluido (regla 08).
