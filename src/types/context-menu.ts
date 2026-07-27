/**
 * Tipos para el menú contextual
 */

// Item del menú contextual
export interface ContextMenuItem {
  label: string;
  icon?: string;
  action?: () => void;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
}

// Estado del menú contextual
export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}
