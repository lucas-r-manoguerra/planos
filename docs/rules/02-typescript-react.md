# Regla 02 — TypeScript, React y Next.js

> TypeScript estricto, React 19, Next.js 16 (App Router). Esta versión de Next.js
> tiene breaking changes: **no asumir APIs de versiones anteriores**.

## TypeScript (strict)

- `strict: true` está activo en `tsconfig.json` — el código debe compilar sin
  `any` implícito, sin nulls sin manejar, sin casts innecesarios.
- **Tipos de dominio en `src/types/`**, no inline en componentes.
- `Record<string, number | string | boolean>` para props dinámicas (ver `plan.ts`).
- No usar `as` para silenciar el type-checker salvo con justificación y comentario.
- Evitar `any`; si un tipo externo no existe, crear una interfaz propia.

## React 19

- Componentes como **funciones** (`export function X()`), no arrow constants.
- Props tipadas con `interface` local al archivo (patrón de `Figure.tsx`, `Callout.tsx`).
- **Server Components por defecto**: si un componente no necesita interactividad
  del cliente, no es `"use client"`. Agregar la directiva solo cuando se usan
  hooks, eventos o estado.
- Hooks de React: solo dentro de componentes o custom hooks, y **siempre en el
  mismo orden** (nada de hooks condicionales, nada de early-return antes de hooks).
- No usar APIs deprecadas de React 18; consultar la guía en
  `node_modules/next/dist/docs/` ante dudas de API.

## Next.js 16 (App Router)

- Rutas en `src/app/` con convención de carpetas (`page.tsx`, `layout.tsx`, `[slug]/`).
- `params` es una **Promise** en `page.tsx` (patrón del repo: `const { slug } = await params`).
- Páginas de docs son **estáticas** (`generateStaticParams`), no render dinámico.
- Ante dudas de API de Next 16, leer la doc local en
  `node_modules/next/dist/docs/01-app/` antes de escribir código.
- No importar de `next/...` internos salvo lo documentado oficialmente.

## Naming

| Qué | Convención | Ejemplo |
|---|---|---|
| Componentes | `PascalCase` | `SunSettings`, `PlanCanvas` |
| Hooks | `usePascalCase` | `useTheme` |
| Stores | `camelCase.store.ts` | `sun.store.ts` |
| Funciones/variables | `camelCase` | `getAllDocs`, `northAngle` |
| Constantes | `UPPER_SNAKE_CASE` | `CATEGORY_LABELS` |
| Tipos/interfaces | `PascalCase` | `Room`, `SunSettings` |
| Enums | `PascalCase`, valores `camelCase` | `RoomType.DORMITORIO` |
| Archivos | `kebab-case` | `wall-layer.tsx` |

## Reglas duras

1. **No `any` silencioso**: si el código no compila, se arregla el tipo — no se
   degrada el chequeo.
2. **No código muerto**: sin imports sin usar, sin variables sin usar (ESLint lo marca).
3. **No duplicar tipos**: si un tipo ya existe en `src/types/`, se importa — no se redefine.
4. **No mutar props ni estado**: las props son de solo lectura; el estado cambia
   vía acciones del store.
