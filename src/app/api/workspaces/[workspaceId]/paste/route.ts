import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { extractPastedDocument } from "@/lib/server/ingest/extract";
import { getWorkspaceDetail, insertChunks, insertDocument, replaceWorkspaceContent } from "@/lib/server/repository";
import { analyzeWorkspaceText, buildChunkIndex, embedChunks } from "@/lib/server/study-pipeline";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const body = (await request.json()) as { title?: string; text?: string };

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Pasted text is required." }, { status: 400 });
  }

  const workspace = getWorkspaceDetail(workspaceId);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const extracted = extractPastedDocument(body.title?.trim() || "Pasted notes", body.text);
  const documentId = insertDocument({
    workspaceId,
    title: extracted.title,
    sourceType: "paste",
    kind: extracted.kind,
    mimeType: extracted.mimeType,
    originalName: `${extracted.title}.txt`,
    storagePath: "inline",
    extractedText: extracted.text,
    stats: {
      characters: extracted.text.length,
    },
  });

  const chunks = buildChunkIndex(extracted.text, 900);
  const embeddings = await embedChunks(chunks.map((chunk) => chunk.text));
  insertChunks(
    workspaceId,
    documentId,
    chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index],
    })),
  );

  const pack = await analyzeWorkspaceText({
    workspaceName: workspace.name,
    workspaceDescription: workspace.description,
    courseName: workspace.courseName,
    courseCode: workspace.courseCode,
    tags: workspace.tags,
    text: extracted.text,
  });

  replaceWorkspaceContent(workspaceId, {
    conciseSummary: pack.conciseSummary,
    detailedSummary: pack.courseSummary,
    topics: pack.topics,
    flashcards: pack.flashcards,
    questions: pack.questions,
  });

  revalidatePath("/");
  revalidatePath(`/workspace/${workspaceId}`);

  return NextResponse.json({ ok: true });
}
