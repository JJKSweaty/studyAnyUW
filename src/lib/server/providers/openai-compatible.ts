import { gradingSchema } from "@/lib/schemas";

import type {
  LocalLLMProvider,
  LocalProviderProfile,
  ProviderModel,
} from "./types";

type EndpointFlavor = "responses" | "chat";

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }

  return (await response.json()) as T;
}

function safeParseModelList(payload: unknown): ProviderModel[] {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return [];
  }

  const data = (payload as { data?: unknown[] }).data ?? [];
  return data
    .filter((item): item is { id: string; owned_by?: string } => {
      return Boolean(item && typeof item === "object" && "id" in item);
    })
    .map((item) => ({
      id: item.id,
      ownedBy: item.owned_by,
    }));
}

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  if ("output_text" in payload && typeof payload.output_text === "string") {
    return payload.output_text;
  }

  if ("choices" in payload && Array.isArray(payload.choices)) {
    const choice = payload.choices[0] as
      | { message?: { content?: string }; text?: string }
      | undefined;
    return choice?.message?.content ?? choice?.text ?? "";
  }

  return "";
}

function parseJsonFromText(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const arrayStart = candidate.indexOf("[");
  const offset =
    start === -1 ? arrayStart : arrayStart === -1 ? start : Math.min(start, arrayStart);
  const sliced = offset === -1 ? candidate : candidate.slice(offset);
  return JSON.parse(sliced);
}

async function generateTextWithFallback(
  profile: LocalProviderProfile,
  flavor: EndpointFlavor,
  input: {
    prompt: string;
    system?: string;
    temperature?: number;
    maxOutputTokens?: number;
  },
) {
  const baseUrl = normalizeBaseUrl(profile.baseUrl);

  if (flavor === "responses") {
    const payload = await requestJson<unknown>(`${baseUrl}/responses`, {
      method: "POST",
      body: JSON.stringify({
        model: profile.modelName,
        temperature: input.temperature ?? profile.temperature,
        max_output_tokens: input.maxOutputTokens ?? profile.maxOutputTokens,
        input: [
          input.system
            ? {
                role: "system",
                content: [{ type: "input_text", text: input.system }],
              }
            : null,
          {
            role: "user",
            content: [{ type: "input_text", text: input.prompt }],
          },
        ].filter(Boolean),
      }),
    });

    return extractOutputText(payload);
  }

  const payload = await requestJson<unknown>(`${baseUrl}/chat/completions`, {
    method: "POST",
    body: JSON.stringify({
      model: profile.modelName,
      temperature: input.temperature ?? profile.temperature,
      max_tokens: input.maxOutputTokens ?? profile.maxOutputTokens,
      messages: [
        input.system ? { role: "system", content: input.system } : null,
        { role: "user", content: input.prompt },
      ].filter(Boolean),
    }),
  });

  return extractOutputText(payload);
}

async function generateImageDescriptionWithChat(
  profile: LocalProviderProfile,
  input: {
    prompt: string;
    imageDataUrl: string;
  },
) {
  const payload = await requestJson<unknown>(`${normalizeBaseUrl(profile.baseUrl)}/chat/completions`, {
    method: "POST",
    body: JSON.stringify({
      model: profile.modelName,
      temperature: 0.1,
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: input.prompt },
            { type: "image_url", image_url: { url: input.imageDataUrl } },
          ],
        },
      ],
    }),
  });

  return extractOutputText(payload);
}

export function createOpenAICompatibleProvider(
  type: "ollama" | "lmstudio",
  preferredFlavor: EndpointFlavor,
): LocalLLMProvider {
  const flavors: EndpointFlavor[] =
    preferredFlavor === "responses" ? ["responses", "chat"] : ["chat", "responses"];

  return {
    type,
    async listModels(profile) {
      const payload = await requestJson<unknown>(`${normalizeBaseUrl(profile.baseUrl)}/models`);
      return safeParseModelList(payload);
    },
    async healthCheck(profile) {
      try {
        const models = await this.listModels(profile);
        const hasSelectedModel = models.some((model) => model.id === profile.modelName);

        if (models.length === 0) {
          return {
            ok: false,
            message: "Connected, but no models were returned.",
          };
        }

        if (!hasSelectedModel) {
          return {
            ok: false,
            message: `Connected, but the configured model "${profile.modelName}" is not installed. Available model(s): ${models
              .map((model) => model.id)
              .join(", ")}.`,
          };
        }

        return {
          ok: true,
          message: `Connected. ${models.length} model(s) available. Using "${profile.modelName}".`,
        };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : "Provider not reachable.",
        };
      }
    },
    async generateText(profile, input) {
      let lastError: unknown;

      for (const flavor of flavors) {
        try {
          const responseText = await generateTextWithFallback(profile, flavor, input);
          if (responseText.trim()) {
            return responseText.trim();
          }
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error("The local provider did not return a text response.");
    },
    async generateStructuredJSON(profile, options) {
      let lastError: unknown;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const prompt =
            attempt === 0
              ? `${options.prompt}\n\nReturn JSON only. No markdown fences.`
              : `Repair the following output so it becomes valid JSON for ${options.schemaName}.\n\n${options.prompt}`;

          const text = await this.generateText(profile, {
            prompt,
            temperature: attempt === 0 ? profile.temperature : 0,
            maxOutputTokens: profile.maxOutputTokens,
          });

          const parsed = parseJsonFromText(text);
          return options.validator(parsed);
        } catch (error) {
          lastError = error;
        }
      }

      if (options.fallback) {
        return options.fallback();
      }

      throw lastError instanceof Error ? lastError : new Error("Structured generation failed.");
    },
    async embedText(profile, texts) {
      if (!profile.embeddingModel) {
        return [];
      }

      const payload = await requestJson<{
        data?: Array<{ embedding?: number[] }>;
      }>(`${normalizeBaseUrl(profile.baseUrl)}/embeddings`, {
        method: "POST",
        body: JSON.stringify({
          model: profile.embeddingModel,
          input: texts,
        }),
      });

      return (payload.data ?? []).map((item) => item.embedding ?? []);
    },
    async streamChat() {
      return null;
    },
    async gradeAnswer(profile, prompt, validate) {
      try {
        return await this.generateStructuredJSON(profile, {
          prompt,
          schemaName: "grading_result",
          validator: (payload) => validate(payload),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Grading failed. Check the provider configuration.";

        return validate({
          ...gradingSchema.parse({
            score: 0,
            correctness: 0,
            completeness: 0,
            clarity: 0,
            verdict: "incorrect",
            conciseFeedback: message,
            improvedAnswer: "No model answer available because grading could not run.",
          }),
        });
      }
    },
    async generateImageDescription(profile, input) {
      const description = await generateImageDescriptionWithChat(profile, input);
      if (!description.trim()) {
        throw new Error("The provider did not return an image description.");
      }
      return description.trim();
    },
  };
}
