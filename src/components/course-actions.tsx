"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "./ui/button";

export function CourseActions({
  courseId,
  archived,
}: {
  courseId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const archiveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: archived ? "restore" : "archive" }),
      });
      if (!response.ok) {
        throw new Error("Could not update course.");
      }
    },
    onSuccess: () => {
      toast.success(archived ? "Course restored." : "Course archived.");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update course.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Could not delete course.");
      }
    },
    onSuccess: () => {
      toast.success("Course deleted.");
      router.push("/courses");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete course.");
    },
  });

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => archiveMutation.mutate()}>
        {archived ? "Restore" : "Archive"}
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={() => {
          if (window.confirm("Delete this course and all attached workspaces/context?")) {
            deleteMutation.mutate();
          }
        }}
      >
        Delete
      </Button>
    </div>
  );
}
