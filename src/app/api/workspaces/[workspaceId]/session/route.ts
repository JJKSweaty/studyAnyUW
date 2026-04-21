import { NextResponse } from "next/server";

import { startSessionForWorkspace } from "@/lib/server/session-builder";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const body = (await request.json()) as {
    mode?:
      | "quick_drill"
      | "weak_topics"
      | "mixed_review"
      | "exam_simulation"
      | "flashcard_review"
      | "teach_back";
  };

  if (!body.mode) {
    return NextResponse.json({ error: "Session mode is required." }, { status: 400 });
  }

  const sessionId = startSessionForWorkspace({
    workspaceId,
    mode: body.mode,
  });

  return NextResponse.json({ sessionId });
}
