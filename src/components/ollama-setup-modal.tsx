"use client";

import { Check, Copy, Download, ExternalLink, Play, Server, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "./ui/button";

const installCommand = "irm https://ollama.com/install.ps1 | iex";
const startCommand = "ollama serve";
const pullCommand = "ollama pull qwen3:8b";

const setupSteps = [
  {
    title: "Install Ollama",
    description:
      "Use the official Windows installer or the PowerShell bootstrap command. The app cannot install desktop software by itself.",
    icon: Download,
    accent: "text-amber-300",
    command: installCommand,
    copyLabel: "Copy install command",
    href: "https://ollama.com/download/windows",
    hrefLabel: "Open Windows download",
  },
  {
    title: "Start the local server",
    description:
      "After installation, start the local API if the desktop app is not already running in the background.",
    icon: Server,
    accent: "text-lime-300",
    command: startCommand,
    copyLabel: "Copy start command",
  },
  {
    title: "Pull a first model",
    description:
      "For this app, qwen3:8b is the safest baseline. After that, return to Settings and test the connection.",
    icon: Play,
    accent: "text-sky-300",
    command: pullCommand,
    copyLabel: "Copy model command",
    href: "https://ollama.com/library/qwen3",
    hrefLabel: "Open model library",
  },
];

export function OllamaSetupModal({
  triggerLabel = "Set up Ollama",
}: {
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copiedValue, setCopiedValue] = useState("");
  const canUseDom = typeof document !== "undefined";

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const modal = useMemo(() => {
    if (!canUseDom || !open) {
      return null;
    }

    const copy = async (value: string) => {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      window.setTimeout(() => setCopiedValue((current) => (current === value ? "" : current)), 1600);
    };

    return createPortal(
      <div className="fixed inset-0 z-[140]">
        <button
          type="button"
          aria-label="Close Ollama setup"
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />

        <div className="absolute inset-0 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto flex min-h-full max-w-5xl items-center justify-center">
            <div className="relative w-full overflow-hidden rounded-[2rem] border border-zinc-800/80 bg-zinc-950 shadow-[0_40px_120px_rgba(0,0,0,0.65)]">
              <div className="border-b border-zinc-800 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_24%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,0.98))] px-6 py-6 md:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-200">
                      <Sparkles className="h-3.5 w-3.5" />
                      Local provider setup
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">
                      Set up Ollama cleanly on Windows
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                      Follow the three steps below, then come back here to test the connection and fetch models. This
                      popup is rendered above the app shell, so it stays readable inside Settings.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-zinc-800 bg-zinc-950/80 p-2 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100"
                    onClick={() => setOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <InfoStat label="Default endpoint" value="http://127.0.0.1:11434/v1" />
                  <InfoStat label="Best starter model" value="qwen3:8b" />
                  <InfoStat label="What to do next" value="Test connection, then fetch models" />
                </div>
              </div>

              <div className="grid gap-6 px-6 py-6 md:px-8 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-4">
                  {setupSteps.map((step, index) => {
                    const Icon = step.icon;
                    const copied = copiedValue === step.command;

                    return (
                      <div key={step.title} className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/60 p-5">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
                            <Icon className={`h-5 w-5 ${step.accent}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                                Step {index + 1}
                              </span>
                              <p className="font-semibold text-zinc-100">{step.title}</p>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-zinc-300">{step.description}</p>
                            <pre className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-200">
                              <code>{step.command}</code>
                            </pre>
                            <div className="mt-4 flex flex-wrap gap-3">
                              <Button variant="secondary" className="gap-2" onClick={() => copy(step.command)}>
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Copied" : step.copyLabel}
                              </Button>
                              {step.href ? (
                                <a
                                  href={step.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700"
                                >
                                  {step.hrefLabel}
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/60 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">After setup</p>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
                      <li>Open Settings in this app.</li>
                      <li>Keep provider type on `Ollama`.</li>
                      <li>Use `http://127.0.0.1:11434/v1` as the base URL.</li>
                      <li>Press `Test connection`.</li>
                      <li>Press `Fetch models` and choose the model you pulled.</li>
                    </ul>
                  </div>

                  <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/60 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">How file handling works</p>
                    <p className="mt-3 text-sm leading-6 text-zinc-300">
                      Text files and PDFs are parsed locally first, so the app does not need a special remote file
                      upload API for normal study imports. Images stay local too, but a vision-capable model gives
                      stronger image summaries.
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-amber-400/20 bg-amber-400/8 p-5">
                    <p className="font-medium text-amber-100">Recommended first pass</p>
                    <p className="mt-2 text-sm leading-6 text-amber-50/90">
                      Start with `qwen3:8b`, confirm the app can talk to Ollama, then move up only if your machine has
                      enough headroom and the response quality actually improves.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }, [canUseDom, copiedValue, open]);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      {modal}
    </>
  );
}

function InfoStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}
