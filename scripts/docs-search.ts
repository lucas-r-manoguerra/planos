/**
 * Smoke test de la búsqueda de documentación (S4.2).
 *
 * Uso: bunx tsx scripts/docs-search.ts
 */
import { searchDocs, makeSnippet } from "../src/lib/docs-search";
import { getDocsSearchIndex } from "../src/lib/docs";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

// --- Fixtures sintéticos (mismo shape que getDocsSearchIndex) ---
const fixtures = [
  {
    slug: "cimientos",
    title: "Cimientos",
    description: "Tipos de cimentaciones superficiales y profundas",
    category: "estructura",
    order: 8,
    body: "Los cimientos transmiten las cargas de la estructura al suelo.\n\n## 1. Tipos\n\nExisten cimientos superficiales y profundos.",
  },
  {
    slug: "mamposteria",
    title: "Mampostería",
    description: "Construcción de muros con ladrillos",
    category: "estructura",
    order: 15,
    body: "La mampostería se construye con ladrillos cerámicos o bloques.\n\nLa palabra cimientos aparece solo en el cuerpo de este documento.",
  },
  {
    slug: "normativa-nacional",
    title: "Normativa Nacional",
    description: "Reglamentos nacionales de construcción",
    category: "fundamentos",
    order: 1,
    body: "La normativa argentina regula la construcción en todo el país.",
  },
];

// 1. Término en title rankea por encima del mismo término solo en body
const ranked = searchDocs("cimientos", fixtures);
assert(ranked.length === 2, "el término 'cimientos' encuentra 2 documentos");
assert(
  ranked[0].slug === "cimientos",
  `el match de título rankea primero (got: ${ranked[0].slug})`
);

// 2. Término solo en body: encuentra el documento y el snippet lo contiene
const bodyOnly = searchDocs("ladrillos", fixtures);
assert(bodyOnly.length === 1, "el término 'ladrillos' encuentra 1 documento");
assert(bodyOnly[0].slug === "mamposteria", "el match de body se encuentra");
assert(
  bodyOnly[0].snippet.toLowerCase().includes("ladrillos"),
  "el snippet contiene el término buscado"
);

// 3. Consulta vacía / sin matches → []
assert(searchDocs("", fixtures).length === 0, "consulta vacía devuelve []");
assert(searchDocs("xyzxyz", fixtures).length === 0, "sin matches devuelve []");

// 4. Multi-término: ambos términos suman en el mismo documento
const multi = searchDocs("normativa argentina", fixtures);
assert(
  multi.length === 1 && multi[0].slug === "normativa-nacional",
  "multi-término suma puntajes del mismo doc"
);

// 5. makeSnippet acota el contexto alrededor del término
const longText =
  "Esta es una frase de ejemplo bastante larga con varias palabras para poder " +
  "superar el radio de setenta caracteres y recién entonces mencionar cimientos " +
  "al final";
const snippet = makeSnippet(longText, "cimientos");
assert(snippet.startsWith("…"), "makeSnippet agrega prefijo cuando el término no está al inicio");
assert(snippet.includes("cimientos"), "makeSnippet conserva el término");

// --- Índice real (fs) ---
const realIndex = getDocsSearchIndex();
assert(realIndex.length > 0, `índice real carga ${realIndex.length} documentos`);

const target = realIndex.find((doc) => doc.body.trim().length > 0);
if (target) {
  const sample = target.body.match(/[A-Za-záéíóúñ]{6,}/);
  if (sample) {
    const hit = searchDocs(sample[0], realIndex);
    assert(
      hit.some((r) => r.slug === target.slug),
      `búsqueda real encuentra el doc de origen ('${sample[0]}')`
    );
  }
}

console.log("\nOK — búsqueda de documentación verificada.");
