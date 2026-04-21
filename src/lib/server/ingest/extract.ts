import fs from "node:fs/promises";

import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export type ExtractedDocument = {
  kind: "pdf" | "docx" | "txt" | "markdown" | "pasted" | "image";
  mimeType: string;
  text: string;
  title: string;
};

function detectKind(fileName: string, mimeType: string) {
  const lower = fileName.toLowerCase();
  if (mimeType.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp)$/i.test(lower)) return "image";
  if (mimeType.includes("pdf") || lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".doc")) {
    throw new Error("Legacy .doc files are not supported. Convert the file to .docx, .pdf, .txt, or .md and try again.");
  }
  if (mimeType.includes("word") || lower.endsWith(".docx"))
    return "docx";
  if (lower.endsWith(".md") || mimeType.includes("markdown")) return "markdown";
  return "txt";
}

export async function extractUploadedDocument(filePath: string, fileName: string, mimeType: string) {
  const kind = detectKind(fileName, mimeType);
  const buffer = await fs.readFile(filePath);

  if (kind === "image") {
    return {
      kind,
      mimeType,
      text: "",
      title: fileName.replace(/\.[^.]+$/, ""),
    } satisfies ExtractedDocument;
  }

  if (kind === "pdf") {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return {
      kind,
      mimeType,
      text: result.text,
      title: fileName.replace(/\.[^.]+$/, ""),
    } satisfies ExtractedDocument;
  }

  if (kind === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return {
      kind,
      mimeType,
      text: result.value,
      title: fileName.replace(/\.[^.]+$/, ""),
    } satisfies ExtractedDocument;
  }

  return {
    kind,
    mimeType,
    text: buffer.toString("utf8"),
    title: fileName.replace(/\.[^.]+$/, ""),
  } satisfies ExtractedDocument;
}

export function extractPastedDocument(title: string, text: string) {
  return {
    kind: "pasted",
    mimeType: "text/plain",
    text,
    title,
  } satisfies ExtractedDocument;
}
