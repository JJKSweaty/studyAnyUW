"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "./ui/button";

export function WorkspaceActions({
  workspaceId,
  archived,
}: {
  workspaceId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const archiveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: archived ? "restore" : "archive" }),
      });
      if (!response.ok) {
        throw new Error("Could not update workspace.");
      }
    },
    onSuccess: () => {
      toast.success(archived ? "Workspace restored." : "Workspace archived.");
      router.refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Could not delete workspace.");
      }
    },
    onSuccess: () => {
      toast.success("Workspace deleted.");
      router.push("/courses");
      router.refresh();
    },
  });

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => archiveMutation.mutate()}>
        {archived ? "Restore workspace" : "Archive workspace"}
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={() => {
          if (window.confirm("Delete this workspace and all local study history?")) {
            deleteMutation.mutate();
          }
        }}
      >
        Delete workspace
      </Button>
    </div>
  );
}
