import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 focus:border-amber-400",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
