import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-zinc-900", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-lime-400 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
