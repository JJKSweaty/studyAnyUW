export type CourseRecord = {
  id: string;
  name: string;
  code: string;
  description: string;
  archived: number;
  created_at: string;
  updated_at: string;
};

export type WorkspaceRecord = {
  id: string;
  course_id: string;
  name: string;
  description: string;
  tags_json: string;
  status: string;
  concise_summary: string;
  detailed_summary: string;
  created_at: string;
  updated_at: string;
};

export type ProviderProfileRecord = {
  id: string;
  name: string;
  provider_type: "ollama" | "lmstudio";
  base_url: string;
  model_name: string;
  embedding_model: string;
  temperature: number;
  max_output_tokens: number;
  chunk_size: number;
  retrieval_count: number;
  grading_strictness: "lenient" | "balanced" | "strict";
  is_active: number;
  created_at: string;
  updated_at: string;
};
