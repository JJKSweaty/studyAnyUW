import fs from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { extractUploadedDocument } from "@/lib/server/ingest/extract";
import {
  insertCourseContextChunks,
  insertCourseContextDocument,
} from "@/lib/server/repository";
import { getCourseContextDir, sanitizeFileName } from "@/lib/server/storage";
import {
  buildChunkIndex,
  describeImageContext,
  embedChunks,
} from "@/lib/server/study-pipeline";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const formData = await request.formData();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);
  const note = String(formData.get("note") ?? "");

  if (files.length === 0) {
    return NextResponse.json({ error: "At least one file is required." }, { status: 400 });
  }

  for (const file of files) {
    const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;
    const targetPath = path.join(getCourseContextDir(courseId), safeName);
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

    const documentId = insertCourseContextDocument({
      courseId,
      title: extracted.title,
      sourceType: "course_context",
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
    insertCourseContextChunks(
      courseId,
      documentId,
      chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index],
      })),
    );
  }

  revalidatePath("/");
  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);

  return NextResponse.json({ ok: true });
}
