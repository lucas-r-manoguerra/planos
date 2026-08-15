/**
 * Límite de error por área.
 *
 * Captura errores de render de la sección que envuelve y muestra una UI de
 * recuperación sin romper el resto de la aplicación (spec feedback-system-2).
 * Los límites de error requieren un componente de clase.
 */

"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Nombre de la sección protegida (solo diagnóstico). */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const scope = this.props.label ? `: ${this.props.label}` : "";
    console.error(`[ErrorBoundary${scope}]`, error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Algo salió mal en esta sección
          </p>
          <p className="max-w-xs text-xs text-gray-500 dark:text-gray-400">
            Puede reintentar o recargar la página. El resto de la aplicación
            sigue funcionando.
          </p>
          <div className="flex gap-2">
            <button
              onClick={this.handleRetry}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-blue-700"
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
