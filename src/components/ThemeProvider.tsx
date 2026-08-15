"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const THEME_KEY = "theme";

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
 */
function applyTheme(next: Theme) {
  document.documentElement.classList.toggle("dark", next === "dark");
  localStorage.setItem(THEME_KEY, next);
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

  // Aplicar el tema inicial (guardado o preferencia del sistema) al montar.
  // Solo escribe DOM + localStorage: el re-render lo dispara el evento de
  // applyTheme, no setState dentro de un efecto.
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const initial: Theme =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    applyTheme(initial);
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(theme === "light" ? "dark" : "light");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
