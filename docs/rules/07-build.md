# Regla 07 — Build y comandos

> Bun es el package manager y runtime de scripts. Los comandos exactos se listan
> aquí — úsalos tal cual, no inventes variantes.

## Comandos

| Acción | Comando |
|---|---|
| Dev server | `bun dev` |
| Build de producción | `bun build` |
| Lint | `bun lint` |
| Typecheck | `bunx tsc --noEmit` |
| Prisma generate | `bunx prisma generate` |
| Prisma migrate dev | `bunx prisma migrate dev --name <nombre>` |
| Prisma studio | `bunx prisma studio` |

## Reglas

1. **Siempre `bun`**, nunca `npm`/`yarn`/`pnpm` para este repo. `bun.lock` es el
   lockfile de referencia. No crear `package-lock.json` ni `yarn.lock`.
2. **Verificación mínima antes de done**: `bun lint` + `bun build` verdes
   (ver regla 08). Si el cambio toca tipos, además `bunx tsc --noEmit`.
3. No agregar dependencias sin consultar. Si una dependencia nueva es necesaria:
   explicar por qué, instalar con `bun add <pkg>` y justificar en el PR.
4. No editar `package.json` scripts sin necesidad; si se agrega un script,
   nombrarlo en el estilo existente y documentarlo aquí.
5. `.env` / `.env.local` no se versionan (`.gitignore`): para credenciales usar
   variables de entorno, no hardcodear.
6. El código generado (`src/generated/prisma`, `.next/`) no se toca a mano ni se
   commitea salvo que el repo lo exija (generado está en `.gitignore`).
