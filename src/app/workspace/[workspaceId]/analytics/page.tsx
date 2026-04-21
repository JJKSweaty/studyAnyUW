import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getWorkspaceDetail } from "@/lib/server/repository";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const workspace = getWorkspaceDetail(workspaceId);
  if (!workspace) {
    notFound();
  }

  const analytics = workspace.analytics;

  return (
    <AppShell title="Analytics" eyebrow={workspace.name}>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Questions answered</p>
          <p className="mt-4 text-3xl font-semibold text-zinc-50">{analytics.responseCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Sessions</p>
          <p className="mt-4 text-3xl font-semibold text-zinc-50">{analytics.sessionCount}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Average score</p>
          <p className="mt-4 text-3xl font-semibold text-zinc-50">{Math.round(analytics.averageScore * 100)}%</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Average response time</p>
          <p className="mt-4 text-3xl font-semibold text-zinc-50">{Math.round(analytics.averageTimeSeconds)}s</p>
        </Card>
      </div>

      <div className="mt-6 space-y-4">
        {analytics.topicBreakdown.map((topic) => (
          <Card key={topic.topic}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">{topic.topic}</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {topic.total} response(s) • {Math.round(topic.averageTimeSeconds)}s average time
                </p>
              </div>
              <p className="text-xl font-semibold text-zinc-100">{Math.round(topic.accuracy * 100)}%</p>
            </div>
            <div className="mt-4">
              <Progress value={topic.accuracy * 100} />
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
