import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-300",
        className,
      )}
    >
      {children}
    </span>
  );
}
