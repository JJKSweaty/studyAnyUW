import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { QuizClient } from "@/components/quiz-client";
import { Card } from "@/components/ui/card";
import { getSession } from "@/lib/server/repository";

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session;
  if (!sessionId) {
    notFound();
  }

  const session = getSession(sessionId);
  if (!session) {
    notFound();
  }

  return (
    <AppShell title="Quiz session" eyebrow={session.mode.replace(/_/g, " ")}>
      {session.questions.length > 0 ? (
        <QuizClient session={session} />
      ) : (
        <Card>
          <p className="text-lg font-semibold text-zinc-100">No questions in this session.</p>
        </Card>
      )}
    </AppShell>
  );
}
