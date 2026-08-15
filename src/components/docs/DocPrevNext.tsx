import Link from "next/link";
import type { DocNeighbors } from "@/lib/docs";

interface DocPrevNextProps {
  neighbors: DocNeighbors;
}

export function DocPrevNext({ neighbors }: DocPrevNextProps) {
  const { prev, next } = neighbors;

  return (
    <nav
      aria-label="Navegación entre documentos"
      className="mt-12 pt-6 border-t flex justify-between gap-4"
      style={{ borderColor: "var(--border-color)" }}
    >
      {prev ? (
        <Link href={`/docs/${prev.slug}`} className="group max-w-[45%]">
          <span
            className="block text-xs mb-1"
            style={{ color: "var(--muted-text)" }}
          >
            ← Anterior
          </span>
          <span
            className="block text-sm font-medium line-clamp-2 transition-colors group-hover:text-[var(--docs-link)]"
            style={{ color: "var(--docs-heading)" }}
          >
            {prev.title}
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}

      {next ? (
        <Link
          href={`/docs/${next.slug}`}
          className="group text-right max-w-[45%]"
        >
          <span
            className="block text-xs mb-1"
            style={{ color: "var(--muted-text)" }}
          >
            Siguiente →
          </span>
          <span
            className="block text-sm font-medium line-clamp-2 transition-colors group-hover:text-[var(--docs-link)]"
            style={{ color: "var(--docs-heading)" }}
          >
            {next.title}
          </span>
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}
