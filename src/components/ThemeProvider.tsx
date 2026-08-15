"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import {
  saveThemePreference,
  type ThemePreference,
} from "@/lib/storage";

type Theme = ThemePreference;

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Aplica un tema mutando el DOM (clase .dark en <html>) y lo persiste.
 * El DOM es la fuente de verdad: notificar vía un evento custom permite
 * que useSyncExternalStore observe el cambio sin setState dentro de efectos.
 *
 * La clase inicial ya la aplicó el script anti-FOUC en layout.tsx
 * (solo lee la preferencia guardada — no detecta el tema del sistema).
 */
function applyTheme(next: Theme) {
  document.documentElement.classList.toggle("dark", next === "dark");
  saveThemePreference(next);
  window.dispatchEvent(new Event("planos-theme"));
}

function subscribe(onChange: () => void) {
  window.addEventListener("planos-theme", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("planos-theme", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === "light" ? "dark" : "light");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
