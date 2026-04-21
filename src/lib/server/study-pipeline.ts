import fs from "node:fs/promises";

import { focusedQuestionSetSchema, gradingSchema, questionSchema, topicPackSchema } from "@/lib/schemas";
import { cosineSimilarity } from "@/lib/utils";

import { chunkText } from "./ingest/chunk";
import { parseStudyText } from "./ingest/parse";
import { fallbackGrading, fallbackTopicPack } from "./llm/fallbacks";
import {
  buildFocusedQuestionPrompt,
  buildGradingPrompt,
  buildTopicExtractionPrompt,
  focusedQuestionSystemPrompt,
  topicExtractionSystemPrompt,
} from "./llm/prompts";
import { getProvider } from "./providers";
import {
  getActiveProviderProfile,
  getAllChunksForWorkspace,
  getQuestionById,
  getQuestionsForWorkspace,
  getTopicsForWorkspace,
  getWorkspaceDetail,
  searchChunks,
} from "./repository";
import { describeStudyContext, inferStudyContext } from "./study-context";

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
  workspaceDescription?: string;
  courseName?: string;
  courseCode?: string;
  tags?: string[];
  text: string;
}) {
  const parsed = parseStudyText(input.text);
  const profile = getActiveProviderProfile();
  const studyContext = inferStudyContext({
    workspaceName: input.workspaceName,
    workspaceDescription: input.workspaceDescription,
    courseName: input.courseName,
    courseCode: input.courseCode,
    tags: input.tags,
    text: input.text,
  });

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
        workspaceDescription: input.workspaceDescription,
        courseName: input.courseName,
        courseCode: input.courseCode,
        tags: input.tags,
        studyContextSummary: describeStudyContext(studyContext),
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
  const workspace = getWorkspaceDetail(input.workspaceId);
  const studyContext = inferStudyContext({
    workspaceName: workspace?.name,
    workspaceDescription: workspace?.description,
    courseName: workspace?.courseName,
    courseCode: workspace?.courseCode,
    tags: workspace?.tags,
    text: `${question.questionText}\n${question.correctAnswer}\n${sourceContext}`,
  });

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
        studyContextSummary: describeStudyContext(studyContext),
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

export async function generateFocusedTopicQuestions(input: {
  workspaceId: string;
  topicTitle: string;
  struggleNote?: string;
}) {
  const workspace = getWorkspaceDetail(input.workspaceId);
  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  const topic =
    getTopicsForWorkspace(input.workspaceId).find(
      (item) => item.title.toLowerCase() === input.topicTitle.trim().toLowerCase(),
    ) ?? null;

  if (!topic) {
    throw new Error("Topic not found in this workspace.");
  }

  const existingQuestions = getQuestionsForWorkspace(input.workspaceId)
    .filter((question) => question.topicTitle.toLowerCase() === topic.title.toLowerCase())
    .map((question) => question.questionText)
    .slice(0, 10);

  const profile = getActiveProviderProfile();
  const studyContext = inferStudyContext({
    workspaceName: workspace.name,
    workspaceDescription: workspace.description,
    courseName: workspace.courseName,
    courseCode: workspace.courseCode,
    tags: workspace.tags,
    text: `${topic.title}\n${topic.summary}\n${input.struggleNote ?? ""}\n${existingQuestions.join("\n")}`,
  });
  const sourceContext = searchChunks(
    input.workspaceId,
    [topic.title, input.struggleNote?.trim()].filter(Boolean).join(" "),
    profile?.retrievalCount ?? 4,
  )
    .map((chunk) => {
      const excerpt = chunk.text.replace(/\s+/g, " ").slice(0, 320);
      const section = chunk.sectionPath ? `Section: ${chunk.sectionPath}` : "Section: source chunk";
      return `${chunk.documentTitle}\n${section}\n${excerpt}`;
    })
    .join("\n\n");

  if (!profile) {
    return buildFocusedQuestionFallback({
      topicTitle: topic.title,
      topicSummary: topic.summary,
      commonMistakes: topic.commonMistakes,
      sourceContext,
      studyContext,
    });
  }

  try {
    const provider = getProvider(profile.providerType);
    const batch = await provider.generateStructuredJSON(profile as typeof profile & { id: string }, {
      schemaName: "focused_question_set",
      validator: (payload) => focusedQuestionSetSchema.parse(payload),
      fallback: () => ({
        overview: `Focused practice for ${topic.title}.`,
        questions: buildFocusedQuestionFallback({
          topicTitle: topic.title,
          topicSummary: topic.summary,
          commonMistakes: topic.commonMistakes,
          sourceContext,
          studyContext,
        }),
      }),
      prompt: `${focusedQuestionSystemPrompt}\n\n${buildFocusedQuestionPrompt({
        workspaceName: workspace.name,
        topicTitle: topic.title,
        topicSummary: topic.summary,
        commonMistakes: topic.commonMistakes,
        struggleNote: input.struggleNote,
        existingQuestions,
        sourceContext,
        studyContextSummary: describeStudyContext(studyContext),
      })}`,
    });

    return batch.questions.map((question) => questionSchema.parse(question));
  } catch {
    return buildFocusedQuestionFallback({
      topicTitle: topic.title,
      topicSummary: topic.summary,
      commonMistakes: topic.commonMistakes,
      sourceContext,
      studyContext,
    });
  }
}

function buildFocusedQuestionFallback(input: {
  topicTitle: string;
  topicSummary: string;
  commonMistakes: string[];
  sourceContext: string;
  studyContext?: { isCodingCourse: boolean; detectedLanguages: string[] };
}) {
  const sourceHint = input.sourceContext.split("\n").find((line) => line.trim()) ?? input.topicSummary;
  const firstMistake = input.commonMistakes[0] ?? `confusing ${input.topicTitle} with nearby concepts`;
  const secondMistake = input.commonMistakes[1] ?? `missing the reason behind the rule for ${input.topicTitle}`;
  const preferredLanguage = input.studyContext?.detectedLanguages[0];
  const implementationLabel = preferredLanguage ? `${preferredLanguage} code` : "code or pseudocode";

  return [
    questionSchema.parse({
      type: "short_answer",
      topic: input.topicTitle,
      subtopic: "core intuition",
      difficulty: "easy",
      questionText: input.studyContext?.isCodingCourse
        ? `Explain ${input.topicTitle} in plain language, then say how you would recognize it inside ${implementationLabel}.`
        : `Explain ${input.topicTitle} in plain language to a classmate who keeps getting lost.`,
      correctAnswer: input.topicSummary,
      gradingRubric: [
        `Defines ${input.topicTitle} accurately.`,
        input.studyContext?.isCodingCourse
          ? `Uses a simple intuitive explanation and connects it to ${implementationLabel}.`
          : "Uses a simple intuitive explanation.",
        "Avoids jargon unless it is explained.",
      ],
      explanation: `Starts with intuition before moving into harder ${input.topicTitle} questions.`,
      sourceRefs: [],
      confidenceScore: 0.58,
      estimatedTimeSeconds: 75,
    }),
    questionSchema.parse({
      type: "true_false",
      topic: input.topicTitle,
      subtopic: "misconception check",
      difficulty: "easy",
      questionText: `True or false: ${firstMistake}. Explain your reasoning in one or two sentences.`,
      correctAnswer: "False unless the source explicitly states otherwise; the explanation should correct the misconception.",
      gradingRubric: [
        "Chooses the correct truth value.",
        "Corrects the misconception directly.",
      ],
      explanation: "Targets a likely misunderstanding before it hardens into a habit.",
      sourceRefs: [],
      confidenceScore: 0.55,
      estimatedTimeSeconds: 60,
    }),
    questionSchema.parse({
      type: "compare",
      topic: input.topicTitle,
      subtopic: "distinction",
      difficulty: "medium",
      questionText: input.studyContext?.isCodingCourse
        ? `Compare a correct implementation or use of ${input.topicTitle} with a buggy or misleading one. What would you inspect first?`
        : `Compare the correct use of ${input.topicTitle} with a common incorrect approach a student might try.`,
      correctAnswer: `The answer should contrast the correct interpretation of ${input.topicTitle} with the incorrect shortcut or confusion.`,
      gradingRubric: [
        "Names the correct approach.",
        "Names the incorrect approach or misconception.",
        "Explains the difference clearly.",
      ],
      explanation: "Helps the learner see boundaries, not just memorize a definition.",
      sourceRefs: [],
      confidenceScore: 0.6,
      estimatedTimeSeconds: 95,
    }),
    questionSchema.parse({
      type: "mcq",
      topic: input.topicTitle,
      subtopic: "application",
      difficulty: "medium",
      questionText: input.studyContext?.isCodingCourse
        ? `Which option best matches the source-grounded implementation idea behind ${input.topicTitle}?`
        : `Which option best matches the source-grounded idea behind ${input.topicTitle}?`,
      options: [
        input.topicSummary.slice(0, 120) || `A grounded explanation of ${input.topicTitle}`,
        secondMistake,
        `A rule that sounds related to ${input.topicTitle} but skips the reasoning`,
        `An unrelated fact from the same course`,
      ],
      correctAnswer: input.topicSummary.slice(0, 120) || `A grounded explanation of ${input.topicTitle}`,
      gradingRubric: [
        "Selects the grounded option.",
        "Can justify why the distractors are weaker.",
      ],
      explanation: `Uses the actual study summary or source hint: ${sourceHint.slice(0, 140)}`,
      sourceRefs: [],
      confidenceScore: 0.57,
      estimatedTimeSeconds: 50,
    }),
    questionSchema.parse({
      type: "explain",
      topic: input.topicTitle,
      subtopic: "why it works",
      difficulty: "medium",
      questionText: input.studyContext?.isCodingCourse
        ? `Why does ${input.topicTitle} work the way it does in ${implementationLabel}, and what breaks when someone copies the pattern mechanically?`
        : `Why does ${input.topicTitle} work the way it does, and what breaks when a student applies it mechanically?`,
      correctAnswer: `The answer should explain the underlying reasoning and describe what goes wrong when ${input.topicTitle} is used mechanically.`,
      gradingRubric: [
        "Explains the underlying reason.",
        "Describes a failure mode or edge case.",
        "Connects the explanation back to the concept.",
      ],
      explanation: "Builds durable understanding instead of isolated recall.",
      sourceRefs: [],
      confidenceScore: 0.6,
      estimatedTimeSeconds: 120,
    }),
    questionSchema.parse({
      type: "teach_back",
      topic: input.topicTitle,
      subtopic: "transfer",
      difficulty: "hard",
      questionText: input.studyContext?.isCodingCourse
        ? `Teach ${input.topicTitle} with a fresh example and a short ${implementationLabel} sketch, then mention one trap to avoid.`
        : `Teach ${input.topicTitle} using a fresh example that makes the idea feel intuitive, then mention one trap to avoid.`,
      correctAnswer: input.studyContext?.isCodingCourse
        ? `A strong answer teaches ${input.topicTitle} with a clear example, includes a short ${implementationLabel} sketch, and names a concrete trap to avoid.`
        : `A strong answer teaches ${input.topicTitle} with a clear example and names a concrete trap or misconception to avoid.`,
      gradingRubric: [
        "Uses a fresh example.",
        `Makes ${input.topicTitle} intuitive.`,
        input.studyContext?.isCodingCourse
          ? `Includes one concrete trap to avoid and a sensible ${implementationLabel} sketch.`
          : "Includes one concrete trap to avoid.",
      ],
      explanation: "Ends the drill with transfer, which is a stronger signal than rote repetition.",
      sourceRefs: [],
      confidenceScore: 0.62,
      estimatedTimeSeconds: 150,
    }),
  ];
}
