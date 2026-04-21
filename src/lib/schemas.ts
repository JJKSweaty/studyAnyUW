import { z } from "zod";

export const sourceRefSchema = z.object({
  documentId: z.string(),
  documentTitle: z.string(),
  chunkId: z.string().optional(),
  section: z.string().optional(),
  pageLabel: z.string().optional(),
  excerpt: z.string().optional(),
});

export const topicSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2),
  summary: z.string().min(8),
  detailedSummary: z.string().default(""),
  keyPoints: z.array(z.string()).default([]),
  commonMistakes: z.array(z.string()).default([]),
  formulas: z.array(z.string()).default([]),
  sourceRefs: z.array(sourceRefSchema).default([]),
  subtopics: z
    .array(
      z.object({
        title: z.string().min(2),
        summary: z.string().min(8),
      }),
    )
    .default([]),
});

export const flashcardSchema = z.object({
  id: z.string().optional(),
  topic: z.string().min(2),
  front: z.string().min(4),
  back: z.string().min(4),
  sourceRefs: z.array(sourceRefSchema).default([]),
});

export const questionSchema = z.object({
  id: z.string().optional(),
  type: z.enum([
    "flashcard",
    "mcq",
    "true_false",
    "short_answer",
    "fill_blank",
    "explain",
    "compare",
    "teach_back",
  ]),
  topic: z.string().min(2),
  subtopic: z.string().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]),
  questionText: z.string().min(8),
  options: z.array(z.string()).default([]),
  correctAnswer: z.string().min(1),
  gradingRubric: z.array(z.string()).default([]),
  explanation: z.string().min(8),
  sourceRefs: z.array(sourceRefSchema).default([]),
  confidenceScore: z.number().min(0).max(1).default(0.65),
  estimatedTimeSeconds: z.number().int().min(15).max(900).default(75),
});

export const topicPackSchema = z.object({
  courseSummary: z.string().min(12),
  conciseSummary: z.string().min(12),
  keyDefinitions: z.array(z.string()).default([]),
  likelyExamQuestions: z.array(z.string()).default([]),
  topics: z.array(topicSchema).min(1),
  flashcards: z.array(flashcardSchema).default([]),
  questions: z.array(questionSchema).min(10).max(20),
});

export const focusedQuestionSetSchema = z.object({
  overview: z.string().min(12),
  questions: z.array(questionSchema).min(4).max(8),
});

export const gradingSchema = z.object({
  score: z.number().min(0).max(1),
  correctness: z.number().min(0).max(1),
  completeness: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  verdict: z.enum(["correct", "partial", "incorrect"]),
  missingPoints: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  conciseFeedback: z.string().min(4),
  improvedAnswer: z.string().min(4),
  groundedAnswer: z.string().optional(),
});

export const providerProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  providerType: z.enum(["ollama", "lmstudio"]),
  baseUrl: z.string().url(),
  modelName: z.string().min(1),
  embeddingModel: z.string().default(""),
  temperature: z.number().min(0).max(2).default(0.2),
  maxOutputTokens: z.number().int().min(128).max(8192).default(1400),
  chunkSize: z.number().int().min(300).max(2500).default(900),
  retrievalCount: z.number().int().min(2).max(12).default(5),
  gradingStrictness: z.enum(["lenient", "balanced", "strict"]).default("balanced"),
  isActive: z.boolean().default(false),
});

export const generationJobSchema = z.object({
  kind: z.enum(["ingest", "topics", "questions", "grading"]),
  status: z.enum(["queued", "running", "done", "failed"]),
  input: z.record(z.string(), z.unknown()).default({}),
  output: z.record(z.string(), z.unknown()).default({}),
  error: z.string().optional(),
});

export type TopicPack = z.infer<typeof topicPackSchema>;
export type FocusedQuestionSet = z.infer<typeof focusedQuestionSetSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type FlashcardInput = z.infer<typeof flashcardSchema>;
export type TopicInput = z.infer<typeof topicSchema>;
export type GradingResult = z.infer<typeof gradingSchema>;
export type ProviderProfileInput = z.infer<typeof providerProfileSchema>;
