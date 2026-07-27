/**
 * Layout raíz de la aplicación
 *
 * Proporciona la estructura base: sidebar + área de contenido principal
 */

import type { Metadata } from "next";
import "./globals.css";
import { ContextMenuProvider } from "@/components/context-menu/ContextMenuProvider";
import { PanelProvider } from "@/components/panel/PanelProvider";

export const metadata: Metadata = {
  title: "Planos - Editor de Planos de Construcción",
  description: "Editor interactivo de planos de construcción para normativa argentina",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <ContextMenuProvider>
          {children}
          <PanelProvider />
        </ContextMenuProvider>
      </body>
    </html>
  );
}
