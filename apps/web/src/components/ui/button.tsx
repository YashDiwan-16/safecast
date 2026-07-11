import { cn } from "@safecast/ui/lib/utils";
import * as React from "react";

const variants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  accent: "bg-sky-500 text-white hover:bg-sky-400",
  secondary: "bg-emerald-100 text-emerald-950 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-50 dark:hover:bg-emerald-900",
  outline: "border border-border bg-background hover:bg-muted",
  ghost: "hover:bg-muted",
  destructive: "bg-red-600 text-white hover:bg-red-500",
  link: "text-sky-600 underline-offset-4 hover:underline dark:text-sky-300",
} as const;

const sizes = {
  default: "h-10 px-4 py-2",
  sm: "h-8 px-3 text-xs",
  lg: "h-11 px-5",
  icon: "size-10",
} as const;

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
