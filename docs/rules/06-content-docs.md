# Regla 06 — Contenido (MDX)

> El contenido editorial del sitio: guías de construcción y normativa argentina
> en español. Vive en `content/docs/*.mdx`.

## Frontmatter obligatorio

```mdx
---
title: "Cimientos"
description: "Tipos de cimentaciones superficiales y profundas..."
order: 8
category: "estructura"
---
```

- `title`: nombre corto del documento.
- `description`: una línea que resuma el alcance (se usa en indexado/búsqueda).
- `order`: número entero que ordena el doc dentro de su categoría (menor primero).
- `category`: una de las categorías definidas en `src/lib/docs.ts`:

| Categoría | Label |
|---|---|
| `fundamentos` | 📋 Fundamentos y Normativa |
| `planeamiento` | 📐 Planeamiento y Permisos |
| `estructura` | 🏗️ Estructura |
| `instalaciones` | ⚡ Instalaciones |
| `acabados` | 🎨 Acabados |
| `exterior` | 🌿 Exterior |
| `seguridad` | 🔒 Seguridad |

> Nota: varios docs existentes usan `category: "gestion"` (seguridad-obra) o
> no declaran category (cimientos, estudios-suelo). Al editar un doc existente,
> respetar su categoría actual salvo que el cambio justifique migrarla junto con
> `src/lib/docs.ts` y `DocsSidebar`.

## Estructura del documento

1. **Frontmatter** (arriba).
2. Párrafo introductorio (1-3 líneas).
3. **Índice de contenidos** numerado que refleja las secciones.
4. `---` separador.
5. Secciones numeradas `## 1. Título` con subsecciones `### 1.1 Subtítulo`.
   La numeración refleja jerarquía (`1`, `1.1`, `1.2`, `2`, `2.1`, ...).

## Componentes MDX disponibles

| Componente | Uso |
|---|---|
| `<Figure src="/docs/x.svg" alt="..." caption="Figura N: ..." width="600px" />` | Imagen/diagrama con caption. `src` apunta a `public/docs/` |
| `<Callout type="info\|warning\|tip\|hack">...</Callout>` | Destacar información |
| `<Aside>...</Aside>` | Nota lateral complementaria |
| `<PlaceholderImg />` | Placeholder para imágenes futuras |

- `Figure` **siempre** lleva `alt` descriptivo y `caption` con numeración.
- `Callout` se usa para advertencias de seguridad/normativa (nunca para contenido
  principal — es complemento).
- Tablas para comparativas (Materiales, dimensiones, normativas).
- Enlaces internos entre docs: `/docs/<slug>` (p. ej. `[estudio de suelo](/docs/estudios-suelo)`).

## Idioma y registro

- Español **neutral-profesional**, orientado a normativa argentina. No voseo
  ni slang en el contenido.
- Términos técnicos pueden quedar en el idioma de origen (EPP, IGA, IRAM) con
  su explicación.
- Los diagramas SVG viven en `public/docs/` con nombres `kebab-case` en español
  del tema (`cimientos-tipos.svg`, `aguas-residuales-sistema.svg`).

## Reglas duras

1. **No romper docs existentes**: al editar, mantener frontmatter, estructura de
   secciones y numeración coherentes; si se renumera, actualizar el índice del doc.
2. **No escribir contenido sin normativa**: las afirmaciones normativas
   (IRAM, CIRSOC, códigos municipales/provinciales) deben ser correctas para
   Argentina; ante duda, verificar o no afirmar.
3. Un nuevo doc requiere: archivo `.mdx` con frontmatter completo + posición en
   el orden de su categoría + (si corresponde) diagrama SVG. Verificar que
   aparezca en `DocsSidebar` vía `getDocsByCategory()`.
4. Componentes MDX propios se agregan en `MDXContent.tsx` y se documentan aquí.
