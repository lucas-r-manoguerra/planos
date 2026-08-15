"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { searchDocs } from "@/lib/docs-search";
import type { SearchDoc, SearchResult } from "@/lib/docs-search";

interface DocMeta {
  slug: string;
  title: string;
  description: string;
  order: number;
  category: string;
}

interface DocsSearchProps {
  docs: DocMeta[];
}

const CATEGORY_LABELS: Record<string, string> = {
  fundamentos: "📋 Fundamentos",
  planeamiento: "📐 Planeamiento",
  estructura: "🏗️ Estructura",
  instalaciones: "⚡ Instalaciones",
  acabados: "🎨 Acabados",
  exterior: "🌿 Exterior",
  seguridad: "🔒 Seguridad",
};

const DEBOUNCE_MS = 150;

let indexPromise: Promise<SearchDoc[]> | null = null;

/** El índice es estático (generado en build): se carga una sola vez y se cachea. */
function loadIndex(): Promise<SearchDoc[]> {
  if (!indexPromise) {
    indexPromise = fetch("/docs/search-data")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Search index request failed: ${res.status}`);
        }
        return res.json() as Promise<SearchDoc[]>;
      })
      .catch((error) => {
        indexPromise = null;
        throw error;
      });
  }
  return indexPromise;
}

export function DocsSearch({ docs }: DocsSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [index, setIndex] = useState<SearchDoc[] | null>(null);
  const [indexFailed, setIndexFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadIndex()
      .then((data) => {
        if (!cancelled) setIndex(data);
      })
      .catch(() => {
        if (!cancelled) setIndexFailed(true);
      });

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    if (!debouncedQuery.trim() || !index) return [];
    return searchDocs(debouncedQuery, index);
  }, [debouncedQuery, index]);

  // Fallback: si el índice no carga, se filtra solo por metadatos (sidebar).
  const fallbackResults = useMemo<SearchResult[]>(() => {
    if (!debouncedQuery.trim() || !indexFailed) return [];
    const lower = debouncedQuery.toLowerCase();
    return docs
      .filter(
        (doc) =>
          doc.title.toLowerCase().includes(lower) ||
          doc.description.toLowerCase().includes(lower) ||
          doc.slug.toLowerCase().includes(lower)
      )
      .map((doc) => ({
        slug: doc.slug,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        snippet: doc.description || doc.title,
      }));
  }, [debouncedQuery, indexFailed, docs]);

  const activeResults = indexFailed ? fallbackResults : results;
  const showLoading = isSearching || (!index && !indexFailed);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    setIsSearching(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(value);
      setIsSearching(false);
    }, DEBOUNCE_MS);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      handleSelect();
      inputRef.current?.blur();
    }
  };

  const handleSelect = () => {
    setQuery("");
    setDebouncedQuery("");
    setIsOpen(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleClear = () => {
    handleSelect();
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Buscar en la documentación"
          aria-expanded={isOpen}
          aria-controls="docs-search-results"
          aria-autocomplete="list"
          placeholder="Buscar en la documentación..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-8 pr-8 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          style={{ borderColor: "var(--border-color)", background: "var(--input-bg)", color: "var(--foreground)" }}
        />
        {query && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && query.trim() && (
        <div
          id="docs-search-results"
          className="absolute z-50 top-full left-0 right-0 mt-1 border rounded-lg shadow-lg max-h-80 overflow-y-auto"
          style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}
        >
          {showLoading ? (
            <div className="px-4 py-3 text-sm" style={{ color: "var(--muted-text)" }}>
              Buscando…
            </div>
          ) : activeResults.length === 0 ? (
            <div className="px-4 py-3 text-sm" style={{ color: "var(--muted-text)" }}>
              No se encontraron resultados para &quot;{query}&quot;
            </div>
          ) : (
            <>
              <div
                className="px-4 py-2 text-xs border-b"
                style={{ color: "var(--muted-text)", borderColor: "var(--border-color)" }}
              >
                {activeResults.length} resultado{activeResults.length !== 1 ? "s" : ""}
              </div>
              <ul role="list">
                {activeResults.map((doc) => (
                  <li key={doc.slug} role="listitem">
                    <Link
                      href={`/docs/${doc.slug}`}
                      onClick={handleSelect}
                      className="block px-4 py-3 transition-colors border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      <div className="text-sm font-medium" style={{ color: "var(--docs-heading)" }}>
                        {doc.title}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>
                        {CATEGORY_LABELS[doc.category] || doc.category}
                      </div>
                      {doc.snippet && (
                        <div className="text-xs mt-1 line-clamp-2" style={{ color: "var(--foreground)" }}>
                          {doc.snippet}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
