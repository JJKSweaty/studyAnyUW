import { addDays } from "date-fns";

import {
  type FlashcardInput,
  type GradingResult,
  providerProfileSchema,
  type ProviderProfileInput,
  type QuestionInput,
  type TopicInput,
} from "@/lib/schemas";
import { id, nowIso, safeJsonParse, slugify } from "@/lib/utils";

import { getDb } from "./db";
import type { CourseRecord, ProviderProfileRecord, WorkspaceRecord } from "./types";

export type CourseSummary = {
  id: string;
  name: string;
  code: string;
  description: string;
  archived: boolean;
  workspaceCount: number;
  questionCount: number;
  weakTopicCount: number;
  contextDocumentCount: number;
  updatedAt: string;
};

export type WorkspaceSummary = {
  id: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  name: string;
  description: string;
  tags: string[];
  status: string;
  conciseSummary: string;
  detailedSummary: string;
  documentCount: number;
  topicCount: number;
  questionCount: number;
  weakTopicCount: number;
  dueReviewCount: number;
  accuracy: number;
  courseContextDocumentCount: number;
  updatedAt: string;
};

export type TopicSummary = {
  id: string;
  title: string;
  summary: string;
  detailedSummary: string;
  keyPoints: string[];
  commonMistakes: string[];
  formulas: string[];
  sourceRefs: Array<Record<string, string>>;
  mastery: number;
};

export type QuestionSummary = {
  id: string;
  topicId: string | null;
  topicTitle: string;
  subtopic: string;
  type: string;
  difficulty: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  gradingRubric: string[];
  explanation: string;
  sourceRefs: Array<Record<string, string>>;
  confidenceScore: number;
  estimatedTimeSeconds: number;
  locked: boolean;
  feedbackSummary: Record<string, unknown>;
};

export type ResponseSummary = {
  id: string;
  questionId: string;
  answerText: string;
  isCorrect: boolean;
  score: number;
  confidence: number;
  timeSeconds: number;
  gradingFeedback: GradingResult;
  createdAt: string;
};

function mapProfile(record: ProviderProfileRecord) {
  return providerProfileSchema.parse({
    id: record.id,
    name: record.name,
    providerType: record.provider_type,
    baseUrl: record.base_url,
    modelName: record.model_name,
    embeddingModel: record.embedding_model,
    temperature: record.temperature,
    maxOutputTokens: record.max_output_tokens,
    chunkSize: record.chunk_size,
    retrievalCount: record.retrieval_count,
    gradingStrictness: record.grading_strictness,
    isActive: Boolean(record.is_active),
  });
}

function getCourseIdForWorkspace(workspaceId: string) {
  const db = getDb();
  const row = db
    .prepare(`SELECT course_id FROM workspaces WHERE id = ?`)
    .get(workspaceId) as { course_id: string } | undefined;

  return row?.course_id ?? null;
}

export function listCourses(): CourseSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        c.*,
        COUNT(DISTINCT w.id) AS workspace_count,
        COUNT(DISTINCT q.id) AS question_count,
        COUNT(DISTINCT ccd.id) AS context_document_count,
        COUNT(DISTINCT CASE WHEN topic_stats.mastery < 0.65 THEN topic_stats.id END) AS weak_topic_count
      FROM courses c
      LEFT JOIN workspaces w ON w.course_id = c.id
      LEFT JOIN course_context_documents ccd ON ccd.course_id = c.id
      LEFT JOIN questions q ON q.workspace_id = w.id
      LEFT JOIN (
        SELECT
          t.id,
          t.workspace_id,
          COALESCE(AVG(r.score), 0) AS mastery
        FROM topics t
        LEFT JOIN questions q2 ON q2.topic_id = t.id
        LEFT JOIN responses r ON r.question_id = q2.id
        GROUP BY t.id
      ) topic_stats ON topic_stats.workspace_id = w.id
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `,
    )
    .all() as Array<
    CourseRecord & {
      workspace_count: number;
      question_count: number;
      context_document_count: number;
      weak_topic_count: number | null;
    }
  >;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    archived: Boolean(row.archived),
    workspaceCount: row.workspace_count,
    questionCount: row.question_count,
    weakTopicCount: row.weak_topic_count ?? 0,
    contextDocumentCount: row.context_document_count,
    updatedAt: row.updated_at,
  }));
}

export function listWorkspaces(): WorkspaceSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        w.*,
        c.name AS course_name,
        c.code AS course_code,
        COUNT(DISTINCT ccd.id) AS course_context_document_count,
        COUNT(DISTINCT d.id) AS document_count,
        COUNT(DISTINCT t.id) AS topic_count,
        COUNT(DISTINCT q.id) AS question_count,
        COUNT(DISTINCT CASE WHEN review.status = 'due' THEN review.id END) AS due_review_count,
        AVG(COALESCE(r.score, 0)) AS accuracy
      FROM workspaces w
      INNER JOIN courses c ON c.id = w.course_id
      LEFT JOIN course_context_documents ccd ON ccd.course_id = c.id
      LEFT JOIN documents d ON d.workspace_id = w.id
      LEFT JOIN topics t ON t.workspace_id = w.id
      LEFT JOIN questions q ON q.workspace_id = w.id
      LEFT JOIN responses r ON r.question_id = q.id
      LEFT JOIN review_queue review ON review.workspace_id = w.id
      GROUP BY w.id
      ORDER BY w.updated_at DESC
    `,
    )
    .all() as Array<
    WorkspaceRecord & {
      course_name: string;
      course_code: string;
      course_context_document_count: number;
      document_count: number;
      topic_count: number;
      question_count: number;
      due_review_count: number | null;
      accuracy: number | null;
    }
  >;

  return rows.map((row) => ({
    id: row.id,
    courseId: row.course_id,
    courseName: row.course_name,
    courseCode: row.course_code,
    name: row.name,
    description: row.description,
    tags: safeJsonParse<string[]>(row.tags_json, []),
    status: row.status,
    conciseSummary: row.concise_summary,
    detailedSummary: row.detailed_summary,
    documentCount: row.document_count,
    topicCount: row.topic_count,
    questionCount: row.question_count,
    weakTopicCount: getWeakTopicCount(row.id),
    dueReviewCount: row.due_review_count ?? 0,
    accuracy: row.accuracy ?? 0,
    courseContextDocumentCount: row.course_context_document_count,
    updatedAt: row.updated_at,
  }));
}

export function getWeakTopicCount(workspaceId: string) {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM (
        SELECT t.id, COALESCE(AVG(r.score), 0) AS mastery
        FROM topics t
        LEFT JOIN questions q ON q.topic_id = t.id
        LEFT JOIN responses r ON r.question_id = q.id
        WHERE t.workspace_id = ?
        GROUP BY t.id
        HAVING mastery < 0.65
      )
    `,
    )
    .get(workspaceId) as { total: number };

  return row?.total ?? 0;
}

export function getWorkspaceDetail(workspaceId: string) {
  const db = getDb();
  const workspace = db
    .prepare(
      `
      SELECT w.*, c.name AS course_name, c.code AS course_code
      FROM workspaces w
      INNER JOIN courses c ON c.id = w.course_id
      WHERE w.id = ?
    `,
    )
    .get(workspaceId) as (WorkspaceRecord & {
    course_name: string;
    course_code: string;
  }) | null;

  if (!workspace) {
    return null;
  }

  const documents = db
    .prepare(
      `
      SELECT id, title, source_type, kind, original_name, stats_json, created_at
      FROM documents
      WHERE workspace_id = ?
      ORDER BY created_at DESC
    `,
    )
    .all(workspaceId) as Array<{
    id: string;
    title: string;
    source_type: string;
    kind: string;
    original_name: string;
    stats_json: string;
    created_at: string;
  }>;

  const topics = getTopicsForWorkspace(workspaceId);
  const questions = getQuestionsForWorkspace(workspaceId);
  const recentSessions = db
    .prepare(
      `
      SELECT *
      FROM study_sessions
      WHERE workspace_id = ?
      ORDER BY started_at DESC
      LIMIT 8
    `,
    )
    .all(workspaceId) as Array<{
    id: string;
    mode: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    score: number | null;
    metadata_json: string;
  }>;

  const mistakes = getMistakes(workspaceId).slice(0, 10);
  const analytics = getWorkspaceAnalytics(workspaceId);
  const courseContextDocuments = getCourseContextDocuments(workspace.course_id);

  return {
    id: workspace.id,
    courseId: workspace.course_id,
    name: workspace.name,
    courseName: workspace.course_name,
    courseCode: workspace.course_code,
    description: workspace.description,
    tags: safeJsonParse<string[]>(workspace.tags_json, []),
    conciseSummary: workspace.concise_summary,
    detailedSummary: workspace.detailed_summary,
    status: workspace.status,
    documents: documents.map((document) => ({
      id: document.id,
      title: document.title,
      sourceType: document.source_type,
      kind: document.kind,
      originalName: document.original_name,
      stats: safeJsonParse<Record<string, number | string>>(document.stats_json, {}),
      createdAt: document.created_at,
    })),
    topics,
    questions,
    recentSessions: recentSessions.map((session) => ({
      id: session.id,
      mode: session.mode,
      status: session.status,
      startedAt: session.started_at,
      finishedAt: session.finished_at,
      score: session.score ?? 0,
      metadata: safeJsonParse<Record<string, unknown>>(session.metadata_json, {}),
    })),
    mistakes,
    analytics,
    courseContextDocuments,
  };
}

export function getCourseContextDocuments(courseId: string) {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT id, title, source_type, kind, original_name, stats_json, created_at
      FROM course_context_documents
      WHERE course_id = ?
      ORDER BY created_at DESC
    `,
    )
    .all(courseId) as Array<{
    id: string;
    title: string;
    source_type: string;
    kind: string;
    original_name: string;
    stats_json: string;
    created_at: string;
  }>;

  return rows.map((document) => ({
    id: document.id,
    title: document.title,
    sourceType: document.source_type,
    kind: document.kind,
    originalName: document.original_name,
    stats: safeJsonParse<Record<string, number | string>>(document.stats_json, {}),
    createdAt: document.created_at,
  }));
}

export function getCourseDetail(courseId: string) {
  const db = getDb();
  const course = db
    .prepare(`SELECT * FROM courses WHERE id = ?`)
    .get(courseId) as CourseRecord | undefined;

  if (!course) {
    return null;
  }

  const workspaces = listWorkspaces().filter((workspace) => workspace.courseId === courseId);
  const contextDocuments = getCourseContextDocuments(courseId);

  return {
    id: course.id,
    name: course.name,
    code: course.code,
    description: course.description,
    archived: Boolean(course.archived),
    updatedAt: course.updated_at,
    workspaces,
    contextDocuments,
  };
}

export function getTopicsForWorkspace(workspaceId: string): TopicSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        t.*,
        COALESCE(AVG(r.score), 0) AS mastery
      FROM topics t
      LEFT JOIN questions q ON q.topic_id = t.id
      LEFT JOIN responses r ON r.question_id = q.id
      WHERE t.workspace_id = ?
      GROUP BY t.id
      ORDER BY t.created_at ASC
    `,
    )
    .all(workspaceId) as Array<{
    id: string;
    title: string;
    summary: string;
    detailed_summary: string;
    key_points_json: string;
    common_mistakes_json: string;
    formulas_json: string;
    source_refs_json: string;
    mastery: number | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    detailedSummary: row.detailed_summary,
    keyPoints: safeJsonParse<string[]>(row.key_points_json, []),
    commonMistakes: safeJsonParse<string[]>(row.common_mistakes_json, []),
    formulas: safeJsonParse<string[]>(row.formulas_json, []),
    sourceRefs: safeJsonParse<Array<Record<string, string>>>(row.source_refs_json, []),
    mastery: row.mastery ?? 0,
  }));
}

export function getQuestionsForWorkspace(workspaceId: string): QuestionSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT *
      FROM questions
      WHERE workspace_id = ?
      ORDER BY created_at DESC
    `,
    )
    .all(workspaceId) as Array<{
    id: string;
    topic_id: string | null;
    topic_title: string;
    subtopic: string;
    type: string;
    difficulty: string;
    question_text: string;
    options_json: string;
    correct_answer: string;
    grading_rubric_json: string;
    explanation: string;
    source_refs_json: string;
    confidence_score: number;
    estimated_time_seconds: number;
    locked: number;
    feedback_summary_json: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    topicId: row.topic_id,
    topicTitle: row.topic_title,
    subtopic: row.subtopic,
    type: row.type,
    difficulty: row.difficulty,
    questionText: row.question_text,
    options: safeJsonParse<string[]>(row.options_json, []),
    correctAnswer: row.correct_answer,
    gradingRubric: safeJsonParse<string[]>(row.grading_rubric_json, []),
    explanation: row.explanation,
    sourceRefs: safeJsonParse<Array<Record<string, string>>>(row.source_refs_json, []),
    confidenceScore: row.confidence_score,
    estimatedTimeSeconds: row.estimated_time_seconds,
    locked: Boolean(row.locked),
    feedbackSummary: safeJsonParse<Record<string, unknown>>(row.feedback_summary_json, {}),
  }));
}

export function createCourse(input: {
  name: string;
  code: string;
  description?: string;
}) {
  const db = getDb();
  const timestamp = nowIso();
  const courseId = id("course");

  db.prepare(
    `
    INSERT INTO courses (id, name, code, description, created_at, updated_at)
    VALUES (@id, @name, @code, @description, @createdAt, @updatedAt)
  `,
  ).run({
    id: courseId,
    name: input.name,
    code: input.code,
    description: input.description ?? "",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return courseId;
}

export function findCourseByCode(code: string) {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM courses WHERE LOWER(code) = LOWER(?) LIMIT 1`)
    .get(code) as CourseRecord | undefined;

  return row
    ? {
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
      }
    : null;
}

export function createWorkspace(input: {
  courseId: string;
  name: string;
  description?: string;
  tags?: string[];
}) {
  const db = getDb();
  const timestamp = nowIso();
  const workspaceId = id("workspace");

  db.prepare(
    `
    INSERT INTO workspaces (
      id, course_id, name, description, tags_json, created_at, updated_at
    )
    VALUES (@id, @courseId, @name, @description, @tags, @createdAt, @updatedAt)
  `,
  ).run({
    id: workspaceId,
    courseId: input.courseId,
    name: input.name,
    description: input.description ?? "",
    tags: JSON.stringify(input.tags ?? []),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return workspaceId;
}

export function archiveCourse(courseId: string) {
  const db = getDb();
  db.prepare(`UPDATE courses SET archived = 1, updated_at = ? WHERE id = ?`).run(nowIso(), courseId);
}

export function restoreCourse(courseId: string) {
  const db = getDb();
  db.prepare(`UPDATE courses SET archived = 0, updated_at = ? WHERE id = ?`).run(nowIso(), courseId);
}

export function deleteCourse(courseId: string) {
  const db = getDb();
  db.prepare(`DELETE FROM courses WHERE id = ?`).run(courseId);
}

export function archiveWorkspace(workspaceId: string) {
  const db = getDb();
  db.prepare(`UPDATE workspaces SET status = 'archived', updated_at = ? WHERE id = ?`).run(
    nowIso(),
    workspaceId,
  );
}

export function restoreWorkspace(workspaceId: string) {
  const db = getDb();
  db.prepare(`UPDATE workspaces SET status = 'active', updated_at = ? WHERE id = ?`).run(
    nowIso(),
    workspaceId,
  );
}

export function deleteWorkspace(workspaceId: string) {
  const db = getDb();
  db.prepare(`DELETE FROM workspaces WHERE id = ?`).run(workspaceId);
}

export function upsertProviderProfile(input: ProviderProfileInput) {
  const db = getDb();
  const parsed = providerProfileSchema.parse(input);
  const profileId = parsed.id ?? id("provider");
  const timestamp = nowIso();

  if (parsed.isActive) {
    db.prepare(`UPDATE provider_profiles SET is_active = 0`).run();
  }

  const existing = db
    .prepare(`SELECT id FROM provider_profiles WHERE id = ?`)
    .get(profileId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      `
      UPDATE provider_profiles
      SET
        name = @name,
        provider_type = @providerType,
        base_url = @baseUrl,
        model_name = @modelName,
        embedding_model = @embeddingModel,
        temperature = @temperature,
        max_output_tokens = @maxOutputTokens,
        chunk_size = @chunkSize,
        retrieval_count = @retrievalCount,
        grading_strictness = @gradingStrictness,
        is_active = @isActive,
        updated_at = @updatedAt
      WHERE id = @id
    `,
    ).run({
      id: profileId,
      name: parsed.name,
      providerType: parsed.providerType,
      baseUrl: parsed.baseUrl,
      modelName: parsed.modelName,
      embeddingModel: parsed.embeddingModel,
      temperature: parsed.temperature,
      maxOutputTokens: parsed.maxOutputTokens,
      chunkSize: parsed.chunkSize,
      retrievalCount: parsed.retrievalCount,
      gradingStrictness: parsed.gradingStrictness,
      isActive: parsed.isActive ? 1 : 0,
      updatedAt: timestamp,
    });
  } else {
    db.prepare(
      `
      INSERT INTO provider_profiles (
        id, name, provider_type, base_url, model_name, embedding_model,
        temperature, max_output_tokens, chunk_size, retrieval_count,
        grading_strictness, is_active, created_at, updated_at
      ) VALUES (
        @id, @name, @providerType, @baseUrl, @modelName, @embeddingModel,
        @temperature, @maxOutputTokens, @chunkSize, @retrievalCount,
        @gradingStrictness, @isActive, @createdAt, @updatedAt
      )
    `,
    ).run({
      id: profileId,
      name: parsed.name,
      providerType: parsed.providerType,
      baseUrl: parsed.baseUrl,
      modelName: parsed.modelName,
      embeddingModel: parsed.embeddingModel,
      temperature: parsed.temperature,
      maxOutputTokens: parsed.maxOutputTokens,
      chunkSize: parsed.chunkSize,
      retrievalCount: parsed.retrievalCount,
      gradingStrictness: parsed.gradingStrictness,
      isActive: parsed.isActive ? 1 : 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return profileId;
}

export function listProviderProfiles() {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM provider_profiles ORDER BY is_active DESC, updated_at DESC`)
    .all() as ProviderProfileRecord[];

  return rows.map(mapProfile);
}

export function getActiveProviderProfile() {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM provider_profiles WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1`)
    .get() as ProviderProfileRecord | undefined;

  return row ? { ...mapProfile(row), id: row.id } : null;
}

export function setActiveProvider(profileId: string) {
  const db = getDb();
  db.prepare(`UPDATE provider_profiles SET is_active = 0`).run();
  db.prepare(`UPDATE provider_profiles SET is_active = 1, updated_at = ? WHERE id = ?`).run(
    nowIso(),
    profileId,
  );
}

export function insertDocument(input: {
  workspaceId: string;
  title: string;
  sourceType: string;
  kind: string;
  mimeType: string;
  originalName: string;
  storagePath: string;
  extractedText: string;
  stats?: Record<string, unknown>;
}) {
  const db = getDb();
  const documentId = id("doc");
  const timestamp = nowIso();

  db.prepare(
    `
    INSERT INTO documents (
      id, workspace_id, title, source_type, kind, mime_type, original_name,
      storage_path, extracted_text, stats_json, created_at, updated_at
    ) VALUES (
      @id, @workspaceId, @title, @sourceType, @kind, @mimeType, @originalName,
      @storagePath, @extractedText, @stats, @createdAt, @updatedAt
    )
  `,
  ).run({
    id: documentId,
    workspaceId: input.workspaceId,
    title: input.title,
    sourceType: input.sourceType,
    kind: input.kind,
    mimeType: input.mimeType,
    originalName: input.originalName,
    storagePath: input.storagePath,
    extractedText: input.extractedText,
    stats: JSON.stringify(input.stats ?? {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  touchWorkspace(input.workspaceId);
  return documentId;
}

export function insertCourseContextDocument(input: {
  courseId: string;
  title: string;
  sourceType: string;
  kind: string;
  mimeType: string;
  originalName: string;
  storagePath: string;
  extractedText: string;
  stats?: Record<string, unknown>;
}) {
  const db = getDb();
  const documentId = id("course_doc");
  const timestamp = nowIso();

  db.prepare(
    `
    INSERT INTO course_context_documents (
      id, course_id, title, source_type, kind, mime_type, original_name,
      storage_path, extracted_text, stats_json, created_at, updated_at
    ) VALUES (
      @id, @courseId, @title, @sourceType, @kind, @mimeType, @originalName,
      @storagePath, @extractedText, @stats, @createdAt, @updatedAt
    )
  `,
  ).run({
    id: documentId,
    courseId: input.courseId,
    title: input.title,
    sourceType: input.sourceType,
    kind: input.kind,
    mimeType: input.mimeType,
    originalName: input.originalName,
    storagePath: input.storagePath,
    extractedText: input.extractedText,
    stats: JSON.stringify(input.stats ?? {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const courseWorkspaces = getDb()
    .prepare(`SELECT id FROM workspaces WHERE course_id = ?`)
    .all(input.courseId) as Array<{ id: string }>;
  courseWorkspaces.forEach((workspace) => touchWorkspace(workspace.id));

  return documentId;
}

export function insertChunks(
  workspaceId: string,
  documentId: string,
  chunks: Array<{
    id?: string;
    text: string;
    pageLabel?: string;
    sectionPath?: string;
    tokenEstimate: number;
    embedding?: number[];
    metadata?: Record<string, unknown>;
  }>,
) {
  const db = getDb();
  const insert = db.prepare(
    `
    INSERT INTO source_chunks (
      id, workspace_id, document_id, chunk_index, text, page_label, section_path,
      token_estimate, embedding_json, metadata_json, created_at
    ) VALUES (
      @id, @workspaceId, @documentId, @chunkIndex, @text, @pageLabel, @sectionPath,
      @tokenEstimate, @embedding, @metadata, @createdAt
    )
  `,
  );

  const timestamp = nowIso();
  const transaction = db.transaction(() => {
    chunks.forEach((chunk, index) => {
      insert.run({
        id: chunk.id ?? id("chunk"),
        workspaceId,
        documentId,
        chunkIndex: index,
        text: chunk.text,
        pageLabel: chunk.pageLabel ?? "",
        sectionPath: chunk.sectionPath ?? "",
        tokenEstimate: chunk.tokenEstimate,
        embedding: chunk.embedding ? JSON.stringify(chunk.embedding) : null,
        metadata: JSON.stringify(chunk.metadata ?? {}),
        createdAt: timestamp,
      });
    });
  });

  transaction();
}

export function insertCourseContextChunks(
  courseId: string,
  documentId: string,
  chunks: Array<{
    id?: string;
    text: string;
    pageLabel?: string;
    sectionPath?: string;
    tokenEstimate: number;
    embedding?: number[];
    metadata?: Record<string, unknown>;
  }>,
) {
  const db = getDb();
  const insert = db.prepare(
    `
    INSERT INTO course_context_chunks (
      id, course_id, document_id, chunk_index, text, page_label, section_path,
      token_estimate, embedding_json, metadata_json, created_at
    ) VALUES (
      @id, @courseId, @documentId, @chunkIndex, @text, @pageLabel, @sectionPath,
      @tokenEstimate, @embedding, @metadata, @createdAt
    )
  `,
  );

  const timestamp = nowIso();
  const transaction = db.transaction(() => {
    chunks.forEach((chunk, index) => {
      insert.run({
        id: chunk.id ?? id("course_chunk"),
        courseId,
        documentId,
        chunkIndex: index,
        text: chunk.text,
        pageLabel: chunk.pageLabel ?? "",
        sectionPath: chunk.sectionPath ?? "",
        tokenEstimate: chunk.tokenEstimate,
        embedding: chunk.embedding ? JSON.stringify(chunk.embedding) : null,
        metadata: JSON.stringify(chunk.metadata ?? {}),
        createdAt: timestamp,
      });
    });
  });

  transaction();
}

export function replaceWorkspaceContent(
  workspaceId: string,
  content: {
    conciseSummary: string;
    detailedSummary: string;
    topics: TopicInput[];
    flashcards: FlashcardInput[];
    questions: QuestionInput[];
  },
) {
  const db = getDb();
  const timestamp = nowIso();
  const transaction = db.transaction(() => {
    db.prepare(`DELETE FROM flashcards WHERE workspace_id = ? AND locked = 0`).run(workspaceId);
    db.prepare(`DELETE FROM questions WHERE workspace_id = ? AND locked = 0`).run(workspaceId);
    db.prepare(`DELETE FROM topics WHERE workspace_id = ?`).run(workspaceId);

    db.prepare(
      `
      UPDATE workspaces
      SET concise_summary = ?, detailed_summary = ?, updated_at = ?
      WHERE id = ?
    `,
    ).run(content.conciseSummary, content.detailedSummary, timestamp, workspaceId);

    const topicInsert = db.prepare(
      `
      INSERT INTO topics (
        id, workspace_id, parent_id, title, slug, summary, detailed_summary,
        key_points_json, common_mistakes_json, formulas_json, source_refs_json,
        created_at, updated_at
      ) VALUES (
        @id, @workspaceId, NULL, @title, @slug, @summary, @detailedSummary,
        @keyPoints, @commonMistakes, @formulas, @sourceRefs, @createdAt, @updatedAt
      )
    `,
    );
    const flashcardInsert = db.prepare(
      `
      INSERT INTO flashcards (
        id, workspace_id, topic_id, front, back, source_refs_json, locked, created_at, updated_at
      ) VALUES (
        @id, @workspaceId, @topicId, @front, @back, @sourceRefs, 0, @createdAt, @updatedAt
      )
    `,
    );
    const questionInsert = db.prepare(
      `
      INSERT INTO questions (
        id, workspace_id, topic_id, type, topic_title, subtopic, difficulty, question_text,
        options_json, correct_answer, grading_rubric_json, explanation, source_refs_json,
        confidence_score, estimated_time_seconds, locked, feedback_summary_json, created_at, updated_at
      ) VALUES (
        @id, @workspaceId, @topicId, @type, @topicTitle, @subtopic, @difficulty, @questionText,
        @options, @correctAnswer, @gradingRubric, @explanation, @sourceRefs,
        @confidenceScore, @estimatedTimeSeconds, 0, '{}', @createdAt, @updatedAt
      )
    `,
    );

    const topicIdsByTitle = new Map<string, string>();

    content.topics.forEach((topic) => {
      const topicId = topic.id ?? id("topic");
      topicIdsByTitle.set(topic.title.toLowerCase(), topicId);

      topicInsert.run({
        id: topicId,
        workspaceId,
        title: topic.title,
        slug: slugify(topic.title),
        summary: topic.summary,
        detailedSummary: topic.detailedSummary,
        keyPoints: JSON.stringify(topic.keyPoints),
        commonMistakes: JSON.stringify(topic.commonMistakes),
        formulas: JSON.stringify(topic.formulas),
        sourceRefs: JSON.stringify(topic.sourceRefs),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    });

    content.flashcards.forEach((flashcard) => {
      flashcardInsert.run({
        id: flashcard.id ?? id("flash"),
        workspaceId,
        topicId: topicIdsByTitle.get(flashcard.topic.toLowerCase()) ?? null,
        front: flashcard.front,
        back: flashcard.back,
        sourceRefs: JSON.stringify(flashcard.sourceRefs),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    });

    content.questions.forEach((question) => {
      questionInsert.run({
        id: question.id ?? id("question"),
        workspaceId,
        topicId: topicIdsByTitle.get(question.topic.toLowerCase()) ?? null,
        type: question.type,
        topicTitle: question.topic,
        subtopic: question.subtopic,
        difficulty: question.difficulty,
        questionText: question.questionText,
        options: JSON.stringify(question.options),
        correctAnswer: question.correctAnswer,
        gradingRubric: JSON.stringify(question.gradingRubric),
        explanation: question.explanation,
        sourceRefs: JSON.stringify(question.sourceRefs),
        confidenceScore: question.confidenceScore,
        estimatedTimeSeconds: question.estimatedTimeSeconds,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    });
  });

  transaction();
}

export function createStudySession(input: {
  workspaceId: string;
  mode: string;
  questionIds: string[];
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  const sessionId = id("session");
  db.prepare(
    `
    INSERT INTO study_sessions (
      id, workspace_id, mode, status, question_ids_json, started_at, metadata_json
    ) VALUES (
      @id, @workspaceId, @mode, 'active', @questionIds, @startedAt, @metadata
    )
  `,
  ).run({
    id: sessionId,
    workspaceId: input.workspaceId,
    mode: input.mode,
    questionIds: JSON.stringify(input.questionIds),
    startedAt: nowIso(),
    metadata: JSON.stringify(input.metadata ?? {}),
  });
  return sessionId;
}

export function getSession(sessionId: string) {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM study_sessions WHERE id = ?`)
    .get(sessionId) as
    | {
        id: string;
        workspace_id: string;
        mode: string;
        status: string;
        question_ids_json: string;
        started_at: string;
        finished_at: string | null;
        score: number | null;
        metadata_json: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  const questionIds = safeJsonParse<string[]>(row.question_ids_json, []);
  const questions = questionIds
    .map((questionId) => getQuestionById(questionId))
    .filter((question): question is QuestionSummary => Boolean(question));
  const responses = getSessionResponses(sessionId);

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    mode: row.mode,
    status: row.status,
    questionIds,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    score: row.score ?? 0,
    metadata: safeJsonParse<Record<string, unknown>>(row.metadata_json, {}),
    questions,
    responses,
  };
}

export function getQuestionById(questionId: string) {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM questions WHERE id = ?`)
    .get(questionId) as
    | {
        id: string;
        topic_id: string | null;
        topic_title: string;
        subtopic: string;
        type: string;
        difficulty: string;
        question_text: string;
        options_json: string;
        correct_answer: string;
        grading_rubric_json: string;
        explanation: string;
        source_refs_json: string;
        confidence_score: number;
        estimated_time_seconds: number;
        locked: number;
        feedback_summary_json: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    topicId: row.topic_id,
    topicTitle: row.topic_title,
    subtopic: row.subtopic,
    type: row.type,
    difficulty: row.difficulty,
    questionText: row.question_text,
    options: safeJsonParse<string[]>(row.options_json, []),
    correctAnswer: row.correct_answer,
    gradingRubric: safeJsonParse<string[]>(row.grading_rubric_json, []),
    explanation: row.explanation,
    sourceRefs: safeJsonParse<Array<Record<string, string>>>(row.source_refs_json, []),
    confidenceScore: row.confidence_score,
    estimatedTimeSeconds: row.estimated_time_seconds,
    locked: Boolean(row.locked),
    feedbackSummary: safeJsonParse<Record<string, unknown>>(row.feedback_summary_json, {}),
  };
}

export function storeResponse(input: {
  sessionId: string;
  questionId: string;
  workspaceId: string;
  answerText: string;
  confidence: number;
  timeSeconds: number;
  grading: GradingResult;
}) {
  const db = getDb();
  const timestamp = nowIso();
  const responseId = id("response");

  db.prepare(
    `
    INSERT INTO responses (
      id, session_id, question_id, answer_text, is_correct, score, confidence,
      time_seconds, grading_feedback_json, created_at
    ) VALUES (
      @id, @sessionId, @questionId, @answerText, @isCorrect, @score, @confidence,
      @timeSeconds, @gradingFeedback, @createdAt
    )
  `,
  ).run({
    id: responseId,
    sessionId: input.sessionId,
    questionId: input.questionId,
    answerText: input.answerText,
    isCorrect: input.grading.score >= 0.7 ? 1 : 0,
    score: input.grading.score,
    confidence: input.confidence,
    timeSeconds: input.timeSeconds,
    gradingFeedback: JSON.stringify(input.grading),
    createdAt: timestamp,
  });

  const priority = Math.max(0.15, 1 - input.grading.score + input.confidence * 0.15);
  db.prepare(
    `
    INSERT INTO review_queue (
      id, workspace_id, question_id, priority, reason, due_at, status, created_at, updated_at
    ) VALUES (
      @id, @workspaceId, @questionId, @priority, @reason, @dueAt, 'due', @createdAt, @updatedAt
    )
  `,
  ).run({
    id: id("review"),
    workspaceId: input.workspaceId,
    questionId: input.questionId,
    priority,
    reason: input.grading.score >= 0.75 ? "confidence review" : "incorrect or incomplete",
    dueAt: addDays(new Date(), input.grading.score >= 0.75 ? 3 : 1).toISOString(),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  touchWorkspace(input.workspaceId);
  return responseId;
}

export function finishSession(sessionId: string) {
  const db = getDb();
  const responses = getSessionResponses(sessionId);
  const averageScore =
    responses.length > 0
      ? responses.reduce((total, response) => total + response.score, 0) / responses.length
      : 0;

  db.prepare(
    `
    UPDATE study_sessions
    SET status = 'completed', finished_at = ?, score = ?
    WHERE id = ?
  `,
  ).run(nowIso(), averageScore, sessionId);

  return averageScore;
}

export function getSessionResponses(sessionId: string): ResponseSummary[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT *
      FROM responses
      WHERE session_id = ?
      ORDER BY created_at ASC
    `,
    )
    .all(sessionId) as Array<{
    id: string;
    question_id: string;
    answer_text: string;
    is_correct: number;
    score: number;
    confidence: number;
    time_seconds: number;
    grading_feedback_json: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    questionId: row.question_id,
    answerText: row.answer_text,
    isCorrect: Boolean(row.is_correct),
    score: row.score,
    confidence: row.confidence,
    timeSeconds: row.time_seconds,
    gradingFeedback: safeJsonParse<GradingResult>(
      row.grading_feedback_json,
      {
        score: row.score,
        correctness: row.score,
        completeness: row.score,
        clarity: row.score,
        verdict: row.score >= 0.7 ? "correct" : row.score >= 0.4 ? "partial" : "incorrect",
        missingPoints: [],
        strengths: [],
        conciseFeedback: "",
        improvedAnswer: "",
      },
    ),
    createdAt: row.created_at,
  }));
}

export function getMistakes(workspaceId: string) {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        review.id,
        review.priority,
        review.reason,
        review.due_at,
        q.id AS question_id,
        q.question_text,
        q.topic_title,
        q.type,
        q.difficulty,
        r.score,
        r.answer_text,
        r.grading_feedback_json
      FROM review_queue review
      INNER JOIN questions q ON q.id = review.question_id
      LEFT JOIN responses r ON r.question_id = q.id
      WHERE review.workspace_id = ?
      ORDER BY review.priority DESC, review.updated_at DESC
    `,
    )
    .all(workspaceId) as Array<{
    id: string;
    priority: number;
    reason: string;
    due_at: string;
    question_id: string;
    question_text: string;
    topic_title: string;
    type: string;
    difficulty: string;
    score: number | null;
    answer_text: string | null;
    grading_feedback_json: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    priority: row.priority,
    reason: row.reason,
    dueAt: row.due_at,
    questionId: row.question_id,
    questionText: row.question_text,
    topicTitle: row.topic_title,
    type: row.type,
    difficulty: row.difficulty,
    score: row.score ?? 0,
    answerText: row.answer_text ?? "",
    gradingFeedback: safeJsonParse<Record<string, unknown>>(row.grading_feedback_json, {}),
  }));
}

export function getWorkspaceAnalytics(workspaceId: string) {
  const db = getDb();
  const topicRows = db
    .prepare(
      `
      SELECT
        q.topic_title,
        COUNT(r.id) AS total,
        AVG(COALESCE(r.score, 0)) AS accuracy,
        AVG(COALESCE(r.time_seconds, 0)) AS avg_time
      FROM questions q
      LEFT JOIN responses r ON r.question_id = q.id
      WHERE q.workspace_id = ?
      GROUP BY q.topic_title
      ORDER BY accuracy ASC
    `,
    )
    .all(workspaceId) as Array<{
    topic_title: string;
    total: number;
    accuracy: number | null;
    avg_time: number | null;
  }>;

  const overview = db
    .prepare(
      `
      SELECT
        COUNT(DISTINCT q.id) AS question_count,
        COUNT(DISTINCT s.id) AS session_count,
        COUNT(DISTINCT r.id) AS response_count,
        AVG(COALESCE(r.score, 0)) AS average_score,
        AVG(COALESCE(r.time_seconds, 0)) AS average_time
      FROM workspaces w
      LEFT JOIN questions q ON q.workspace_id = w.id
      LEFT JOIN study_sessions s ON s.workspace_id = w.id
      LEFT JOIN responses r ON r.question_id = q.id
      WHERE w.id = ?
    `,
    )
    .get(workspaceId) as {
    question_count: number;
    session_count: number;
    response_count: number;
    average_score: number | null;
    average_time: number | null;
  };

  return {
    questionCount: overview?.question_count ?? 0,
    sessionCount: overview?.session_count ?? 0,
    responseCount: overview?.response_count ?? 0,
    averageScore: overview?.average_score ?? 0,
    averageTimeSeconds: overview?.average_time ?? 0,
    topicBreakdown: topicRows.map((row) => ({
      topic: row.topic_title,
      total: row.total,
      accuracy: row.accuracy ?? 0,
      averageTimeSeconds: row.avg_time ?? 0,
    })),
  };
}

export function searchChunks(workspaceId: string, query: string, limit = 5) {
  const db = getDb();
  const tokenMatches = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const courseId = getCourseIdForWorkspace(workspaceId);

  const workspaceRows = db
    .prepare(
      `
      SELECT sc.id, sc.document_id, sc.text, sc.page_label, sc.section_path, sc.embedding_json, d.title AS document_title
      FROM source_chunks sc
      INNER JOIN documents d ON d.id = sc.document_id
      WHERE sc.workspace_id = ?
      ORDER BY sc.chunk_index ASC
    `,
    )
    .all(workspaceId) as Array<{
    id: string;
    document_id: string;
    text: string;
    page_label: string;
    section_path: string;
    document_title: string;
    embedding_json: string | null;
  }>;

  const courseRows = courseId
    ? (db
        .prepare(
          `
          SELECT cc.id, cc.document_id, cc.text, cc.page_label, cc.section_path, cc.embedding_json, d.title AS document_title
          FROM course_context_chunks cc
          INNER JOIN course_context_documents d ON d.id = cc.document_id
          WHERE cc.course_id = ?
          ORDER BY cc.chunk_index ASC
        `,
        )
        .all(courseId) as Array<{
        id: string;
        document_id: string;
        text: string;
        page_label: string;
        section_path: string;
        document_title: string;
        embedding_json: string | null;
      }>)
    : [];

  return [...workspaceRows, ...courseRows]
    .map((row) => {
      const haystack = row.text.toLowerCase();
      const score = tokenMatches.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
      return {
        id: row.id,
        documentId: row.document_id,
        documentTitle: row.document_title,
        text: row.text,
        pageLabel: row.page_label,
        sectionPath: row.section_path,
        embedding: safeJsonParse<number[]>(row.embedding_json, []),
        score,
      };
    })
    .filter((row) => row.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function getAllDocumentsForWorkspace(workspaceId: string) {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT *
      FROM documents
      WHERE workspace_id = ?
      ORDER BY created_at ASC
    `,
    )
    .all(workspaceId) as Array<{
    id: string;
    title: string;
    source_type: string;
    kind: string;
    mime_type: string;
    original_name: string;
    storage_path: string;
    extracted_text: string;
    stats_json: string;
    created_at: string;
    updated_at: string;
  }>;
}

export function getAllChunksForWorkspace(workspaceId: string) {
  const db = getDb();
  const courseId = getCourseIdForWorkspace(workspaceId);
  const workspaceRows = db
    .prepare(
      `
      SELECT sc.*, d.title AS document_title
      FROM source_chunks sc
      INNER JOIN documents d ON d.id = sc.document_id
      WHERE sc.workspace_id = ?
      ORDER BY d.created_at ASC, sc.chunk_index ASC
    `,
    )
    .all(workspaceId) as Array<{
    id: string;
    document_id: string;
    chunk_index: number;
    text: string;
    page_label: string;
    section_path: string;
    token_estimate: number;
    embedding_json: string | null;
    metadata_json: string;
    document_title: string;
  }>;

  const courseRows = courseId
    ? (db
        .prepare(
          `
          SELECT
            cc.id,
            cc.document_id,
            cc.chunk_index,
            cc.text,
            cc.page_label,
            cc.section_path,
            cc.token_estimate,
            cc.embedding_json,
            cc.metadata_json,
            d.title AS document_title
          FROM course_context_chunks cc
          INNER JOIN course_context_documents d ON d.id = cc.document_id
          WHERE cc.course_id = ?
          ORDER BY d.created_at ASC, cc.chunk_index ASC
        `,
        )
        .all(courseId) as Array<{
        id: string;
        document_id: string;
        chunk_index: number;
        text: string;
        page_label: string;
        section_path: string;
        token_estimate: number;
        embedding_json: string | null;
        metadata_json: string;
        document_title: string;
      }>)
    : [];

  return [...workspaceRows, ...courseRows];
}

export function touchWorkspace(workspaceId: string) {
  const db = getDb();
  db.prepare(`UPDATE workspaces SET updated_at = ? WHERE id = ?`).run(nowIso(), workspaceId);
}
