import Image from "next/image";

interface FigureProps {
  src: string;
  alt: string;
  caption?: string;
  width?: string;
}

export function Figure({ src, alt, caption, width = "100%" }: FigureProps) {
  return (
    <figure className="my-6">
      <div className="relative rounded-lg overflow-hidden" style={{ maxWidth: width }}>
        <Image
          src={src}
          alt={alt}
          width={0}
          height={0}
          sizes="100vw"
          className="w-full h-auto"
          loading="lazy"
        />
      </div>
      {caption && (
        <figcaption
          className="text-center text-sm mt-2 italic"
          style={{ color: "var(--muted-text)" }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
