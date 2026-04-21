import JSZip from "jszip";

import { questionSchema, topicSchema } from "@/lib/schemas";

import { createCourse, createWorkspace, insertChunks, insertDocument, replaceWorkspaceContent } from "./repository";
import { buildChunkIndex, embedChunks } from "./study-pipeline";

type ImportedManifest = {
  workspace: {
    name: string;
    description?: string;
    courseName: string;
    courseCode: string;
    tags?: string[];
    conciseSummary?: string;
    detailedSummary?: string;
  };
  topics?: unknown[];
  questions?: unknown[];
  documents?: Array<{
    title: string;
    sourceType: string;
    kind: string;
    mimeType: string;
    originalName: string;
    extractedText: string;
  }>;
};

async function parseManifest(file: File) {
  if (file.name.endsWith(".zip")) {
    const zip = await JSZip.loadAsync(Buffer.from(await file.arrayBuffer()));
    const manifestFile = zip.file("manifest.json");
    if (!manifestFile) {
      throw new Error("Zip import must include manifest.json at the root.");
    }
    return JSON.parse(await manifestFile.async("text")) as ImportedManifest;
  }

  return JSON.parse(await file.text()) as ImportedManifest;
}

export async function importWorkspacePackage(file: File) {
  const manifest = await parseManifest(file);

  const courseId = createCourse({
    name: manifest.workspace.courseName,
    code: manifest.workspace.courseCode,
    description: "Imported workspace package",
  });

  const workspaceId = createWorkspace({
    courseId,
    name: manifest.workspace.name,
    description: manifest.workspace.description,
    tags: manifest.workspace.tags,
  });

  for (const document of manifest.documents ?? []) {
    const documentId = insertDocument({
      workspaceId,
      title: document.title,
      sourceType: document.sourceType,
      kind: document.kind,
      mimeType: document.mimeType,
      originalName: document.originalName,
      storagePath: `imports/${workspaceId}/${document.originalName}`,
      extractedText: document.extractedText,
      stats: {
        imported: true,
        characters: document.extractedText.length,
      },
    });

    const chunks = buildChunkIndex(document.extractedText, 900);
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

  replaceWorkspaceContent(workspaceId, {
    conciseSummary:
      manifest.workspace.conciseSummary ?? `Imported workspace for ${manifest.workspace.name}.`,
    detailedSummary: manifest.workspace.detailedSummary ?? "",
    topics: (manifest.topics ?? []).map((topic) => topicSchema.parse(topic)),
    flashcards: [],
    questions: (manifest.questions ?? []).map((question) => questionSchema.parse(question)),
  });

  return workspaceId;
}
