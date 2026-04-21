"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";

export function UploadMaterialForm({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      Array.from(files ?? []).forEach((file) => formData.append("files", file));
      formData.append("note", note);
      const response = await fetch(`/api/workspaces/${workspaceId}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Upload failed."));
      }
    },
    onSuccess: () => {
      toast.success(`Imported files into ${workspaceName}.`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    },
  });

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Upload study files</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Supports PDF, DOCX, TXT, Markdown, and common images. Legacy `.doc` files are not supported.
        </p>
      </div>
      <input
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md,.markdown,.png,.jpg,.jpeg,.webp,.gif"
        onChange={(event) => setFiles(event.target.files)}
        className="block w-full rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 px-4 py-8 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-100"
      />
      <Textarea
        className="mt-4"
        placeholder="Optional note for this upload batch. Useful for screenshots, diagrams, and image-heavy material."
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          Files are kept in `local-data/uploads/{workspaceId}` and images are indexed as compact text summaries.
        </p>
        <Button onClick={() => mutation.mutate()} disabled={!files?.length || mutation.isPending}>
          {mutation.isPending ? "Processing..." : "Ingest files"}
        </Button>
      </div>
    </Card>
  );
}

async function readErrorMessage(response: Response, fallback: string) {
  const raw = await response.text();

  if (!raw.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as { error?: string };
    return parsed.error ?? fallback;
  } catch {
    return raw;
  }
}
