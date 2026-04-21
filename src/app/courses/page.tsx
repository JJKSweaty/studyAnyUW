import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { CourseActions } from "@/components/course-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listCourses, listWorkspaces } from "@/lib/server/repository";
import { humanAgo } from "@/lib/utils";

export default function CoursesPage() {
  const courses = listCourses();
  const workspaces = listWorkspaces();

  return (
    <AppShell title="Courses and workspaces" eyebrow="Courses">
      <div className="space-y-6">
        {courses.map((course) => (
          <Card key={course.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Link href={`/courses/${course.id}`}>
                    <h3 className="text-xl font-semibold text-zinc-50 transition hover:text-amber-200">
                      {course.name}
                    </h3>
                  </Link>
                  <Badge>{course.code}</Badge>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{course.description || "No description provided."}</p>
              </div>
              <div className="text-right text-sm text-zinc-500">
                <p>{course.workspaceCount} workspace(s)</p>
                <p>{course.questionCount} questions</p>
                <p>{course.contextDocumentCount} shared context file(s)</p>
                <p>Updated {humanAgo(course.updatedAt)}</p>
                <div className="mt-3 flex justify-end">
                  <CourseActions courseId={course.id} archived={course.archived} />
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workspaces
                .filter((workspace) => workspace.courseId === course.id)
                .map((workspace) => (
                  <Link key={workspace.id} href={`/workspace/${workspace.id}`}>
                    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700">
                      <p className="font-semibold text-zinc-100">{workspace.name}</p>
                      <p className="mt-2 text-sm text-zinc-400">
                        {workspace.topicCount} topics • {workspace.questionCount} questions
                      </p>
                      <p className="mt-3 text-sm text-zinc-300">
                        {workspace.conciseSummary || workspace.description || "No summary yet."}
                      </p>
                    </div>
                  </Link>
                ))}
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
