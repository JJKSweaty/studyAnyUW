import { createOpenAICompatibleProvider } from "./openai-compatible";

export const ollamaProvider = createOpenAICompatibleProvider("ollama", "responses");
