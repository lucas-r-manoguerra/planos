"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ArrowLeft } from "lucide-react";
import { DocsSearch } from "./DocsSearch";
import { ThemeToggle } from "@/components/ThemeToggle";

interface DocMeta {
  slug: string;
  title: string;
  description: string;
  order: number;
  category: string;
}

interface CategoryGroup {
  category: string;
  label: string;
  docs: DocMeta[];
}

interface DocsSidebarProps {
  categories: CategoryGroup[];
  allDocs: DocMeta[];
}

export function DocsSidebar({ categories, allDocs }: DocsSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r flex flex-col" style={{ borderColor: "var(--border-color)", background: "var(--sidebar-bg)" }}>
      <div className="px-4 py-3 border-b relative" style={{ borderColor: "var(--border-color)" }}>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm transition-colors mb-2"
          style={{ color: "var(--muted-text)" }}
        >
          <ArrowLeft size={14} />
          Volver al Editor
        </Link>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} style={{ color: "var(--accent)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--docs-heading)" }}>Documentación</h2>
        </div>
        <DocsSearch docs={allDocs} />
          <div className="absolute top-3 right-3">
            <ThemeToggle />
          </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2" aria-label="Documentación">
        <Link
          href="/docs"
          aria-current={pathname === "/docs" ? "page" : undefined}
          className={`block px-4 py-2 text-sm transition-colors ${
            pathname === "/docs"
              ? "font-medium border-r-2"
              : "hover:opacity-80"
          }`}
          style={{
            color: pathname === "/docs" ? "var(--accent)" : "var(--foreground)",
            background: pathname === "/docs" ? "var(--docs-table-header)" : "transparent",
            borderRightColor: pathname === "/docs" ? "var(--accent)" : "transparent",
          }}
        >
          🏠 Inicio
        </Link>

        {categories.map((group) => (
          <div key={group.category}>
            <div className="border-t my-2" style={{ borderColor: "var(--border-color)" }} />
            <div className="px-4 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-text)" }}>
              {group.label}
            </div>
            {group.docs.map((doc) => {
              const href = `/docs/${doc.slug}`;
              const isActive = pathname === href;
              return (
                <Link
                  key={doc.slug}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`block px-4 py-2 text-sm transition-colors ${isActive ? "font-medium border-r-2" : "hover:opacity-80"}`}
                  style={{
                    color: isActive ? "var(--accent)" : "var(--foreground)",
                    background: isActive ? "var(--docs-table-header)" : "transparent",
                    borderRightColor: isActive ? "var(--accent)" : "transparent",
                  }}
                >
                  {doc.title}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
