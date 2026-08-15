/**
 * Preferencia de tema (claro/oscuro).
 *
 * Separado de storage.ts para mantener cada módulo acotado
 * (regla "One File = One Task", límite ~300 líneas).
 */

// Clave usada por el script anti-FOUC (layout.tsx), el ThemeProvider y el toggle
export const THEME_STORAGE_KEY = "theme";

export type ThemePreference = "light" | "dark";

// Cargar preferencia de tema guardada (null si el usuario nunca optó)
export function loadThemePreference(): ThemePreference | null {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : null;
}

// Persistir la preferencia de tema explícita del usuario
export function saveThemePreference(theme: ThemePreference): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}
