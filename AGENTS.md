<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:planos-project-rules -->
# Planos — Reglas del proyecto

Lee **todas** las reglas en `docs/rules/` antes de tocar código. `INDEX.md` es el
punto de entrada: arquitectura, TypeScript/React, modelo de datos, canvas,
estado, contenido MDX, build, verificación, performance, harness y GitHub.

Resumen operativo:

- Stack: Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind 4 + Zustand + Konva + Prisma 7 + MDX.
- Package manager: **Bun** (`bun dev`, `bun lint`, `bun build`).
- Contenido editorial en `content/docs/*.mdx` (español, normativa argentina).
- Sistema de coordenadas del editor: 1 unidad = 1 cm.
- Verificación mínima antes de done: `bun lint` + `bunx tsc --noEmit` + `bun build` verdes.
- Convención de idioma: código e identificadores en inglés; contenido, UI y
  documentación en español; commits conventional commits en inglés.
<!-- END:planos-project-rules -->
