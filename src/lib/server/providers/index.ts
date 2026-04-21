import { ollamaProvider } from "./ollama";
import { lmStudioProvider } from "./lmstudio";
import type { LocalLLMProvider, LocalProviderProfile } from "./types";

const providers: Record<LocalProviderProfile["providerType"], LocalLLMProvider> = {
  ollama: ollamaProvider,
  lmstudio: lmStudioProvider,
};

export function getProvider(type: LocalProviderProfile["providerType"]) {
  return providers[type];
}
