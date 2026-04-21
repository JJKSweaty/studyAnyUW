"use client";

import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "./ui/button";

export function FocusedDrillButton({
  workspaceId,
  topicTitle,
  struggleNote,
  compact = false,
}: {
  workspaceId: string;
  topicTitle: string;
  struggleNote?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}/drill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicTitle,
          struggleNote,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        insertedCount?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not generate a focused drill.");
      }

      return payload;
    },
    onSuccess: (payload) => {
      toast.success(
        payload.insertedCount && payload.insertedCount > 0
          ? `Added ${payload.insertedCount} new question(s) for ${topicTitle}.`
          : `No new questions were added for ${topicTitle}; the generated set matched existing ones.`,
      );
      router.refresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not generate a focused drill.");
    },
  });

  return (
    <Button
      variant={compact ? "ghost" : "outline"}
      size={compact ? "sm" : "md"}
      className={compact ? "gap-2 text-zinc-300 hover:text-zinc-100" : "gap-2"}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {mutation.isPending ? "Generating..." : "Generate more like this"}
    </Button>
  );
}
