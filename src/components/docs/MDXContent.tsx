import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { rehypeDocHeadings } from "@/lib/mdx-headings";
import { Callout } from "@/components/Callout";
import { Aside } from "@/components/Aside";
import { Figure } from "@/components/Figure";
import { PlaceholderImg } from "@/components/PlaceholderImg";

function MdxComponents() {
  return {
    h1: ({ children }: { children: React.ReactNode }) => (
      <h1 className="text-3xl font-bold mb-4 mt-8 first:mt-0 tracking-tight" style={{ color: "var(--docs-heading)" }}>{children}</h1>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
      <h2 className="text-2xl font-bold mb-3 mt-8 tracking-tight" style={{ color: "var(--docs-heading)" }}>{children}</h2>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
      <h3 className="text-xl font-semibold mb-2 mt-6" style={{ color: "var(--docs-heading)" }}>{children}</h3>
    ),
    p: ({ children }: { children: React.ReactNode }) => (
      <p className="leading-[1.8] mb-5" style={{ color: "var(--foreground)" }}>{children}</p>
    ),
    ul: ({ children }: { children: React.ReactNode }) => (
      <ul className="list-disc list-inside mb-4 space-y-1.5" style={{ color: "var(--foreground)" }}>{children}</ul>
    ),
    ol: ({ children }: { children: React.ReactNode }) => (
      <ol className="list-decimal list-inside mb-4 space-y-1.5" style={{ color: "var(--foreground)" }}>{children}</ol>
    ),
    li: ({ children }: { children: React.ReactNode }) => (
      <li style={{ color: "var(--foreground)" }}>{children}</li>
    ),
    strong: ({ children }: { children: React.ReactNode }) => (
      <strong className="font-semibold" style={{ color: "var(--docs-heading)" }}>{children}</strong>
    ),
    em: ({ children }: { children: React.ReactNode }) => (
      <em className="italic" style={{ color: "var(--foreground)" }}>{children}</em>
    ),
    a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
      <a href={href} className="underline underline-offset-2 hover:underline" style={{ color: "var(--docs-link)" }}>{children}</a>
    ),
    blockquote: ({ children }: { children: React.ReactNode }) => (
      <blockquote className="border-l-4 pl-4 pr-4 py-3 my-5 rounded-r-lg" style={{ borderColor: "var(--docs-blockquote-border)", background: "var(--docs-blockquote-bg)", color: "var(--foreground)" }}>{children}</blockquote>
    ),
    table: ({ children }: { children: React.ReactNode }) => (
      <div className="overflow-x-auto my-6">
        <table className="min-w-full border rounded-lg" style={{ borderColor: "var(--docs-table-border)" }}>{children}</table>
      </div>
    ),
    thead: ({ children }: { children: React.ReactNode }) => (
      <thead style={{ background: "var(--docs-table-header)" }}>{children}</thead>
    ),
    tbody: ({ children }: { children: React.ReactNode }) => (
      <tbody>{children}</tbody>
    ),
    tr: ({ children }: { children: React.ReactNode }) => (
      <tr className="transition-colors">{children}</tr>
    ),
    th: ({ children }: { children: React.ReactNode }) => (
      <th className="px-4 py-3 text-left text-sm font-semibold" style={{ color: "var(--docs-heading)" }}>{children}</th>
    ),
    td: ({ children }: { children: React.ReactNode }) => (
      <td className="px-4 py-3 text-sm" style={{ color: "var(--foreground)" }}>{children}</td>
    ),
    hr: () => <hr className="my-10" style={{ borderColor: "var(--border-color)" }} />,
    code: ({ className, children }: { className?: string; children: React.ReactNode }) => {
      // Bloque con sintaxis resaltada (rehype-highlight agrega `hljs`):
      // se pasa el className tal cual para conservar los spans de tokens.
      if (className?.includes("hljs")) {
        return <code className={className}>{children}</code>;
      }
      return (
        <code className="px-1.5 py-0.5 rounded text-sm font-mono" style={{ background: "var(--docs-code-bg)", color: "var(--foreground)" }}>{children}</code>
      );
    },
    pre: ({ children }: { children: React.ReactNode }) => (
      <pre className="rounded-lg overflow-x-auto p-4 my-5 text-sm leading-relaxed" style={{ background: "var(--docs-code-bg)", color: "var(--foreground)" }}>{children}</pre>
    ),
    img: ({ src, alt }: { src?: string; alt?: string }) => (
      <Figure src={src || ""} alt={alt || ""} />
    ),
    Callout,
    Aside,
    Figure,
    PlaceholderImg,
  };
}

export async function MDXContent({ source }: { source: string }) {
  const { content } = await compileMDX({
    source,
    components: MdxComponents(),
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [[rehypeHighlight, { detect: true }], rehypeDocHeadings],
      },
    },
  });

  return <>{content}</>;
}
