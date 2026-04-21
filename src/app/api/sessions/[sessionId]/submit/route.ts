import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { finishSession, getSession, storeResponse } from "@/lib/server/repository";
import { gradeQuestionAnswer } from "@/lib/server/study-pipeline";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const body = (await request.json()) as {
    questionId?: string;
    answer?: string;
    confidence?: number;
    timeSeconds?: number;
    complete?: boolean;
  };

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (body.complete) {
    const score = finishSession(sessionId);
    revalidatePath(`/workspace/${session.workspaceId}`);
    return NextResponse.json({ ok: true, score });
  }

  if (!body.questionId || !body.answer) {
    return NextResponse.json({ error: "questionId and answer are required." }, { status: 400 });
  }

  const grading = await gradeQuestionAnswer({
    workspaceId: session.workspaceId,
    questionId: body.questionId,
    answer: body.answer,
  });

  storeResponse({
    sessionId,
    workspaceId: session.workspaceId,
    questionId: body.questionId,
    answerText: body.answer,
    confidence: body.confidence ?? 0.5,
    timeSeconds: body.timeSeconds ?? 0,
    grading,
  });

  revalidatePath(`/workspace/${session.workspaceId}`);

  return NextResponse.json({ grading });
}
