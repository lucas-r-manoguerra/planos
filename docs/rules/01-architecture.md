# Regla 01 — Arquitectura

> La arquitectura es un contrato, no una sugerencia.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5 (strict)**
- **Tailwind CSS 4** para estilos
- **Zustand** para estado global
- **Konva / react-konva** para el canvas del editor
- **Prisma 7** + PostgreSQL para persistencia
- **MDX** (`next-mdx-remote/rsc`) + `gray-matter` para contenido de docs
- **Bun** como package manager y runtime de scripts

## Estructura de carpetas

```
src/
├── app/                  # App Router: rutas y layouts
│   └── docs/[slug]/      # Páginas de documentación
├── components/
│   ├── canvas/           # Capas del editor Konva (una capa = un archivo)
│   ├── docs/             # Componentes MDX (MDXContent, DocsSidebar, DocsSearch)
│   ├── panel/            # Paneles laterales
│   ├── sidebar/          # Sidebar del editor
│   ├── toolbar/          # Toolbar del editor
│   ├── ui/               # UI primitiva reutilizable
│   └── ...               # Componentes generales (Callout, Figure, etc.)
├── lib/                  # Lógica pura, utilidades, catálogos
├── stores/               # Zustand stores
├── types/                # Tipos de dominio
└── generated/            # Código generado (Prisma) — NO editar
content/
└── docs/                 # Documentación en MDX (normativa construcción)
public/
└── docs/                 # SVG e imágenes de las docs
```

## Dirección de dependencias

```
app/         →  components, lib, stores, types
components/  →  lib, stores, types, ui
stores/      →  lib, types
lib/         →  types (nada más)
types/       →  (nada)
```

**Reglas de oro:**

1. `app/` solo renderiza: componentes, layouts, pages. Sin lógica de negocio.
2. `lib/` es lógica pura (solar, shadow, storage, docs, fixtures, templates):
   **no importa stores ni componentes**. Si una función necesita estado, recibe los valores por parámetro.
3. Los componentes **nunca** mutan estado directamente: siempre vía acciones del store.
4. `src/generated/prisma` es generado por Prisma — jamás se edita a mano.
5. El contenido de `content/docs/` es el producto editorial: no mezclar con código.

## One File = One Task

Cada archivo = una responsabilidad. Límite: **~300 líneas**. Al pasarlo, partir.

✅ `src/components/canvas/WallLayer.tsx` — solo paredes
✅ `src/lib/solar.ts` — solo algoritmo solar
✅ `src/stores/sun.store.ts` — solo estado de simulación solar
❌ `canvas.tsx` con todas las capas, `utils.ts` con todo

## Convenciones

- Alias de import: `@/*` → `src/*` (configurado en `tsconfig.json`).
- Export nombrado (no default) salvo excepción justificada.
- Archivos de stores: sufijo `.store.ts` (`sun.store.ts`).
