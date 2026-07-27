/**
 * Componente de botón con variantes
 * Soporta variantes: default, ghost, outline, destructive
 */

import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = {
  default: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
  ghost: "bg-transparent hover:bg-gray-100 text-gray-700",
  outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700",
  destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
} as const;

const buttonSizes = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
