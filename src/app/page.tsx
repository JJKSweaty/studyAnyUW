import Link from "next/link";
import { ArrowRight, Brain, FolderOpenDot, Sparkles, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { CreateCourseWorkspace } from "@/components/create-course-workspace";
import { ImportWorkspaceForm } from "@/components/import-workspace-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ensureDefaultProviderProfiles } from "@/lib/server/bootstrap";
import { getActiveProviderProfile, listCourses, listWorkspaces } from "@/lib/server/repository";
import { humanAgo } from "@/lib/utils";

export default function DashboardPage() {
  ensureDefaultProviderProfiles();
  const courses = listCourses();
  const workspaces = listWorkspaces();
  const activeProvider = getActiveProviderProfile();

  return (
    <AppShell
      title="Local study trainer"
      eyebrow="Dashboard"
      actions={
        <>
          <Link href="/upload">
            <Button variant="secondary">Upload files</Button>
          </Link>
          <Link href="/paste">
            <Button>Paste notes</Button>
          </Link>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Courses</p>
              <p className="mt-4 text-3xl font-semibold text-zinc-50">{courses.length}</p>
              <p className="mt-2 text-sm text-zinc-400">Private local courses with independent workspaces.</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Workspaces</p>
              <p className="mt-4 text-3xl font-semibold text-zinc-50">{workspaces.length}</p>
              <p className="mt-2 text-sm text-zinc-400">Each workspace owns its own topics, questions, and review state.</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Provider</p>
              <p className="mt-4 text-lg font-semibold text-zinc-50">
                {activeProvider ? activeProvider.name : "Not configured"}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {activeProvider ? `${activeProvider.providerType} • ${activeProvider.modelName}` : "Connect a local model server in Settings."}
              </p>
            </Card>
          </div>

          {!activeProvider ? (
            <Card className="border-amber-400/30 bg-amber-400/8">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-300" />
                <div>
                  <p className="font-medium text-amber-100">Local provider not reachable yet</p>
                  <p className="mt-2 text-sm text-amber-50/80">
                    The app still stores everything locally, but topic extraction, question generation,
                    semantic search, and grading are stronger once a local model server is running.
                  </p>
                  <Link href="/settings" className="mt-4 inline-flex items-center gap-2 text-sm text-amber-200">
                    Open settings <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </Card>
          ) : null}

          <CreateCourseWorkspace
            courses={courses.map((course) => ({
              id: course.id,
              name: course.name,
              code: course.code,
            }))}
          />

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Recent workspaces</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Jump back into drill sessions, mistake review, or source-grounded topic cleanup.
                </p>
              </div>
              <Link href="/courses">
                <Button variant="outline">View all</Button>
              </Link>
            </div>
            <div className="space-y-4">
              {workspaces.length > 0 ? (
                workspaces.slice(0, 6).map((workspace) => (
                  <Link key={workspace.id} href={`/workspace/${workspace.id}`}>
                    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-zinc-100">{workspace.name}</p>
                          <p className="mt-1 text-sm text-zinc-400">
                            {workspace.courseName} • {workspace.questionCount} questions • {workspace.documentCount} workspace sources
                          </p>
                        </div>
                        <Badge>{Math.round(workspace.accuracy * 100)}% accuracy</Badge>
                      </div>
                      <p className="mt-3 text-sm text-zinc-300">
                        {workspace.conciseSummary || workspace.description || "No summary yet. Ingest content to build one."}
                      </p>
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Weak topics</p>
                          <p className="mt-2 text-lg font-semibold text-zinc-100">{workspace.weakTopicCount}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Due review</p>
                          <p className="mt-2 text-lg font-semibold text-zinc-100">{workspace.dueReviewCount}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Updated</p>
                          <p className="mt-2 text-lg font-semibold text-zinc-100">{humanAgo(workspace.updatedAt)}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50 p-10 text-center">
                  <p className="text-lg font-semibold text-zinc-100">No workspaces yet</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Create a workspace, then upload PDFs or paste notes to generate your first study pack.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_40%)]" />
            <div className="relative">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-amber-300">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-zinc-50">
                Built for active recall, not passive scrolling
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Upload files or paste messy AI output, then convert it into grounded topics, adaptive quizzes,
                teach-back prompts, and a review queue that follows your weak spots.
              </p>
              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <div className="flex items-center gap-3">
                    <FolderOpenDot className="h-5 w-5 text-lime-300" />
                    <div>
                      <p className="font-medium text-zinc-100">Workflow A</p>
                      <p className="text-sm text-zinc-400">Upload PDFs, DOCX, Markdown, text files, or image context.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <div className="flex items-center gap-3">
                    <Brain className="h-5 w-5 text-amber-300" />
                    <div>
                      <p className="font-medium text-zinc-100">Workflow B</p>
                      <p className="text-sm text-zinc-400">Paste topic breakdowns, notes, or generated question banks.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <ImportWorkspaceForm />

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Weak topic radar</h3>
                <p className="mt-1 text-sm text-zinc-400">Surface the workspaces that need attention first.</p>
              </div>
            </div>
            <div className="space-y-4">
              {workspaces.slice(0, 5).map((workspace) => {
                const mastery = Math.round(workspace.accuracy * 100);
                return (
                  <div key={workspace.id}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-zinc-200">{workspace.name}</span>
                      <span className="text-zinc-500">{mastery}%</span>
                    </div>
                    <Progress value={mastery} />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
