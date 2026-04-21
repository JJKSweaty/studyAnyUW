import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getWorkspaceDetail } from "@/lib/server/repository";

export default async function MistakesPage({
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
    <AppShell title="Mistake review" eyebrow={workspace.name}>
      <div className="space-y-4">
        {workspace.mistakes.length > 0 ? (
          workspace.mistakes.map((mistake) => (
            <Card key={mistake.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{mistake.topicTitle}</Badge>
                <Badge className="border-zinc-700 bg-zinc-950 text-zinc-400">{mistake.type}</Badge>
                <Badge className="border-zinc-700 bg-zinc-950 text-zinc-400">{mistake.difficulty}</Badge>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-zinc-50">{mistake.questionText}</h3>
              <p className="mt-3 text-sm text-zinc-400">
                Queue reason: {mistake.reason} • Priority {mistake.priority.toFixed(2)}
              </p>
              {mistake.answerText ? (
                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Last answer</p>
                  <p className="mt-2 text-sm text-zinc-300">{mistake.answerText}</p>
                </div>
              ) : null}
            </Card>
          ))
        ) : (
          <Card>
            <p className="text-lg font-semibold text-zinc-100">No mistakes queued yet.</p>
            <p className="mt-2 text-sm text-zinc-500">
              Complete a session first. Incorrect or uncertain answers will appear here.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
