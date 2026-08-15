import Link from "next/link";
import { getDocsByCategory } from "@/lib/docs";

export default function DocsPage() {
  const categories = getDocsByCategory();

  const categoryIcons: Record<string, string> = {
    fundamentos: "📋",
    planeamiento: "📐",
    estructura: "🏗️",
    instalaciones: "⚡",
    acabados: "🎨",
    exterior: "🌿",
    seguridad: "🔒",
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--docs-heading)" }}>
        Guía de Construcción
      </h1>
      <p className="mb-8" style={{ color: "var(--muted-text)" }}>
        Todo lo que necesitás saber para construir tu casa, desde cero hasta
        terminar. Guía completa para Argentina, con normativas, instalaciones,
        acabados y más.
      </p>

      {categories.map((group) => (
        <section key={group.category} className="mb-10">
          <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--docs-heading)" }}>
            {categoryIcons[group.category] || "📄"} {group.label}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.docs.map((doc) => (
              <Link
                key={doc.slug}
                href={`/docs/${doc.slug}`}
                className="block p-4 rounded-lg hover:shadow-md transition-all" style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", color: "var(--foreground)" }}
              >
                <h3 className="text-base font-semibold mb-1" style={{ color: "var(--docs-heading)" }}>
                  {doc.title}
                </h3>
                <p className="text-sm line-clamp-2" style={{ color: "var(--foreground)" }}>
                  {doc.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
