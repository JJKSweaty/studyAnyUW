import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { CourseActions } from "@/components/course-actions";
import { CourseContextForm } from "@/components/course-context-form";
import { CreateWorkspaceInline } from "@/components/create-workspace-inline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCourseDetail } from "@/lib/server/repository";
import { humanAgo } from "@/lib/utils";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = getCourseDetail(courseId);

  if (!course) {
    notFound();
  }

  return (
    <AppShell
      title={course.name}
      eyebrow={course.code}
      actions={
        <>
          <Link href="/courses">
            <Button variant="outline">Back to courses</Button>
          </Link>
          <CourseActions courseId={course.id} archived={course.archived} />
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <CreateWorkspaceInline courseId={course.id} />
        <CourseContextForm courseId={course.id} courseName={course.name} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">Shared course context</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Reusable files and images that stay attached to the course instead of a single workspace.
              </p>
            </div>
            <Badge>{course.contextDocuments.length} item(s)</Badge>
          </div>
          <div className="space-y-3">
            {course.contextDocuments.length > 0 ? (
              course.contextDocuments.map((document) => (
                <div key={document.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <p className="font-semibold text-zinc-100">{document.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {document.kind} • {humanAgo(document.createdAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(document.stats).map(([key, value]) => (
                      <Badge key={key} className="border-zinc-700 bg-zinc-950 text-zinc-400">
                        {key}: {String(value)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50 p-8 text-sm text-zinc-500">
                No shared course context yet.
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">Workspaces</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Use separate workspaces for exam modes, chapter packs, or weak-topic drills.
              </p>
            </div>
            <Badge>{course.workspaces.length}</Badge>
          </div>
          <div className="space-y-3">
            {course.workspaces.map((workspace) => (
              <Link key={workspace.id} href={`/workspace/${workspace.id}`}>
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-zinc-100">{workspace.name}</p>
                    <Badge>{Math.round(workspace.accuracy * 100)}%</Badge>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">
                    {workspace.topicCount} topics • {workspace.questionCount} questions • {workspace.courseContextDocumentCount} shared context item(s)
                  </p>
                  <p className="mt-3 text-sm text-zinc-300">
                    {workspace.conciseSummary || workspace.description || "No summary yet."}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
