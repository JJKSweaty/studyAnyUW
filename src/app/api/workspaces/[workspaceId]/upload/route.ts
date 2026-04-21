import fs from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { extractUploadedDocument } from "@/lib/server/ingest/extract";
import { sanitizeFileName } from "@/lib/server/storage";
import { getUploadsDir } from "@/lib/server/storage";
import { getWorkspaceDetail, insertChunks, insertDocument, touchWorkspace } from "@/lib/server/repository";
import { analyzeWorkspaceText, buildChunkIndex, describeImageContext, embedChunks } from "@/lib/server/study-pipeline";
import { replaceWorkspaceContent } from "@/lib/server/repository";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await params;
  const formData = await request.formData();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);
  const note = String(formData.get("note") ?? "");

  if (files.length === 0) {
    return NextResponse.json({ error: "At least one file is required." }, { status: 400 });
  }

  const workspace = getWorkspaceDetail(workspaceId);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  let combinedText = "";

  for (const file of files) {
    const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;
    const targetPath = path.join(getUploadsDir(workspaceId), safeName);
    await fs.writeFile(targetPath, Buffer.from(await file.arrayBuffer()));

    const extracted = await extractUploadedDocument(targetPath, file.name, file.type);
    const extractedText =
      extracted.kind === "image"
        ? await describeImageContext({
            imagePath: targetPath,
            title: extracted.title,
            note,
          })
        : extracted.text;

    combinedText += `\n\n# ${extracted.title}\n${extractedText}`;

    const documentId = insertDocument({
      workspaceId,
      title: extracted.title,
      sourceType: "upload",
      kind: extracted.kind,
      mimeType: extracted.mimeType,
      originalName: file.name,
      storagePath: targetPath,
      extractedText,
      stats: {
        characters: extractedText.length,
        hasImageContext: extracted.kind === "image",
      },
    });

    const chunks = buildChunkIndex(extractedText, 900);
    const embeddings = await embedChunks(chunks.map((chunk) => chunk.text));
    insertChunks(
      workspaceId,
      documentId,
      chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index],
      })),
    );
  }

  const pack = await analyzeWorkspaceText({
    workspaceName: workspace.name,
    workspaceDescription: workspace.description,
    courseName: workspace.courseName,
    courseCode: workspace.courseCode,
    tags: workspace.tags,
    text: combinedText,
  });

  replaceWorkspaceContent(workspaceId, {
    conciseSummary: pack.conciseSummary,
    detailedSummary: pack.courseSummary,
    topics: pack.topics,
    flashcards: pack.flashcards,
    questions: pack.questions,
  });
  touchWorkspace(workspaceId);

  revalidatePath("/");
  revalidatePath(`/workspace/${workspaceId}`);

  return NextResponse.json({ ok: true });
}
