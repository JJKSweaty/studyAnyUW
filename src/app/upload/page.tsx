import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { listWorkspaces } from "@/lib/server/repository";

export default function UploadPage() {
  const workspaces = listWorkspaces();

  return (
    <AppShell title="Upload materials" eyebrow="Ingestion">
      <Card>
        <h3 className="text-lg font-semibold text-zinc-100">Choose a workspace</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Upload is scoped per workspace so retrieval, topic extraction, and analytics remain portable.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link key={workspace.id} href={`/workspace/${workspace.id}`}>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 transition hover:border-zinc-700">
                <p className="font-semibold text-zinc-100">{workspace.name}</p>
                <p className="mt-2 text-sm text-zinc-400">{workspace.courseName}</p>
                <p className="mt-3 text-sm text-zinc-300">
                  {workspace.documentCount} docs • {workspace.questionCount} questions
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
