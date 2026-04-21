import type { GradingResult, ProviderProfileInput } from "@/lib/schemas";

export type LocalProviderProfile = ProviderProfileInput & { id: string };

export type ProviderModel = {
  id: string;
  ownedBy?: string;
};

export type StructuredGenerationOptions<T> = {
  prompt: string;
  schemaName: string;
  validator: (payload: unknown) => T;
  fallback?: () => T;
};

export type LocalLLMProvider = {
  type: "ollama" | "lmstudio";
  listModels: (profile: LocalProviderProfile) => Promise<ProviderModel[]>;
  healthCheck: (profile: LocalProviderProfile) => Promise<{ ok: boolean; message: string }>;
  generateText: (
    profile: LocalProviderProfile,
    input: {
      prompt: string;
      system?: string;
      temperature?: number;
      maxOutputTokens?: number;
    },
  ) => Promise<string>;
  generateStructuredJSON: <T>(
    profile: LocalProviderProfile,
    options: StructuredGenerationOptions<T>,
  ) => Promise<T>;
  embedText: (profile: LocalProviderProfile, texts: string[]) => Promise<number[][]>;
  streamChat: (
    profile: LocalProviderProfile,
    input: {
      messages: { role: "system" | "user" | "assistant"; content: string }[];
      temperature?: number;
      maxOutputTokens?: number;
    },
  ) => Promise<ReadableStream<Uint8Array> | null>;
  gradeAnswer: (
    profile: LocalProviderProfile,
    prompt: string,
    validate: (payload: unknown) => GradingResult,
  ) => Promise<GradingResult>;
  generateImageDescription: (
    profile: LocalProviderProfile,
    input: {
      prompt: string;
      imageDataUrl: string;
    },
  ) => Promise<string>;
};
