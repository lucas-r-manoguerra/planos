# Regla 05 — Estado (Zustand)

> Estado global con Zustand, persistencia selectiva. El estado es la única fuente
> de verdad del editor en sesión.

## Stores

Cada store vive en `src/stores/<nombre>.store.ts` (sufijo obligatorio). Stores actuales:

| Store | Responsabilidad |
|---|---|
| `canvas.store.ts` | Zoom, pan, grilla, herramienta activa |
| `floors.store.ts` | Plantas del proyecto |
| `rooms.store.ts` | Habitaciones + terreno |
| `fixtures.store.ts` | Mobiliario y elementos colocados |
| `sun.store.ts` | Simulación solar (settings, resultados) |
| `selection.store.ts` | Selección activa en el canvas |
| `history.store.ts` | Undo/redo |
| `ruler.store.ts` | Mediciones |
| `panel.store.ts` | Paneles del editor |
| `context-menu.store.ts` | Menú contextual |

**Reglas:**

1. **Un dominio, un store.** No crear stores "globales" que acumulen todo; si dos
   stores necesitan compartir dato, el dato vive en el store de menor nivel y el
   otro lo lee (o se extrae a `lib/`).
2. **Acciones, no setters crudos**: exponer acciones de dominio
   (`addRoom(room)`, `moveRoom(id, x, y)`) en vez de `setState` abierto. El
   componente llama a la acción; la validación vive en el store.
3. **Selectores finos**: cada componente selecciona solo el dato que usa
   (`useStore((s) => s.rooms)`), no todo el store — evita re-renders en cascada
   (regla 09).
4. **Estado derivado no se guarda**: si un valor se calcula de otros
   (p. ej. sombras desde `SunSettings`), se calcula en `lib/` — no se duplica en el store.
5. **Persistencia explícita** vía `lib/storage.ts` — no `persist` de Zustand a
   ciegas para todo; se persiste solo lo que debe sobrevivir (settings de usuario,
   layout), no el estado transitorio del canvas.
6. No mutar arrays/objetos in-place: siempre inmutabilidad
   (`[...rooms, newRoom]`, `rooms.map(...)`, `rooms.filter(...)`).
7. IDs con `crypto.randomUUID()` (regla 03).

## Interacción con el canvas

- Las capas de Konva leen los stores (regla 04). Un cambio de store propaga el
  redibujo de la capa correspondiente.
- `history.store.ts` registra transiciones de estado para undo/redo: las
  acciones destructivas deben pasar por acciones que el history pueda revertir.
