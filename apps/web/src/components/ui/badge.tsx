import { cn } from "@safecast/ui/lib/utils";
import * as React from "react";

const badgeVariants = {
  default: "border-transparent bg-sky-600 text-white",
  secondary: "border-transparent bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-50",
  outline: "text-foreground",
  warning: "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100",
  destructive: "border-red-300 bg-red-100 text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
} as const;

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof badgeVariants }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
