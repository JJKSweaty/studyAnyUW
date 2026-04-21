"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export function CreateWorkspaceInline({
  courseId,
}: {
  courseId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          name,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not create workspace.");
      }

      return (await response.json()) as { workspaceId: string };
    },
    onSuccess: (data) => {
      toast.success("Workspace created.");
      router.push(`/workspace/${data.workspaceId}`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not create workspace.");
    },
  });

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-zinc-100">Add a workspace</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Keep course context shared, then create focused workspaces for exams, modules, or topic packs.
        </p>
      </div>
      <div className="space-y-3">
        <Input
          placeholder="Workspace name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Textarea
          placeholder="Workspace description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="mt-4">
        <Button onClick={() => mutation.mutate()} disabled={!name || mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create workspace"}
        </Button>
      </div>
    </Card>
  );
}
