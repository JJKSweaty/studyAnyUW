"use client";

import { Download, ExternalLink, Play, Server, X } from "lucide-react";
import { useState } from "react";

import { Button } from "./ui/button";
import { Card } from "./ui/card";

const installCommand = "irm https://ollama.com/install.ps1 | iex";
const startCommand = "ollama serve";
const pullCommand = "ollama pull qwen3:8b";

export function OllamaSetupModal({
  triggerLabel = "Set up Ollama",
}: {
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="relative max-h-[90vh] w-full max-w-3xl overflow-auto p-6">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border border-zinc-800 p-2 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Ollama Setup</p>
              <h3 className="mt-2 text-2xl font-semibold text-zinc-50">
                Install and start Ollama on Windows
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                The web app cannot install or launch Windows applications by itself. Browser and web-app
                sandboxing prevent starting `ollama.exe` directly. What it can do is show the exact official
                steps and then connect once Ollama is running on `http://localhost:11434`.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <Download className="h-5 w-5 text-amber-300" />
                  <p className="font-semibold text-zinc-100">1. Install Ollama</p>
                </div>
                <p className="text-sm text-zinc-300">
                  Official Windows docs say the easiest install path is `OllamaSetup.exe`, and Ollama’s
                  Windows download page also publishes a PowerShell installer command.
                </p>
                <pre className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200">
                  <code>{installCommand}</code>
                </pre>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => copy(installCommand)}>
                    Copy install command
                  </Button>
                  <a
                    href="https://ollama.com/download/windows"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700"
                  >
                    Download page <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <Server className="h-5 w-5 text-lime-300" />
                  <p className="font-semibold text-zinc-100">2. Start the local server</p>
                </div>
                <p className="text-sm text-zinc-300">
                  After installation, Ollama serves its API on `http://localhost:11434`. If the background
                  app is not already running, open PowerShell and start it.
                </p>
                <pre className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200">
                  <code>{startCommand}</code>
                </pre>
                <div className="mt-4">
                  <Button variant="secondary" onClick={() => copy(startCommand)}>
                    Copy start command
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
                <div className="mb-3 flex items-center gap-3">
                  <Play className="h-5 w-5 text-sky-300" />
                  <p className="font-semibold text-zinc-100">3. Download a model</p>
                </div>
                <p className="text-sm text-zinc-300">
                  For an RTX 3080, `qwen3:8b` is the safest starting point. After that, return to the app,
                  choose `Ollama`, then click `Test connection` and `Fetch models`.
                </p>
                <pre className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200">
                  <code>{pullCommand}</code>
                </pre>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="secondary" onClick={() => copy(pullCommand)}>
                    Copy model command
                  </Button>
                  <a
                    href="https://ollama.com/library/qwen3"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700"
                  >
                    Qwen3 library <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
                <p className="font-semibold text-zinc-100">About file upload in this app</p>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Text files and PDFs are parsed locally by the app first. That means the model does not need a
                  special “file upload” API for normal study imports. Images are different: the app stores them
                  locally either way, but a vision-capable model such as `qwen3-vl:8b` gives much better image
                  understanding than the plain fallback note-based summary.
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
