"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";

export function CourseContextForm({
  courseId,
  courseName,
}: {
  courseId: string;
  courseName: string;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      Array.from(files ?? []).forEach((file) => formData.append("files", file));
      formData.append("note", note);

      const response = await fetch(`/api/courses/${courseId}/context`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Could not attach course context.");
      }
    },
    onSuccess: () => {
      toast.success(`Course context added to ${courseName}.`);
      setNote("");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not attach course context.");
    },
  });

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-zinc-100">Course context library</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Upload reusable files and images once at the course level. New and existing workspaces can use them as shared context.
        </p>
      </div>
      <input
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,.markdown,.png,.jpg,.jpeg,.webp,.gif"
        onChange={(event) => setFiles(event.target.files)}
        className="block w-full rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 px-4 py-8 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-100"
      />
      <Textarea
        className="mt-4"
        placeholder="Optional note for this batch, especially useful for diagrams and screenshots."
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          Efficient path: text files are parsed directly, and images store a compact note/summary instead of duplicating raw pixels in the index.
        </p>
        <Button onClick={() => mutation.mutate()} disabled={!files?.length || mutation.isPending}>
          {mutation.isPending ? "Adding..." : "Add course context"}
        </Button>
      </div>
    </Card>
  );
}
