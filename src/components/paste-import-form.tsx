"use client";

import { useMutation } from "@tanstack/react-query";
import { Brain, Copy, FileText, FolderOpen, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { buildExternalStudyPrompt } from "@/lib/paste-prompt";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

type SourceCard = {
  id: string;
  title: string;
  sourceType: string;
  kind: string;
  stats: Record<string, number | string>;
};

export function PasteImportForm({
  workspaceId,
  workspaceName,
  workspaceDescription,
  courseName,
  courseCode,
  conciseSummary,
  tags,
  documents,
  courseContextDocuments,
}: {
  workspaceId: string;
  workspaceName: string;
  workspaceDescription?: string;
  courseName: string;
  courseCode: string;
  conciseSummary?: string;
  tags: string[];
  documents: SourceCard[];
  courseContextDocuments: SourceCard[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [focusNote, setFocusNote] = useState("");
  const [text, setText] = useState("");

  const prompt = buildExternalStudyPrompt({
    workspaceName,
    workspaceDescription,
    courseName,
    courseCode,
    conciseSummary,
    tags,
    focusNote,
    workspaceSources: documents,
    sharedSources: courseContextDocuments,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}/paste`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          text,
        }),
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Paste import failed.");
      }
    },
    onSuccess: () => {
      toast.success("Pasted content converted into study material.");
      setText("");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Paste import failed.");
    },
  });

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied. Paste it into ChatGPT, Claude, or Gemini with your study sources.");
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-zinc-800 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_42%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_38%),rgba(9,9,11,0.96)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              Paste workflow
            </div>
            <h3 className="mt-4 text-xl font-semibold text-zinc-50">Use a stronger prompt, then paste the result back here</h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300">
              This prompt is tuned for ChatGPT, Claude, and Gemini. It asks for grounded topics, intuition-building
              explanations, and Q/A pairs that import cleanly into the app.
            </p>
          </div>
          <Button className="gap-2" onClick={copyPrompt}>
            <Copy className="h-4 w-4" />
            Copy study prompt
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">1. Send context</p>
            <p className="mt-2 text-sm text-zinc-300">Attach files or paste source excerpts alongside the prompt.</p>
          </div>
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">2. Get structured notes</p>
            <p className="mt-2 text-sm text-zinc-300">The response should include topic headings, definitions, and Q/A pairs.</p>
          </div>
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">3. Build the pack</p>
            <p className="mt-2 text-sm text-zinc-300">Paste the response below and let the app rebuild the topic and question bank.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-2 text-zinc-100">
              <Brain className="h-4 w-4 text-amber-300" />
              <p className="font-semibold">Prompt tuning</p>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Add a focus note if you want the external model to emphasize proofs, formulas, weak units, or upcoming exam scope.
            </p>
            <Input
              className="mt-4"
              placeholder="Optional: focus on derivations, tricky edge cases, or concepts I keep missing..."
              value={focusNote}
              onChange={(event) => setFocusNote(event.target.value)}
            />
            <Textarea className="mt-4 min-h-[320px] font-mono text-[13px] leading-6" value={prompt} readOnly />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SourcePanel
              icon={<FileText className="h-4 w-4 text-sky-300" />}
              title="Workspace sources"
              description="These are already attached to this workspace."
              sources={documents}
              emptyMessage="No workspace sources yet. Upload files or rely on attached chat files."
            />
            <SourcePanel
              icon={<FolderOpen className="h-4 w-4 text-lime-300" />}
              title="Shared course context"
              description="Reusable course-level files that support every workspace."
              sources={courseContextDocuments}
              emptyMessage="No shared course context added yet."
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Paste notes or AI output</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Paste the response you want converted into topics, questions, and retrieval-ready study material.
            </p>
          </div>
          <div className="space-y-3">
            <Input placeholder="Source title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Textarea
              placeholder="Paste raw study content here..."
              className="min-h-[420px]"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-400">
            Best results: keep headings intact, prefer Markdown over tables, and preserve consecutive `Q:` / `A:` lines.
          </div>
          <div className="flex justify-end">
            <Button onClick={() => mutation.mutate()} disabled={!text.trim() || mutation.isPending}>
              {mutation.isPending ? "Transforming..." : "Build study pack"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SourcePanel({
  icon,
  title,
  description,
  sources,
  emptyMessage,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  sources: SourceCard[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="font-semibold text-zinc-100">{title}</p>
      </div>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
      <div className="mt-4 space-y-3">
        {sources.length > 0 ? (
          sources.slice(0, 6).map((source) => (
            <div key={source.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
              <p className="font-medium text-zinc-100">{source.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {source.kind} • {source.sourceType}
                {formatPrimaryStats(source.stats) ? ` • ${formatPrimaryStats(source.stats)}` : ""}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">{emptyMessage}</p>
        )}
      </div>
      {sources.length > 6 ? (
        <p className="mt-3 text-xs text-zinc-500">+ {sources.length - 6} more source(s) included in the copied prompt.</p>
      ) : null}
    </div>
  );
}

function formatPrimaryStats(stats: Record<string, number | string>) {
  const preferred = ["pages", "characters", "chunks", "images"];
  return preferred
    .filter((key) => key in stats)
    .slice(0, 2)
    .map((key) => `${key}: ${String(stats[key])}`)
    .join(", ");
}
