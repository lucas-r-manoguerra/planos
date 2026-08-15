/**
 * Layout raíz de la aplicación
 *
 * Proporciona ThemeProvider para dark mode, estructura base
 */

import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ContextMenuProvider } from "@/components/context-menu/ContextMenuProvider";
import { PanelProvider } from "@/components/panel/PanelProvider";
import { Toaster } from "@/components/feedback/Toaster";
import { THEME_STORAGE_KEY } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Planos - Editor de Planos de Construcción",
  description: "Editor interactivo de planos de construcción para normativa argentina",
};

// Script anti-FOUC: aplica la clase dark antes del primer paint leyendo
// SOLO la preferencia guardada (sin detectar el tema del sistema).
const noFlashScript = `(function(){try{if(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        <ThemeProvider>
          <ContextMenuProvider>
            {children}
            <PanelProvider />
            <Toaster />
          </ContextMenuProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
