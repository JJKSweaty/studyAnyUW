import { listProviderProfiles, upsertProviderProfile } from "./repository";

export function ensureDefaultProviderProfiles() {
  const existing = listProviderProfiles();
  if (existing.length > 0) {
    return existing;
  }

  upsertProviderProfile({
    name: "Ollama Local",
    providerType: "ollama",
    baseUrl: "http://127.0.0.1:11434/v1",
    modelName: "gpt-oss:20b",
    embeddingModel: "",
    temperature: 0.2,
    maxOutputTokens: 1400,
    chunkSize: 900,
    retrievalCount: 5,
    gradingStrictness: "balanced",
    isActive: true,
  });

  upsertProviderProfile({
    name: "LM Studio Local",
    providerType: "lmstudio",
    baseUrl: "http://127.0.0.1:1234/v1",
    modelName: "local-model",
    embeddingModel: "",
    temperature: 0.2,
    maxOutputTokens: 1400,
    chunkSize: 900,
    retrievalCount: 5,
    gradingStrictness: "balanced",
    isActive: false,
  });

  return listProviderProfiles();
}
