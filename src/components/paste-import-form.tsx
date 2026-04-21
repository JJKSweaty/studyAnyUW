"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export function PasteImportForm({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

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

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Paste notes or AI output</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Use this for copied ChatGPT/Gemini notes, question banks, study outlines, or rough lecture notes.
        </p>
      </div>
      <div className="space-y-3">
        <Input placeholder="Source title" value={title} onChange={(event) => setTitle(event.target.value)} />
        <Textarea
          placeholder="Paste raw study content here..."
          className="min-h-[260px]"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => mutation.mutate()} disabled={!text.trim() || mutation.isPending}>
          {mutation.isPending ? "Transforming..." : "Build study pack"}
        </Button>
      </div>
    </Card>
  );
}
