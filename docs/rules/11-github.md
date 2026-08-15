# Regla 11 — GitHub y Commits

> Flujo de entrega: conventional commits, PRs revisables, verificaciones verdes.

## Commits

- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `build:`, `perf:`, `chore:`.
- Scope cuando aporta: `feat(sun): add compass rotation`, `fix(canvas): hook order in NorthArrowLayer`.
- Mensaje en **inglés** (regla INDEX.5); cuerpo explica el porqué (no el qué).
- Sin atribución AI en commits. Sin commits vacíos.
- Un commit = una unidad lógica de trabajo (test + implementación + docs del cambio).

## PRs

- **PR chico = PR revisable**: objetivo < 400 líneas de diff. Si excede, chained PRs (skill `chained-pr`).
- Cada PR incluye: implementación + verificaciones (regla 08) + docs si cambia
  API pública o contenido.
- Chequeo pre-PR (local, obligatorio):
  1. `bun lint` sin errores.
  2. `bunx tsc --noEmit` limpio.
  3. `bun build` verde.
  4. Validación manual del flujo afectado (si es visual).
  5. Revisión del diff completo antes de pushear (`git diff`, `git status`).
- La rama base es `main`; historia limpia antes del merge (rebase, no merge commits ruidosos).

## Reglas duras

1. Nunca pushear directo a `main` (salvo emergencias acordadas).
2. Nunca commitear secrets, `.env`, binarios, `.next/`, `src/generated/prisma`.
3. `git add` explícito de archivos intencionales; revisar `git diff` antes de commitear.
4. No modificar `opencode.json`, `docs/rules/*`, `eslint.config.mjs`, `tsconfig.json`
   sin justificación explícita en el commit.
5. Un commit que rompe lint/build/typecheck no se mergea: se arregla o se revierte.
