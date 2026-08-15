interface AsideProps {
  children: React.ReactNode;
}

export function Aside({ children }: AsideProps) {
  return (
    <aside
      className="border-l-4 pl-4 pr-4 py-3 my-4 text-sm rounded-r-lg"
      style={{
        borderColor: "var(--border-color)",
        background: "var(--docs-code-bg)",
        color: "var(--foreground)",
      }}
    >
      {children}
    </aside>
  );
}
