/**
 * Guía de onboarding para nuevos usuarios.
 *
 * Muestra una guía paso a paso al abrir el editor por primera vez.
 * El cierre queda persistido en localStorage para que no reaparezca.
 */

"use client";

import { useEffect, useState } from "react";
import { Lightbulb, X, ChevronRight, ChevronLeft, MapPin, Home, Package, Check } from "lucide-react";

const HINT_DISMISSED_KEY = "planos:first-run-hint-dismissed";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: <MapPin size={18} className="text-blue-600 dark:text-blue-300" />,
    title: "1. Definí tu terreno",
    description:
      "En el panel lateral izquierdo, configurá el ancho, alto y frente del terreno. Elegí la zona normativa (R1, R2, C1) para validar contra la normativa de Gualeguay.",
  },
  {
    icon: <Home size={18} className="text-blue-600 dark:text-blue-300" />,
    title: "2. Dibujá habitaciones",
    description:
      "Seleccioná la herramienta de pared en la barra superior y dibujá las paredes de cada ambiente. Las habitaciones se crean automáticamente al cerrar un sector.",
  },
  {
    icon: <Package size={18} className="text-blue-600 dark:text-blue-300" />,
    title: "3. Colocá mobiliario",
    description:
      "Desde el panel lateral, arrastrá muebles, puertas, ventanas y escaleras al canvas. Use snap para alinearlos a las paredes.",
  },
  {
    icon: <Check size={18} className="text-blue-600 dark:text-blue-300" />,
    title: "4. Validá tu plano",
    description:
      "El sistema valida automáticamente contra normativa: dimensiones mínimas, iluminación, FOS/FOT, retiros. Los errores aparecen en el panel de validación.",
  },
];

export function FirstRunHint() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (localStorage.getItem(HINT_DISMISSED_KEY) !== "1") {
        setVisible(true);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const dismiss = () => {
    localStorage.setItem(HINT_DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Guía de inicio"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={dismiss}
    >
      <div
        className="w-[min(92vw,28rem)] rounded-xl border border-blue-200 bg-white p-5 shadow-2xl dark:border-blue-800 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-blue-600 dark:text-blue-300" />
            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Bienvenido a Planos
            </h2>
          </div>
          <button
            onClick={dismiss}
            aria-label="Cerrar guía"
            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step content */}
        <div className="flex items-start gap-3 mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/50">
          <div className="shrink-0 mt-0.5">{current.icon}</div>
          <div>
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {current.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              {current.description}
            </p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-4 bg-blue-600 dark:bg-blue-400"
                  : i < step
                    ? "w-1.5 bg-blue-300 dark:bg-blue-600"
                    : "w-1.5 bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 rounded px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ChevronLeft size={14} /> Anterior
          </button>

          {isLast ? (
            <button
              onClick={dismiss}
              className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              ¡Empezar!
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              Siguiente <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Skip */}
        <button
          onClick={dismiss}
          className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Saltar guía
        </button>
      </div>
    </div>
  );
}
