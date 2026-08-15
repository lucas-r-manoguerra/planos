/**
 * Landing page del producto (Server Component).
 *
 * Front door en `/`: hero, propuesta de valor y CTA hacia el editor.
 * No monta el canvas del editor (spec landing-page-1) — el editor vive
 * en su propia ruta `/editor` (spec landing-page-2).
 */

import Link from "next/link";
import { Pencil, Layers, Sun, BookOpen } from "lucide-react";

const FEATURES = [
  {
    icon: Pencil,
    title: "Planos a escala",
    description:
      "Habitaciones, paredes y aberturas con medidas reales en centímetros. El sistema de coordenadas del editor usa 1 unidad = 1 cm.",
  },
  {
    icon: Layers,
    title: "Plantas múltiples",
    description:
      "Organice el proyecto por niveles, cada uno con sus habitaciones, paredes y mobiliario propios.",
  },
  {
    icon: Sun,
    title: "Simulación solar",
    description:
      "Calcule orientación y sombras según la ubicación geográfica, la fecha y la hora del proyecto.",
  },
] as const;

export function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil size={18} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span className="text-lg font-semibold">Planos</span>
          </div>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <BookOpen size={16} aria-hidden="true" />
            Documentación
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <h1 className="max-w-2xl text-4xl md:text-5xl font-bold tracking-tight">
          Diseñe planos de construcción con precisión
        </h1>
        <p className="max-w-xl mt-5 text-lg text-gray-600 dark:text-gray-300">
          Un editor de plantas para el sector de la construcción: medidas reales
          en centímetros, simulación solar y exportación a PNG — todo en el navegador.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/editor"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Comenzar
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Ver documentación
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-12 grid gap-6 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 dark:border-gray-800 p-5"
            >
              <feature.icon
                size={20}
                className="text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
              <h2 className="mt-3 text-base font-semibold">{feature.title}</h2>
              <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-6 text-sm text-gray-500 dark:text-gray-400">
          Planos — herramientas para el diseño y la documentación de proyectos de construcción.
        </div>
      </footer>
    </main>
  );
}
