# Regla 10 — Harness de opencode

> Cómo trabaja el agente en este repo. Define el flujo de verificación que
> opencode debe seguir en CADA tarea, para que "listo" siempre signifique lo mismo.

## Flujo obligatorio antes de declarar done

1. **Leer las reglas**: INDEX + reglas relevantes al módulo tocado
   (canvas → 04+09, estado → 05, contenido → 06, modelo → 03, ...).
2. **Entender el contexto**: buscar en Engram (`mem_search`) si hay memoria previa
   del módulo/feature; si el usuario menciona trabajo pasado, siempre.
3. **Leer el código actual** del área afectada (componentes, stores, lib) antes
   de modificar — no asumir el estado del código por memoria.
4. **Implementar** siguiendo las reglas del módulo.
5. **Verificar**: `bun lint` + `bunx tsc --noEmit` + `bun build` (regla 08).
6. **Validar flujo** si el cambio es visual (regla 08.4): correr `bun dev` y
   probar la interacción afectada.
7. **Guardar memoria**: `mem_save` con decisiones, bugs, discoveries (Engram).
8. **Reportar**: resumen con archivos tocados, verificaciones corridas, decisiones.

## Definición de "listo"

- `bun lint`, `bunx tsc --noEmit` y `bun build` verdes.
- Flujo visual validado manualmente cuando aplica.
- Sin `any` silencioso, sin código muerto, sin tipos duplicados (regla 02).
- Documentación actualizada si cambió comportamiento público (API, UI, docs).
- Memoria de Engram guardada con lo aprendido.

## Reglas del agente

1. **Nunca declarar done con verificaciones rojas.** Punto.
2. **Nunca inventar APIs**: si no está seguro de una API de Next 16 / React 19 /
   Prisma 7, leer la doc local o preguntar — no asumir.
3. **Nunca agregar dependencias** sin consultar (regla 07.3).
4. **Nunca tocar código de un módulo sin leer sus reglas** (canvas → 04, etc.).
5. **Preguntar en vez de adivinar**: si una decisión de producto/diseño es
   ambigua, preguntar al usuario con opciones concretas — no inventar.
6. **Responder en el idioma del usuario** (español rioplatense, natural), pero
   código, identificadores y commits en inglés (regla INDEX.5).
7. **Verificar antes de afirmar**: no dar por hecho lo que dice la memoria —
   comprobar contra el código actual si hay duda.
8. **No editar archivos de contrato sin pedir permiso**: `opencode.json`,
   `docs/rules/*`, `eslint.config.mjs`, `tsconfig.json`, `.github/`.

## Flujo de review (cuando aplique)

- Cambios > 400 líneas de diff: proponer división en PRs chained (skill `chained-pr`).
- Cambios de arquitectura (nuevo módulo, nueva dependencia, cambio de modelo):
  discutir y pedir aprobación explícita antes de implementar.
- Cambios de contenido: verificar que siguen regla 06 (frontmatter, estructura,
  normativa) y que el doc renderiza.
