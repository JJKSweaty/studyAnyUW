"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Card } from "./ui/card";

const sessionModes = [
  { id: "quick_drill", title: "Quick 10 question drill", description: "Fast mixed recall across the workspace." },
  { id: "weak_topics", title: "Weak topics only", description: "Reinforce mistakes and low-confidence material." },
  { id: "mixed_review", title: "Mixed review", description: "Balanced review with concept and comparison questions." },
  { id: "exam_simulation", title: "Exam simulation", description: "Longer session with more pressure." },
  { id: "teach_back", title: "Teach back mode", description: "Explain theory in your own words and get graded." },
] as const;

export function StartSessionGrid({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (mode: (typeof sessionModes)[number]["id"]) => {
      const response = await fetch(`/api/workspaces/${workspaceId}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Could not start session.");
      }
      return (await response.json()) as { sessionId: string };
    },
    onSuccess: (data) => {
      router.push(`/workspace/${workspaceId}/quiz?session=${data.sessionId}`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not start session.");
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {sessionModes.map((mode) => (
        <Card key={mode.id} className="flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">{mode.title}</h3>
            <p className="mt-2 text-sm text-zinc-400">{mode.description}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => mutation.mutate(mode.id)}
            disabled={mutation.isPending}
          >
            Start session
          </Button>
        </Card>
      ))}
    </div>
  );
}
