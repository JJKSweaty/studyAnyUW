import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { FocusedDrillButton } from "@/components/focused-drill-button";
import { PasteImportForm } from "@/components/paste-import-form";
import { StartSessionGrid } from "@/components/start-session-grid";
import { UploadMaterialForm } from "@/components/upload-material-form";
import { WorkspaceActions } from "@/components/workspace-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getWorkspaceDetail } from "@/lib/server/repository";
import { humanAgo } from "@/lib/utils";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const workspace = getWorkspaceDetail(workspaceId);

  if (!workspace) {
    notFound();
  }

  return (
    <AppShell
      title={workspace.name}
      eyebrow={`${workspace.courseCode} • ${workspace.courseName}`}
      actions={
        <>
          <Link href={`/courses/${workspace.courseId}`}>
            <Button variant="outline">Course hub</Button>
          </Link>
          <Link href={`/workspace/${workspaceId}/mistakes`}>
            <Button variant="secondary">Review mistakes</Button>
          </Link>
          <Link href={`/workspace/${workspaceId}/analytics`}>
            <Button variant="outline">Analytics</Button>
          </Link>
          <a href={`/api/workspaces/${workspaceId}/export`}>
            <Button>Export workspace</Button>
          </a>
          <WorkspaceActions workspaceId={workspaceId} archived={workspace.status === "archived"} />
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-4">
          <Card>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Documents</p>
            <p className="mt-4 text-3xl font-semibold text-zinc-50">{workspace.documents.length}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Topics</p>
            <p className="mt-4 text-3xl font-semibold text-zinc-50">{workspace.topics.length}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Question bank</p>
            <p className="mt-4 text-3xl font-semibold text-zinc-50">{workspace.questions.length}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Mistakes queued</p>
            <p className="mt-4 text-3xl font-semibold text-zinc-50">{workspace.mistakes.length}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Course context</p>
            <p className="mt-4 text-3xl font-semibold text-zinc-50">{workspace.courseContextDocuments.length}</p>
          </Card>
        </div>

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap gap-2">
                {workspace.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-zinc-50">Study guide</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                {workspace.conciseSummary || "No summary yet. Upload or paste material to generate one."}
              </p>
              {workspace.detailedSummary ? (
                <p className="mt-4 text-sm leading-6 text-zinc-400">{workspace.detailedSummary}</p>
              ) : null}
            </div>
            <div className="min-w-60 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Recent sessions</p>
              <div className="mt-3 space-y-3">
                {workspace.recentSessions.length > 0 ? (
                  workspace.recentSessions.map((session) => (
                    <div key={session.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium capitalize text-zinc-100">
                          {session.mode.replace(/_/g, " ")}
                        </span>
                        <Badge>{Math.round(session.score * 100)}%</Badge>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">{humanAgo(session.startedAt)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No study sessions yet.</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <StartSessionGrid workspaceId={workspaceId} />

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <UploadMaterialForm workspaceId={workspaceId} workspaceName={workspace.name} />
          <PasteImportForm
            workspaceId={workspaceId}
            workspaceName={workspace.name}
            workspaceDescription={workspace.description}
            courseName={workspace.courseName}
            courseCode={workspace.courseCode}
            conciseSummary={workspace.conciseSummary}
            tags={workspace.tags}
            documents={workspace.documents}
            courseContextDocuments={workspace.courseContextDocuments}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-zinc-100">Topic explorer</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Topics, key points, common mistakes, and source-grounded summaries.
              </p>
            </div>
            <div className="space-y-4">
              {workspace.topics.map((topic) => (
                <div key={topic.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold text-zinc-50">{topic.title}</h4>
                      <p className="mt-2 text-sm text-zinc-300">{topic.summary}</p>
                    </div>
                    <Badge>{Math.round(topic.mastery * 100)}%</Badge>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <FocusedDrillButton workspaceId={workspaceId} topicTitle={topic.title} compact />
                  </div>
                  <div className="mt-4">
                    <Progress value={topic.mastery * 100} />
                  </div>
                  {topic.keyPoints.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Key points</p>
                      <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                        {topic.keyPoints.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {topic.commonMistakes.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Common mistakes</p>
                      <ul className="mt-2 space-y-2 text-sm text-zinc-400">
                        {topic.commonMistakes.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Question bank</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Editability is planned, but the MVP already stores every generated question locally.
                </p>
              </div>
              <Link href={`/workspace/${workspaceId}/mistakes`}>
                <Button variant="outline">Mistake review</Button>
              </Link>
            </div>
            <div className="space-y-3">
              {workspace.questions.slice(0, 16).map((question) => (
                <div key={question.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{question.topicTitle}</Badge>
                    <Badge className="border-zinc-700 bg-zinc-950 text-zinc-400">{question.type}</Badge>
                    <Badge className="border-zinc-700 bg-zinc-950 text-zinc-400">{question.difficulty}</Badge>
                  </div>
                  <p className="mt-3 font-medium text-zinc-100">{question.questionText}</p>
                  <p className="mt-2 text-sm text-zinc-400">{question.explanation}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-zinc-100">Source library</h3>
            <p className="mt-1 text-sm text-zinc-400">Every document or paste source is stored locally and can be re-used for retrieval.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workspace.documents.map((document) => (
              <div key={document.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="font-semibold text-zinc-100">{document.title}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {document.sourceType} • {document.kind} • {humanAgo(document.createdAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(document.stats).map(([key, value]) => (
                    <Badge key={key} className="border-zinc-700 bg-zinc-950 text-zinc-400">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">Shared course context</h3>
              <p className="mt-1 text-sm text-zinc-400">
                These files and images live at the course level and support every workspace in the course.
              </p>
            </div>
            <Link href={`/courses/${workspace.courseId}`}>
              <Button variant="outline">Manage course context</Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workspace.courseContextDocuments.map((document) => (
              <div key={document.id} className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="font-semibold text-zinc-100">{document.title}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {document.sourceType} • {document.kind} • {humanAgo(document.createdAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(document.stats).map(([key, value]) => (
                    <Badge key={key} className="border-zinc-700 bg-zinc-950 text-zinc-400">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
