import Link from "next/link";
import { BarChart3, Brain, Files, Home, Settings, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/courses", label: "Courses", icon: Files },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/paste", label: "Paste", icon: Brain },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  children,
  title,
  eyebrow,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_30%),#09090b] text-zinc-50">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 md:px-6">
        <aside className="hidden w-72 shrink-0 rounded-[2rem] border border-zinc-800/80 bg-zinc-950/80 p-5 md:flex md:flex-col">
          <div className="mb-10">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-orange-400 to-lime-400 text-zinc-950">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">StudyAny Local</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Local-first study trainer for uploads, pasted notes, quizzes, and mistake review.
            </p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Principle</p>
            <p className="mt-2 text-sm text-zinc-300">
              The app owns the memory, review queue, and source grounding. The model is replaceable.
            </p>
          </div>
        </aside>

        <main className="flex-1">
          <header className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-zinc-800/80 bg-zinc-950/80 px-6 py-5 md:flex-row md:items-end md:justify-between">
            <div>
              {eyebrow ? (
                <p className="mb-2 text-xs uppercase tracking-[0.24em] text-zinc-500">{eyebrow}</p>
              ) : null}
              <h2 className="text-3xl font-semibold tracking-tight text-zinc-50">{title}</h2>
            </div>
            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
