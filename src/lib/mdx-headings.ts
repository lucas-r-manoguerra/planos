import type { Element, Root } from "hast";

/**
 * Convierte el texto de un heading en un id de ancla.
 *
 * Reglas: quita acentos (NFD), minúsculas, reemplaza todo lo no alfanumérico
 * por guiones (colapsando repeticiones) y recorta los extremos.
 *
 * Ejemplo: "### 1.1 Muros de **mampostería**" → "11-muros-de-mamposteria"
 * (el inline markdown se quita antes de llamar a esta función).
 */
export function headingToId(text: string): string {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "seccion";
}

export interface HeadingEntry {
  text: string;
  id: string;
}

/**
 * Asigna ids únicos a una secuencia de headings (mismo orden de aparición).
 * Ante colisiones usa el sufijo `-2`, `-3`, etc.
 *
 * Esta función la comparten el parser por regex (server) y el plugin de rehype
 * (hast) para garantizar que los ids del TOC coincidan con los anclas renderizados.
 */
export function assignHeadingIds(texts: string[]): HeadingEntry[] {
  const used = new Set<string>();

  return texts.map((text) => {
    const base = headingToId(text);
    let id = base;
    let suffix = 2;

    while (used.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }

    used.add(id);
    return { text, id };
  });
}

/**
 * Plugin de rehype (sin dependencias) que agrega `id` a los headings h2/h3 del
 * documento usando el mismo algoritmo que el TOC server-side.
 */
export function rehypeDocHeadings() {
  return (tree: Root): void => {
    const headings: { element: Element; text: string }[] = [];
    collectHeadings(tree, headings);

    const entries = assignHeadingIds(headings.map((h) => h.text));

    headings.forEach((heading, index) => {
      const entry = entries[index];
      if (entry) heading.element.properties.id = entry.id;
    });
  };
}

function collectHeadings(node: Root | Element, out: { element: Element; text: string }[]): void {
  if (node.type !== "root" && node.type !== "element") return;

  for (const child of node.children) {
    if (child.type !== "element") continue;

    if (child.tagName === "h2" || child.tagName === "h3") {
      out.push({ element: child, text: elementText(child) });
    } else {
      collectHeadings(child, out);
    }
  }
}

function elementText(node: Element): string {
  let text = "";

  for (const child of node.children) {
    if (child.type === "text") {
      text += child.value;
    } else if (child.type === "element") {
      text += elementText(child);
    }
  }

  return text;
}
