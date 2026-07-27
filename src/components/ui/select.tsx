/**
 * Componente de selección (select)
 * Implementación simple usando <select> nativo con API compatible con shadcn/ui
 */

import * as React from "react";
import { cn } from "@/lib/utils";

/* ---------- SelectItem (marcador) ---------- */

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

function SelectItem(_props: SelectItemProps) {
  return null;
}

/* ---------- SelectValue ---------- */

interface SelectValueProps {
  placeholder?: string;
}

function SelectValue({ placeholder }: SelectValueProps) {
  return <>{placeholder}</>;
}

/* ---------- SelectTrigger ---------- */

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

function SelectTrigger({ children, className }: SelectTriggerProps) {
  return <div className={cn("hidden", className)}>{children}</div>;
}

/* ---------- SelectContent ---------- */

interface SelectContentProps {
  children: React.ReactNode;
}

function SelectContent({ children }: SelectContentProps) {
  return <>{children}</>;
}

/* ---------- Select (principal) ---------- */

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

function Select({ value, onValueChange, children }: SelectProps) {
  // Extraer items del children (SelectItem)
  const items = React.useMemo(() => {
    const flat = React.Children.toArray(children);
    const result: { value: string; label: string }[] = [];
    for (const child of flat) {
      if (React.isValidElement(child) && child.type === SelectItem) {
        const props = child.props as SelectItemProps;
        result.push({ value: props.value, label: String(props.children) });
      }
    }
    return result;
  }, [children]);

  return (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={cn(
        "flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors",
        "text-gray-900",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      )}
    >
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
