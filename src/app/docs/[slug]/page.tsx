import { notFound } from "next/navigation";
import { getDocBySlug, getAllDocs, getDocHeadings, getDocNeighbors } from "@/lib/docs";
import { MDXContent } from "@/components/docs/MDXContent";
import { DocToc } from "@/components/docs/DocToc";
import { DocPrevNext } from "@/components/docs/DocPrevNext";

export async function generateStaticParams() {
  const docs = getAllDocs();
  return docs.map((doc) => ({ slug: doc.slug }));
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) {
    notFound();
  }

  const headings = getDocHeadings(doc.content);
  const neighbors = getDocNeighbors(slug);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-8">
      <article className="min-w-0">
        <MDXContent source={doc.content} />
        <DocPrevNext neighbors={neighbors} />
      </article>

      <aside className="mt-10 lg:mt-0">
        <div className="lg:sticky lg:top-8">
          <DocToc headings={headings} />
        </div>
      </aside>
    </div>
  );
}
