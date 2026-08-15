import { getDocsSearchIndex } from "@/lib/docs";

/** Índice estático: se genera en build, no en cada request. */
export const dynamic = "force-static";

export function GET() {
  return Response.json(getDocsSearchIndex());
}
