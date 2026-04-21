import fs from "node:fs/promises";

import { gradingSchema, topicPackSchema } from "@/lib/schemas";
import { cosineSimilarity } from "@/lib/utils";

import { chunkText } from "./ingest/chunk";
import { parseStudyText } from "./ingest/parse";
import { fallbackGrading, fallbackTopicPack } from "./llm/fallbacks";
import { buildGradingPrompt, buildTopicExtractionPrompt, topicExtractionSystemPrompt } from "./llm/prompts";
import { getProvider } from "./providers";
import { getActiveProviderProfile, getAllChunksForWorkspace, getQuestionById, searchChunks } from "./repository";

export async function embedChunks(texts: string[]) {
  const profile = getActiveProviderProfile();
  if (!profile || !profile.embeddingModel) {
    return [];
  }

  try {
    const provider = getProvider(profile.providerType);
    return await provider.embedText(profile as typeof profile & { id: string }, texts);
  } catch {
    return [];
  }
}

export async function analyzeWorkspaceText(input: {
  workspaceName: string;
  text: string;
}) {
  const parsed = parseStudyText(input.text);
  const profile = getActiveProviderProfile();

  if (!profile) {
    return fallbackTopicPack({
      workspaceName: input.workspaceName,
      parsed,
      text: input.text,
    });
  }

  try {
    const provider = getProvider(profile.providerType);
    return await provider.generateStructuredJSON(profile as typeof profile & { id: string }, {
      schemaName: "topic_pack",
      validator: (payload) => topicPackSchema.parse(payload),
      fallback: () =>
        fallbackTopicPack({
          workspaceName: input.workspaceName,
          parsed,
          text: input.text,
        }),
      prompt: `${topicExtractionSystemPrompt}\n\n${buildTopicExtractionPrompt({
        workspaceName: input.workspaceName,
        parsedSignals: parsed,
        sourcePreview: input.text.slice(0, 8000),
      })}`,
    });
  } catch {
    return fallbackTopicPack({
      workspaceName: input.workspaceName,
      parsed,
      text: input.text,
    });
  }
}

export function buildChunkIndex(text: string, chunkSize: number) {
  return chunkText(text, chunkSize);
}

export async function describeImageContext(input: {
  imagePath: string;
  title: string;
  note?: string;
}) {
  const profile = getActiveProviderProfile();
  const fallback = [
    `Image context for ${input.title}.`,
    input.note?.trim() ? `User note: ${input.note.trim()}` : "",
    "If a vision-capable local model is enabled, replace this with a richer summary later.",
  ]
    .filter(Boolean)
    .join("\n");

  if (!profile) {
    return fallback;
  }

  try {
    const provider = getProvider(profile.providerType);
    const bytes = await fs.readFile(input.imagePath);
    const dataUrl = `data:image/${input.imagePath.split(".").pop() ?? "png"};base64,${bytes.toString("base64")}`;
    const description = await provider.generateImageDescription(profile as typeof profile & { id: string }, {
      prompt: [
        `Summarize this study image for retrieval and quiz generation.`,
        `Title: ${input.title}`,
        input.note?.trim() ? `User note: ${input.note.trim()}` : "",
        "Return a compact paragraph plus a short bullet list of visible concepts, labels, formulas, diagrams, or tables.",
      ]
        .filter(Boolean)
        .join("\n"),
      imageDataUrl: dataUrl,
    });

    return description.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function gradeQuestionAnswer(input: {
  workspaceId: string;
  questionId: string;
  answer: string;
}) {
  const profile = getActiveProviderProfile();
  const question = getQuestionById(input.questionId);
  if (!question) {
    throw new Error("Question not found.");
  }

  const sourceContext = searchChunks(input.workspaceId, question.topicTitle, 3)
    .map((chunk) => chunk.text.slice(0, 300))
    .join("\n\n");

  if (!profile) {
    return fallbackGrading({
      answer: input.answer,
      correctAnswer: question.correctAnswer,
      rubric: question.gradingRubric,
    });
  }

  try {
    const provider = getProvider(profile.providerType);
    return await provider.gradeAnswer(
      profile as typeof profile & { id: string },
      buildGradingPrompt({
        questionText: question.questionText,
        correctAnswer: question.correctAnswer,
        rubric: question.gradingRubric,
        userAnswer: input.answer,
        strictness: profile.gradingStrictness,
        sourceContext,
      }),
      (payload) => gradingSchema.parse(payload),
    );
  } catch {
    return fallbackGrading({
      answer: input.answer,
      correctAnswer: question.correctAnswer,
      rubric: question.gradingRubric,
    });
  }
}

export async function semanticSearch(input: {
  workspaceId: string;
  query: string;
  limit: number;
}) {
  const rows = getAllChunksForWorkspace(input.workspaceId);
  const profile = getActiveProviderProfile();

  if (!profile || !profile.embeddingModel) {
    return searchChunks(input.workspaceId, input.query, input.limit);
  }

  try {
    const provider = getProvider(profile.providerType);
    const [queryEmbedding] = await provider.embedText(
      profile as typeof profile & { id: string },
      [input.query],
    );

    return rows
      .map((row) => ({
        id: row.id,
        documentId: row.document_id,
        documentTitle: row.document_title,
        text: row.text,
        pageLabel: row.page_label,
        sectionPath: row.section_path,
        score: cosineSimilarity(
          queryEmbedding ?? [],
          row.embedding_json ? (JSON.parse(row.embedding_json) as number[]) : [],
        ),
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, input.limit);
  } catch {
    return searchChunks(input.workspaceId, input.query, input.limit);
  }
}
