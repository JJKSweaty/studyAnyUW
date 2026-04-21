import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { appendQuestionsToWorkspace, getWorkspaceDetail } from "@/lib/server/repository";
import { generateFocusedTopicQuestions } from "@/lib/server/study-pipeline";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await params;
    const body = (await request.json()) as {
      topicTitle?: string;
      struggleNote?: string;
    };

    if (!body.topicTitle?.trim()) {
      return NextResponse.json({ error: "topicTitle is required." }, { status: 400 });
    }

    const workspace = getWorkspaceDetail(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    const questions = await generateFocusedTopicQuestions({
      workspaceId,
      topicTitle: body.topicTitle.trim(),
      struggleNote: body.struggleNote?.trim(),
    });

    const insertedCount = appendQuestionsToWorkspace(workspaceId, questions);

    revalidatePath("/");
    revalidatePath(`/workspace/${workspaceId}`);
    revalidatePath(`/workspace/${workspaceId}/mistakes`);
    revalidatePath(`/workspace/${workspaceId}/analytics`);

    return NextResponse.json({
      ok: true,
      insertedCount,
      topicTitle: body.topicTitle.trim(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not generate a focused drill.",
      },
      { status: 500 },
    );
  }
}
