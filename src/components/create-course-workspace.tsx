"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export function CreateCourseWorkspace({
  courses,
}: {
  courses: Array<{ id: string; name: string; code: string }>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"existing" | "new">(courses.length > 0 ? "existing" : "new");
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? "");
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      let courseId = selectedCourseId;

      if (mode === "new") {
        const courseResponse = await fetch("/api/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: courseName,
            code: courseCode,
            description,
          }),
        });

        if (!courseResponse.ok) {
          throw new Error("Could not create course.");
        }

        const courseData = (await courseResponse.json()) as { courseId: string };
        courseId = courseData.courseId;
      }

      const workspaceResponse = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          name: workspaceName,
          description,
        }),
      });

      if (!workspaceResponse.ok) {
        throw new Error("Could not create workspace.");
      }

      return (await workspaceResponse.json()) as { workspaceId: string };
    },
    onSuccess: async (data) => {
      toast.success("Workspace created.");
      await queryClient.invalidateQueries();
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
        <h3 className="text-lg font-semibold text-zinc-100">Create a course workspace</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Add a workspace to an existing course or spin up a new course and workspace in one step.
        </p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={mode === "existing" ? "primary" : "outline"} size="sm" onClick={() => setMode("existing")}>
          Existing course
        </Button>
        <Button variant={mode === "new" ? "primary" : "outline"} size="sm" onClick={() => setMode("new")}>
          New course
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {mode === "existing" ? (
          <select
            value={selectedCourseId}
            onChange={(event) => setSelectedCourseId(event.target.value)}
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 md:col-span-2"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.name}
              </option>
            ))}
          </select>
        ) : (
          <>
            <Input
              placeholder="Course name"
              value={courseName}
              onChange={(event) => setCourseName(event.target.value)}
            />
            <Input
              placeholder="Course code"
              value={courseCode}
              onChange={(event) => setCourseCode(event.target.value)}
            />
          </>
        )}
        <Input
          className="md:col-span-2"
          placeholder="Workspace name"
          value={workspaceName}
          onChange={(event) => setWorkspaceName(event.target.value)}
        />
        <Textarea
          className="md:col-span-2"
          placeholder="Description or exam scope"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="mt-4">
        <Button
          onClick={() => mutation.mutate()}
          disabled={
            !workspaceName ||
            mutation.isPending ||
            (mode === "new" ? !courseName || !courseCode : !selectedCourseId)
          }
        >
          {mutation.isPending ? "Creating..." : "Create workspace"}
        </Button>
      </div>
    </Card>
  );
}
