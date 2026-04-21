import fs from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import { getExportsDir } from "./storage";
import {
  getAllDocumentsForWorkspace,
  getQuestionsForWorkspace,
  getTopicsForWorkspace,
  getWorkspaceDetail,
} from "./repository";

export async function exportWorkspacePackage(workspaceId: string) {
  const workspace = getWorkspaceDetail(workspaceId);
  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  const documents = getAllDocumentsForWorkspace(workspaceId);
  const topics = getTopicsForWorkspace(workspaceId);
  const questions = getQuestionsForWorkspace(workspaceId);

  const zip = new JSZip();
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        workspace: {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description,
          courseName: workspace.courseName,
          courseCode: workspace.courseCode,
          tags: workspace.tags,
          conciseSummary: workspace.conciseSummary,
          detailedSummary: workspace.detailedSummary,
        },
        topics,
        questions,
        documents: documents.map((document) => ({
          id: document.id,
          title: document.title,
          sourceType: document.source_type,
          kind: document.kind,
          mimeType: document.mime_type,
          originalName: document.original_name,
          extractedText: document.extracted_text,
        })),
      },
      null,
      2,
    ),
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const fileName = `${workspace.courseCode}-${workspace.name}`.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const targetPath = path.join(getExportsDir(), `${fileName}.zip`);
  await fs.writeFile(targetPath, buffer);

  return {
    buffer,
    fileName: `${fileName}.zip`,
    targetPath,
  };
}
