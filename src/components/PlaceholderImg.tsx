interface PlaceholderImgProps {
  label?: string;
  width?: string;
  height?: string;
}

export function PlaceholderImg({ label = "Imagen", width = "100%", height = "200px" }: PlaceholderImgProps) {
  return (
    <div
      className="my-6 rounded-lg border-2 border-dashed flex items-center justify-center"
      style={{
        width,
        height,
        borderColor: "var(--border-color)",
        background: "var(--docs-code-bg)",
        color: "var(--muted-text)",
      }}
    >
      <div className="text-center">
        <div className="text-3xl mb-2">🖼️</div>
        <div className="text-sm">{label}</div>
      </div>
    </div>
  );
}
