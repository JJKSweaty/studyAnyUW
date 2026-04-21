import Database from "better-sqlite3";

import { getDatabasePath } from "./storage";

let database: Database.Database | null = null;

function createDatabase() {
  const db = new Database(getDatabasePath());
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS local_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      concise_summary TEXT NOT NULL DEFAULT '',
      detailed_summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      source_type TEXT NOT NULL,
      kind TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      original_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      extracted_text TEXT NOT NULL,
      stats_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS source_chunks (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      page_label TEXT NOT NULL DEFAULT '',
      section_path TEXT NOT NULL DEFAULT '',
      token_estimate INTEGER NOT NULL DEFAULT 0,
      embedding_json TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      summary TEXT NOT NULL,
      detailed_summary TEXT NOT NULL DEFAULT '',
      key_points_json TEXT NOT NULL DEFAULT '[]',
      common_mistakes_json TEXT NOT NULL DEFAULT '[]',
      formulas_json TEXT NOT NULL DEFAULT '[]',
      source_refs_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      source_refs_json TEXT NOT NULL DEFAULT '[]',
      locked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      topic_title TEXT NOT NULL,
      subtopic TEXT NOT NULL DEFAULT '',
      difficulty TEXT NOT NULL,
      question_text TEXT NOT NULL,
      options_json TEXT NOT NULL DEFAULT '[]',
      correct_answer TEXT NOT NULL,
      grading_rubric_json TEXT NOT NULL DEFAULT '[]',
      explanation TEXT NOT NULL,
      source_refs_json TEXT NOT NULL DEFAULT '[]',
      confidence_score REAL NOT NULL DEFAULT 0.65,
      estimated_time_seconds INTEGER NOT NULL DEFAULT 60,
      locked INTEGER NOT NULL DEFAULT 0,
      feedback_summary_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      status TEXT NOT NULL,
      question_ids_json TEXT NOT NULL DEFAULT '[]',
      started_at TEXT NOT NULL,
      finished_at TEXT,
      score REAL,
      metadata_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      answer_text TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      score REAL NOT NULL DEFAULT 0,
      confidence REAL NOT NULL DEFAULT 0,
      time_seconds INTEGER NOT NULL DEFAULT 0,
      grading_feedback_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS review_queue (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      priority REAL NOT NULL DEFAULT 0.5,
      reason TEXT NOT NULL,
      due_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'due',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS provider_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider_type TEXT NOT NULL,
      base_url TEXT NOT NULL,
      model_name TEXT NOT NULL,
      embedding_model TEXT NOT NULL DEFAULT '',
      temperature REAL NOT NULL DEFAULT 0.2,
      max_output_tokens INTEGER NOT NULL DEFAULT 1400,
      chunk_size INTEGER NOT NULL DEFAULT 900,
      retrieval_count INTEGER NOT NULL DEFAULT 5,
      grading_strictness TEXT NOT NULL DEFAULT 'balanced',
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS generation_jobs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      input_json TEXT NOT NULL DEFAULT '{}',
      output_json TEXT NOT NULL DEFAULT '{}',
      error TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_snapshots (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      generated_at TEXT NOT NULL,
      metrics_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS course_context_documents (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      source_type TEXT NOT NULL,
      kind TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      original_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      extracted_text TEXT NOT NULL,
      stats_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS course_context_chunks (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      document_id TEXT NOT NULL REFERENCES course_context_documents(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      text TEXT NOT NULL,
      page_label TEXT NOT NULL DEFAULT '',
      section_path TEXT NOT NULL DEFAULT '',
      token_estimate INTEGER NOT NULL DEFAULT 0,
      embedding_json TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_workspaces_course_id ON workspaces(course_id);
    CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_workspace_id ON source_chunks(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_course_context_documents_course_id ON course_context_documents(course_id);
    CREATE INDEX IF NOT EXISTS idx_course_context_chunks_course_id ON course_context_chunks(course_id);
    CREATE INDEX IF NOT EXISTS idx_topics_workspace_id ON topics(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_questions_workspace_id ON questions(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_workspace_id ON study_sessions(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_responses_session_id ON responses(session_id);
    CREATE INDEX IF NOT EXISTS idx_review_queue_workspace_id ON review_queue(workspace_id);
  `);

  return db;
}

export function getDb() {
  if (!database) {
    database = createDatabase();
  }
  return database;
}
