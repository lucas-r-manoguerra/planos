import type { Metadata } from "next";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { getDocsByCategory, getAllDocs } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Documentación - Planos",
  description: "Normativas de construcción argentinas e internacionales",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = getDocsByCategory();
  const allDocs = getAllDocs();

  return (
    <div className="flex h-screen">
      <DocsSidebar categories={categories} allDocs={allDocs} />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 min-w-0 overflow-y-auto docs-container outline-none focus:outline-none"
      >
        <div className="max-w-4xl mx-auto px-8 py-10">
          <ErrorBoundary label="Documentación">{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
