/**
 * Ruta raíz `/`: landing page (Server Component).
 *
 * El editor vive en `/editor` (spec landing-page-1/2).
 */

import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Planos - Editor de Planos de Construcción",
  description:
    "Editor interactivo de planos de construcción para normativa argentina",
};

export default function Page() {
  return <LandingPage />;
}
