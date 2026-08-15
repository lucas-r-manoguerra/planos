import type { DocHeading } from "@/lib/docs";

interface DocTocProps {
  headings: DocHeading[];
}

export function DocToc({ headings }: DocTocProps) {
  if (headings.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Índice de contenidos">
      <h2
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--muted-text)" }}
      >
        En esta página
      </h2>
      <ul
        className="border-l space-y-1.5 text-sm"
        style={{ borderColor: "var(--border-color)" }}
      >
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className="block py-0.5 transition-colors hover:opacity-70"
              style={{
                color:
                  heading.level === 3 ? "var(--muted-text)" : "var(--docs-heading)",
                paddingLeft: heading.level === 3 ? "1.25rem" : "0.75rem",
              }}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
