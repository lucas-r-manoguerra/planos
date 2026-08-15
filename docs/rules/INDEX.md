# Planos — Reglas de Desarrollo

> Reglas operativas para trabajar en este repo. Están pensadas para que **opencode**
> (o cualquier agente) pueda leer, modificar y verificar código con precisión.
>
> opencode carga automáticamente estas reglas (configuradas en `opencode.json`).
> **Léelas todas antes de tocar código.** Las reglas son pocas pero son ley.

## Índice

| Regla | Tema | Cuándo aplica |
|---|---|---|
| [01-architecture](01-architecture.md) | Capas, App Router, dirección de dependencias | Siempre |
| [02-typescript-react](02-typescript-react.md) | TypeScript estricto, React 19, Next.js 16 | Al escribir código |
| [03-data-model](03-data-model.md) | Tipos de dominio, coordenadas en cm, Prisma | Al tocar el modelo |
| [04-canvas](04-canvas.md) | Konva/react-konva, capas del canvas | Al tocar el editor |
| [05-state](05-state.md) | Zustand stores, persistencia | Al tocar estado |
| [06-content-docs](06-content-docs.md) | MDX, frontmatter, categorías, normativa | Al tocar contenido |
| [07-build](07-build.md) | Bun, lint, build, comandos exactos | Antes de buildear |
| [08-testing](08-testing.md) | Verificación de cambios | Antes de declarar done |
| [09-performance](09-performance.md) | Canvas, re-renders, hot paths | Al tocar el editor |
| [10-opencode-harness](10-opencode-harness.md) | Flujo de verificación del agente | Siempre |
| [11-github](11-github.md) | Commits, PRs | Antes de commitear |

## Reglas transversales (aplican a TODO)

1. **Verificar antes de declarar done**: un cambio no está terminado hasta que
   `bun lint` y `bun build` pasan verdes. Punto.
2. **One File = One Task**: si un archivo pasa ~300 líneas, se divide.
3. **Coordenadas en centímetros**: el sistema de coordenadas del editor usa
   `1 unidad = 1 centímetro` (ver regla 03). Nunca mezclar unidades.
4. **Next.js 16 es una versión con breaking changes**: antes de escribir código
   Next/React, leer la guía relevante en `node_modules/next/dist/docs/`. No
   asumir APIs de versiones anteriores.
5. **Docs en español, código en inglés**: contenido y UI en español (normativa
   argentina); identificadores, funciones, componentes y commits en inglés.
6. **Preguntar en vez de adivinar**: si una decisión de producto/diseño es
   ambigua, preguntar al usuario con opciones concretas — no inventar.
