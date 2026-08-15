import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { assignHeadingIds } from "./mdx-headings";
import type { SearchDoc } from "./docs-search";

const docsDirectory = path.join(process.cwd(), "content/docs");

export interface DocMeta {
  slug: string;
  title: string;
  description: string;
  order: number;
  category: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  fundamentos: "📋 Fundamentos y Normativa",
  planeamiento: "📐 Planeamiento y Permisos",
  estructura: "🏗️ Estructura",
  instalaciones: "⚡ Instalaciones",
  acabados: "🎨 Acabados",
  exterior: "🌿 Exterior",
  seguridad: "🔒 Seguridad",
};

export const CATEGORY_ORDER = [
  "fundamentos",
  "planeamiento",
  "estructura",
  "instalaciones",
  "acabados",
  "exterior",
  "seguridad",
];

export function getAllDocs(): DocMeta[] {
  const files = fs.readdirSync(docsDirectory).filter((f) => f.endsWith(".mdx"));

  const docs = files.map((filename) => {
    const slug = filename.replace(/\.mdx$/, "");
    const filePath = path.join(docsDirectory, filename);
    const fileContents = fs.readFileSync(filePath, "utf8");
    const { data } = matter(fileContents);

    return {
      slug,
      title: data.title || slug,
      description: data.description || "",
      order: data.order || 99,
      category: data.category || "fundamentos",
    };
  });

  return docs.sort((a, b) => a.order - b.order);
}

export function getDocsByCategory(): { category: string; label: string; docs: DocMeta[] }[] {
  const allDocs = getAllDocs();
  const grouped: Record<string, DocMeta[]> = {};

  for (const doc of allDocs) {
    const cat = doc.category || "fundamentos";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(doc);
  }

  return CATEGORY_ORDER
    .filter((cat) => grouped[cat] && grouped[cat].length > 0)
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] || cat,
      docs: grouped[cat],
    }));
}

export function getDocBySlug(slug: string): { content: string; meta: DocMeta } | null {
  const filePath = path.join(docsDirectory, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { content, data } = matter(fileContents);

  return {
    content,
    meta: {
      slug,
      title: data.title || slug,
      description: data.description || "",
      order: data.order || 99,
      category: data.category || "fundamentos",
    },
  };
}

export interface DocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface DocNeighbors {
  prev: DocMeta | null;
  next: DocMeta | null;
}

/** Quita el inline markdown de un heading: links, código, negritas e itálicas. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1");
}

/**
 * Extrae los headings h2/h3 del contenido MDX sin parsearlo (regex con
 * seguimiento de bloques de código). Usa el mismo `assignHeadingIds` que el
 * plugin de rehype para que los ids del TOC coincidan con los anclas.
 */
export function getDocHeadings(content: string): DocHeading[] {
  const lines = content.split("\n");
  const headings: { text: string; level: 2 | 3 }[] = [];
  let inFence = false;

  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;

    headings.push({
      text: stripInlineMarkdown(match[2].trim()),
      level: match[1].length as 2 | 3,
    });
  }

  const entries = assignHeadingIds(headings.map((h) => h.text));

  return headings.map((heading, index) => ({
    ...heading,
    id: entries[index].id,
  }));
}

/**
 * Devuelve los vecinos del documento dentro de su misma categoría (ordenados
 * por `order`). En los extremos el lado faltante es `null` para que la UI no
 * renderice un enlace roto.
 */
export function getDocNeighbors(slug: string): DocNeighbors {
  const allDocs = getAllDocs();
  const siblings = allDocs.filter(
    (doc) => doc.category === allDocs.find((candidate) => candidate.slug === slug)?.category
  );

  const index = siblings.findIndex((doc) => doc.slug === slug);

  if (index === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: index > 0 ? siblings[index - 1] : null,
    next: index < siblings.length - 1 ? siblings[index + 1] : null,
  };
}

/** Índice completo para la búsqueda: metadatos + cuerpo sin frontmatter. */
export function getDocsSearchIndex(): SearchDoc[] {
  const files = fs.readdirSync(docsDirectory).filter((f) => f.endsWith(".mdx"));

  return files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, "");
      const filePath = path.join(docsDirectory, filename);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { content, data } = matter(fileContents);

      return {
        slug,
        title: data.title || slug,
        description: data.description || "",
        category: data.category || "fundamentos",
        order: data.order || 99,
        body: content,
      };
    })
    .sort((a, b) => a.order - b.order);
}
