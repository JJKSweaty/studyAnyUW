import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-amber-400 text-zinc-950 hover:bg-amber-300",
        secondary: "bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
        ghost: "bg-transparent text-zinc-200 hover:bg-zinc-900",
        outline: "border border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700",
        danger: "bg-red-500 text-white hover:bg-red-400",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-11 px-4",
        lg: "h-12 px-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";
