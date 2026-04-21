import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}
