/**
 * Búsqueda de documentación (lógica pura).
 *
 * Este módulo no toca el filesystem ni hace fetch: recibe los documentos ya
 * indexados y devuelve resultados ordenados. `getDocsSearchIndex()` (que sí
 * lee `content/docs/`) vive en `src/lib/docs.ts` para mantener este archivo
 * puro e importable desde componentes client.
 */

export interface SearchDoc {
  slug: string;
  title: string;
  description: string;
  category: string;
  order: number;
  body: string;
}

export interface SearchResult {
  slug: string;
  title: string;
  description: string;
  category: string;
  snippet: string;
}

/**
 * Extrae el fragmento de `text` que rodea la primera ocurrencia de `term`.
 * Si el término no aparece, recorta el texto al tamaño del fragmento.
 */
export function makeSnippet(text: string, term: string, radius = 70): string {
  const lower = text.toLowerCase();
  const index = lower.indexOf(term.toLowerCase());

  if (index === -1) {
    return text.length > radius * 2 ? `${text.slice(0, radius * 2)}…` : text;
  }

  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + term.length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";

  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

const SCORES = {
  title: 3,
  description: 2,
  slug: 1,
  body: 1,
} as const;

/**
 * Busca en los documentos indexados. Cada término puntúa según dónde aparece
 * (title +3, description +2, slug +1, body +1) y el total se suma por término.
 * Ordena por puntaje descendente; el orden de `docs` (ya ordenado por `order`)
 * desempata de forma estable.
 */
export function searchDocs(query: string, docs: SearchDoc[]): SearchResult[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  if (terms.length === 0) return [];

  const scored: { result: SearchResult; score: number }[] = [];

  for (const doc of docs) {
    const title = doc.title.toLowerCase();
    const description = doc.description.toLowerCase();
    const slug = doc.slug.toLowerCase();
    const body = doc.body.toLowerCase();

    let score = 0;
    let snippet = "";

    for (const term of terms) {
      if (title.includes(term)) score += SCORES.title;
      if (description.includes(term)) score += SCORES.description;
      if (slug.includes(term)) score += SCORES.slug;
      if (body.includes(term)) {
        score += SCORES.body;
        if (!snippet) snippet = makeSnippet(doc.body, term);
      }
    }

    if (score > 0) {
      scored.push({
        score,
        result: {
          slug: doc.slug,
          title: doc.title,
          description: doc.description,
          category: doc.category,
          snippet: snippet || doc.description || doc.title,
        },
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.result);
}
