import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-400",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
