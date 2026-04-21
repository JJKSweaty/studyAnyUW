"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function ImportWorkspaceForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      }
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Import failed.");
      }
      return (await response.json()) as { workspaceId: string };
    },
    onSuccess: (data) => {
      toast.success("Workspace imported.");
      router.push(`/workspace/${data.workspaceId}`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Import failed.");
    },
  });

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Import workspace</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Import a previously exported workspace zip or the sample manifest in `examples/`.
        </p>
      </div>
      <input
        type="file"
        accept=".zip,.json"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="block w-full rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 px-4 py-8 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-100"
      />
      <div className="mt-4 flex justify-end">
        <Button disabled={!file || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Importing..." : "Import package"}
        </Button>
      </div>
    </Card>
  );
}
